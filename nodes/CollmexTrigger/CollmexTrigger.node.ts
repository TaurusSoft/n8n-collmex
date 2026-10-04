import type {
	IDataObject,
	IHookFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { groupDocuments, mapRecord, recordLayouts } from '../Collmex/records';
import { resourceHandlers } from '../Collmex/resources';
import { buildDeltaQuery } from '../Collmex/resources/shared';
import { collmexRequest, extractRecords } from '../Collmex/transport/client';
import { eventOptions, findEvent } from './events';

/** Record type that configures a notification, and its field count. */
const NOTIFICATION_RECORD = 'API_NOTIFICATION';
const NOTIFICATION_FIELDS = 5;

/**
 * Field 5 of `API_NOTIFICATION`.
 *
 * The documentation calls `2` "Löschen", but a tenant checked on 2026-10-04
 * kept the notification and only ticked its "Inaktiv" box. It is still the
 * right value to send - it is the strongest the API offers, and an inactive
 * notification does not fire - but it stops notifications rather than
 * removing the entry, and the name says so.
 */
const ACTIVE = '0';
const DEACTIVATE = '2';

/** Collmex caps the system name at 20 characters. */
const SYSTEM_NAME_MAX = 20;

/**
 * Builds one `API_NOTIFICATION` row.
 *
 * Collmex identifies a notification by system name and event, so sending the
 * same pair again overwrites it rather than adding a second one. That is what
 * makes registering idempotent, which matters because the API offers no way to
 * read the notifications back.
 */
function notificationRow(
	systemName: string,
	eventId: number,
	url: string,
	state: string,
): string[] {
	const row = new Array<string>(NOTIFICATION_FIELDS).fill('');

	row[0] = NOTIFICATION_RECORD;
	row[1] = systemName;
	row[2] = String(eventId);
	row[3] = url;
	row[4] = state;

	return row;
}

/** Reads and checks the parameters both the hooks and the webhook need. */
async function readSettings(
	context: IHookFunctions | IWebhookFunctions,
): Promise<{ systemName: string; events: number[]; companyId: number }> {
	const systemName = (context.getNodeParameter('systemName') as string).trim();
	const events = context.getNodeParameter('events') as number[];
	const options = context.getNodeParameter('options', {}) as IDataObject;

	if (systemName === '') {
		throw new NodeOperationError(context.getNode(), 'System Name is required', {
			description:
				'Collmex stores the notification and the position in the change log under this name.',
		});
	}

	if (systemName.length > SYSTEM_NAME_MAX) {
		throw new NodeOperationError(
			context.getNode(),
			`System Name must be at most ${SYSTEM_NAME_MAX} characters, got ${systemName.length}`,
			{ description: 'Collmex truncates longer names, which would split the change log.' },
		);
	}

	if (events.length === 0) {
		throw new NodeOperationError(context.getNode(), 'At least one event must be selected', {
			description: 'Without an event Collmex has nothing to notify about.',
		});
	}

	const credentials = await context.getCredentials('collmexApi');
	const companyId = (options.companyId as number) ?? (credentials.companyId as number) ?? 1;

	return { systemName, events, companyId };
}

export class CollmexTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Collmex Trigger',
		name: 'collmexTrigger',
		icon: { light: 'file:collmex.svg', dark: 'file:collmex.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["systemName"]}}',
		description: 'Starts a workflow when Collmex reports that data changed',
		defaults: {
			name: 'Collmex Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'collmexApi', required: true }],
		webhooks: [
			{
				name: 'default',
				// Collmex calls the registered URL with a bare GET and no payload.
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Collmex sends a notification at most once a minute, and it carries no data - this node answers it by asking Collmex what changed. Activate the workflow to register the notification.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'System Name',
				name: 'systemName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'n8n-invoices',
				description:
					'Name this trigger registers itself under, at most 20 characters. Collmex remembers the position in the change log per system name and query, so each record is delivered once. Give every trigger its own name, and do not reuse the name of a Collmex node that queries the same resource with Only Changed - whichever runs first would consume the changes and the other would see nothing.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description:
					'Which changes Collmex should report. A notification does not say which event raised it, so this node queries every selected event on each one - selecting more events means more API calls per notification.',
				options: eventOptions,
			},
			{
				displayName: 'Group Positions',
				name: 'groupPositions',
				type: 'boolean',
				default: true,
				description:
					'Whether to merge the rows of a document into one item with a "positions" array. Collmex returns one row per line item, repeating the header data on each of them.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Company ID',
						name: 'companyId',
						type: 'number',
						default: 1,
						description:
							'Internal number of the company, as shown under Administration > Company. Overrides the default set in the credentials.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			/**
			 * Always reports the notification as missing, so n8n goes on to call
			 * `create`.
			 *
			 * The Collmex API can set a notification but offers no record type to
			 * read one back - they are only visible in the web interface under
			 * Administration > Data. Re-creating is harmless because Collmex keys a
			 * notification by system name and event, so `create` overwrites rather
			 * than duplicates.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const { systemName, events } = await readSettings(this);
				const url = this.getNodeWebhookUrl('default');

				if (url === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						'n8n did not provide a webhook URL for this trigger',
					);
				}

				// One record per event, all in a single exchange: Collmex asks for
				// the number of calls to be kept down, and this way the whole
				// registration either applies or does not.
				await collmexRequest.call(
					this,
					events.map((eventId) => notificationRow(systemName, eventId, url, ACTIVE)),
				);

				return true;
			},

			/**
			 * Stops the notifications when the workflow is deactivated.
			 *
			 * Collmex keeps the entry and only marks it inactive, so a trigger
			 * that has been activated once leaves a row behind under
			 * Administration > Data. It does not fire, and activating again sets
			 * it back to active, so the lifecycle still closes - but the entry has
			 * to be cleared by hand if it is not wanted, since the API offers no
			 * way to read or remove one.
			 */
			async delete(this: IHookFunctions): Promise<boolean> {
				const { systemName, events } = await readSettings(this);
				const url = this.getNodeWebhookUrl('default') ?? '';

				await collmexRequest.call(
					this,
					events.map((eventId) => notificationRow(systemName, eventId, url, DEACTIVATE)),
				);

				return true;
			},
		},
	};

	/**
	 * Answers a notification by fetching what changed.
	 *
	 * Collmex sends a bare GET with no payload and no indication of which event
	 * raised it - every event registered under this trigger points at the same
	 * n8n URL. So all selected events are queried, and the queries go out in one
	 * exchange: that is a single API call per notification instead of one per
	 * event, which matters against the 10,000 calls a day Collmex allows.
	 *
	 * The response carries the record types of all of them, and no two resources
	 * share a result type, so each query's records can be picked out again.
	 */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const { systemName, events, companyId } = await readSettings(this);
		const groupPositions = this.getNodeParameter('groupPositions', true) as boolean;

		// Keyed by resource so an event listing several resources, and two events
		// listing the same one, still produce one query each.
		const queried = new Map<string, number>();

		for (const eventId of events) {
			for (const resource of findEvent(eventId)?.resources ?? []) {
				if (resourceHandlers[resource]?.delta === undefined) continue;
				if (!queried.has(resource)) queried.set(resource, eventId);
			}
		}

		if (queried.size === 0) return {};

		const rows = await collmexRequest.call(
			this,
			[...queried.keys()].map((resource) =>
				buildDeltaQuery(
					// Checked above; narrowing across the Map does not survive.
					resourceHandlers[resource].delta as NonNullable<typeof resourceHandlers.customer.delta>,
					companyId,
					systemName,
				),
			),
		);

		const items: INodeExecutionData[] = [];

		for (const [resource, eventId] of queried) {
			const handler = resourceHandlers[resource];
			const layout = recordLayouts[handler.resultType];
			const dataRows = extractRecords(rows, handler.resultType);

			const records =
				handler.documentIdIndex !== undefined && groupPositions
					? groupDocuments(layout, dataRows, handler.documentIdIndex)
					: dataRows.map((row) => mapRecord(layout, row));

			for (const record of records) {
				// The event and resource are prefixed so a workflow handling more
				// than one event can route on them. Collmex has no field of either
				// name, so nothing of the record is shadowed.
				items.push({ json: { collmexEvent: eventId, collmexResource: resource, ...record } });
			}
		}

		// Nothing changed - acknowledge the notification but leave the workflow
		// alone. Collmex resets its unacknowledged counter on the query above, so
		// the notification has served its purpose either way.
		if (items.length === 0) return {};

		return { workflowData: [items] };
	}
}
