import type {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	IWebhookFunctions,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { CollmexTrigger } from '../nodes/CollmexTrigger/CollmexTrigger.node';
import { collmexEvents } from '../nodes/CollmexTrigger/events';
import type { CollmexCredentials } from '../nodes/Collmex/transport/auth';
import { applyCollmexAuth } from '../nodes/Collmex/transport/auth';
import { parseCsv } from '../nodes/Collmex/transport/csv';
import { customerGetResponse, invoiceGetResponse, vendorGetResponse } from './fixtures';

const WEBHOOK_URL = 'https://n8n.example.com/webhook/abc';

interface Harness {
	context: IHookFunctions & IWebhookFunctions;
	/** The records sent to Collmex, excluding the LOGIN line. */
	sentRecords: () => string[][];
	/** How many separate exchanges were made. */
	requestCount: () => number;
}

function harness(parameters: IDataObject, response: string): Harness {
	let body = '';
	let requests = 0;

	const credentials: CollmexCredentials = {
		customerId: '123456',
		username: 'apiuser',
		password: 'secret',
		companyId: 1,
	};

	const context = {
		getNode: () => ({ name: 'Collmex Trigger', type: 'collmexTrigger', typeVersion: 1 }),
		getCredentials: async () => credentials,
		getNodeWebhookUrl: () => WEBHOOK_URL,
		getNodeParameter(name: string, fallback?: unknown) {
			if (name in parameters) return parameters[name];
			if (fallback !== undefined) return fallback;

			throw new Error(`test harness: unexpected parameter "${name}"`);
		},
		helpers: {
			async httpRequestWithAuthentication(_credentialsType: string, request: IHttpRequestOptions) {
				requests++;
				const authenticated = applyCollmexAuth(credentials, request);
				body = (authenticated.body as Buffer).toString('utf8');

				const buffer = Buffer.from(response, 'latin1');

				return {
					statusCode: 200,
					headers: { 'content-type': 'text/csv; charset=ISO-8859-1' },
					body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
				};
			},
		},
	} as unknown as IHookFunctions & IWebhookFunctions;

	return {
		context,
		sentRecords: () => parseCsv(body).slice(1),
		requestCount: () => requests,
	};
}

/** An empty answer: a success message and nothing else. */
const noChanges = [
	'MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.',
	'',
].join('\r\n');

const node = new CollmexTrigger();

describe('events', () => {
	it('offers only events a query can serve', () => {
		// A notification is nothing but a prompt to query. An event with no
		// resource behind it would wake the workflow with nothing to hand it.
		for (const event of collmexEvents) {
			expect(event.resources.length, `event ${event.id}`).toBeGreaterThan(0);
		}
	});

	it('leaves out the booking event, which has no resource yet', () => {
		expect(collmexEvents.map((event) => event.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
	});
});

describe('registration', () => {
	const settings = { systemName: 'n8n-test', events: [5, 9], options: {} };

	it('reports the notification as missing so n8n creates it', async () => {
		// Collmex cannot read a notification back, and re-creating overwrites.
		const { context } = harness(settings, noChanges);

		expect(await node.webhookMethods.default.checkExists.call(context)).toBe(false);
	});

	it('registers one notification per event in a single exchange', async () => {
		const { context, sentRecords, requestCount } = harness(settings, noChanges);

		expect(await node.webhookMethods.default.create.call(context)).toBe(true);
		expect(requestCount()).toBe(1);
		expect(sentRecords()).toEqual([
			['API_NOTIFICATION', 'n8n-test', '5', WEBHOOK_URL, '0'],
			['API_NOTIFICATION', 'n8n-test', '9', WEBHOOK_URL, '0'],
		]);
	});

	it('deletes with state 2 rather than deactivating', async () => {
		const { context, sentRecords } = harness(settings, noChanges);

		expect(await node.webhookMethods.default.delete.call(context)).toBe(true);
		expect(sentRecords().map((record) => record[4])).toEqual(['2', '2']);
	});

	it.each([
		[
			'an empty system name',
			{ systemName: '  ', events: [5], options: {} },
			'System Name is required',
		],
		[
			'a system name over 20 characters',
			{ systemName: 'x'.repeat(21), events: [5], options: {} },
			'at most 20 characters',
		],
		['no events', { systemName: 'n8n', events: [], options: {} }, 'At least one event'],
	])('refuses %s', async (_label, parameters, message) => {
		const { context } = harness(parameters, noChanges);

		await expect(node.webhookMethods.default.create.call(context)).rejects.toThrow(message);
	});
});

describe('notification handling', () => {
	async function notify(parameters: IDataObject, response: string) {
		const { context, sentRecords, requestCount } = harness(parameters, response);
		const result = await node.webhook.call(context);

		return { result, sent: sentRecords(), requests: requestCount() };
	}

	it('queries every selected event in one exchange', async () => {
		// A notification does not say which event raised it - all registered
		// events point at the same n8n URL - so all of them are asked at once.
		const { sent, requests } = await notify(
			{ systemName: 'n8n-test', events: [5, 9], options: {}, groupPositions: true },
			noChanges,
		);

		expect(requests).toBe(1);
		// Event 9 covers customers and vendors, so three queries for two events.
		expect(sent.map((record) => record[0])).toEqual(['INVOICE_GET', 'CUSTOMER_GET', 'VENDOR_GET']);
		for (const record of sent) {
			expect(record).toContain('n8n-test');
		}
	});

	it('asks a resource once even when two events name it', async () => {
		const { sent } = await notify(
			{ systemName: 'n8n-test', events: [7, 7], options: {}, groupPositions: true },
			noChanges,
		);

		expect(sent.map((record) => record[0])).toEqual(['STOCK_GET']);
	});

	it('does not start the workflow when nothing changed', async () => {
		// The query still ran, which is what resets Collmex's unacknowledged
		// counter, so the notification has done its job either way.
		const { result, requests } = await notify(
			{ systemName: 'n8n-test', events: [5], options: {}, groupPositions: true },
			noChanges,
		);

		expect(requests).toBe(1);
		expect(result).toEqual({});
	});

	it('tags each item with the event and resource that produced it', async () => {
		const { result } = await notify(
			{ systemName: 'n8n-test', events: [9], options: {}, groupPositions: true },
			customerGetResponse,
		);

		const items = result.workflowData?.[0] as INodeExecutionData[];
		expect(items).toHaveLength(2);
		expect(items[0].json.collmexEvent).toBe(9);
		expect(items[0].json.collmexResource).toBe('customer');
		expect(items[0].json.customerId).toBe(9999);
	});

	it('groups the line items of a document', async () => {
		const { result } = await notify(
			{ systemName: 'n8n-test', events: [5], options: {}, groupPositions: true },
			invoiceGetResponse,
		);

		const items = result.workflowData?.[0] as INodeExecutionData[];
		expect(items).toHaveLength(1);
		expect(items[0].json.positions).toHaveLength(2);
	});

	it('splits a batched answer by record type', async () => {
		// CONSTRUCTED: one exchange carrying the answers of two queries, which is
		// what Collmex returns for a batched request. No two resources share a
		// result type, which is what makes the split possible.
		const combined = [
			...parseCsv(customerGetResponse)
				.filter((record) => record[0] === 'CMXKND')
				.map((record) => record.join(';')),
			...parseCsv(vendorGetResponse)
				.filter((record) => record[0] === 'CMXLIF')
				.map((record) => record.join(';')),
			'MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 2 Datensätze verarbeitet.',
			'',
		].join('\r\n');

		const { result } = await notify(
			{ systemName: 'n8n-test', events: [9], options: {}, groupPositions: true },
			combined,
		);

		const items = result.workflowData?.[0] as INodeExecutionData[];
		expect(items.map((item) => item.json.collmexResource)).toEqual([
			'customer',
			'customer',
			'vendor',
		]);
	});

	it('honours a company override from the options', async () => {
		const { sent } = await notify(
			{
				systemName: 'n8n-test',
				events: [5],
				options: { companyId: 4 },
				groupPositions: true,
			},
			noChanges,
		);

		// INVOICE_GET keeps the company on field 3.
		expect(sent[0][2]).toBe('4');
	});
});
