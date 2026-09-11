import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

/**
 * A resource's query record type plus how to build one query row for it.
 */
export interface ResourceHandler {
	/** Record type Collmex answers with, e.g. `CMXKND`. */
	resultType: string;
	/**
	 * Zero-based column holding the document number. Set only for the
	 * document record types, which spread one document over several rows.
	 */
	documentIdIndex?: number;
	buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]>;
}

/** Creates an empty query row of the right length with the record type set. */
export function queryRow(recordType: string, fieldCount: number): string[] {
	const row = new Array<string>(fieldCount).fill('');
	row[0] = recordType;

	return row;
}

/**
 * Writes a value into a query row addressed by its 1-based field number, the
 * way the Collmex documentation numbers fields.
 *
 * Empty values and `false` are skipped so unset options stay blank, and
 * `true` becomes the `1` that Collmex expects for flags.
 */
export function setField(
	row: string[],
	fieldNumber: number,
	value: string | number | boolean | undefined,
): void {
	if (value === undefined || value === '' || value === false) return;

	row[fieldNumber - 1] = value === true ? '1' : String(value);
}

/** n8n date pickers yield ISO strings; Collmex wants `JJJJMMTT`. */
export function toCollmexDate(value: string | undefined): string | undefined {
	if (value === undefined || value === '') return undefined;

	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

	return match ? `${match[1]}${match[2]}${match[3]}` : value;
}

/**
 * Resolves the company to query: the per-operation override if set,
 * otherwise the default from the credentials.
 */
export async function resolveCompanyId(
	context: IExecuteFunctions,
	itemIndex: number,
	override: number | undefined,
): Promise<number> {
	if (override !== undefined) return override;

	const credentials = await context.getCredentials('collmexApi');

	return (credentials.companyId as number) ?? 1;
}

export function operationsProperty(
	resource: string,
	singular: string,
	plural: string,
): INodeProperties {
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: `Get a ${singular}`,
				description: `Get a single ${singular} by its number`,
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: `Get many ${plural}`,
				description: `Get many ${plural}`,
			},
		],
		default: 'getAll',
	};
}

/**
 * Collmex has no server-side paging - every query returns the complete
 * result set - so the limit is applied after the fact. The description says
 * so, to stop anyone expecting a small limit to save bandwidth.
 */
export function paginationProperties(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show: { resource: [resource], operation: ['getAll'] } },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			description: 'Max number of results to return',
			displayOptions: {
				show: { resource: [resource], operation: ['getAll'], returnAll: [false] },
			},
		},
	];
}

/** Only for the document resources, which return one row per line item. */
export function groupPositionsProperty(resource: string): INodeProperties {
	return {
		displayName: 'Group Positions',
		name: 'groupPositions',
		type: 'boolean',
		default: true,
		description:
			'Whether to merge the rows of a document into one item with a "positions" array. Collmex returns one row per line item, repeating the header data on each of them.',
		displayOptions: { show: { resource: [resource] } },
	};
}

export function optionsProperty(
	resource: string,
	options: INodeProperties[],
): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { resource: [resource] } },
		options,
	};
}

// Reusable entries for the Options collections. They need no displayOptions
// of their own - the surrounding collection carries them.

export const companyIdOption: INodeProperties = {
	displayName: 'Company ID',
	name: 'companyId',
	type: 'number',
	default: 1,
	description:
		'Internal number of the company, as shown under Administration > Company. Overrides the default set in the credentials.',
};

export const customerIdOption: INodeProperties = {
	displayName: 'Customer ID',
	name: 'customerId',
	type: 'string',
	default: '',
	description: 'Return only records belonging to this customer number',
};

export const onlyChangedOption: INodeProperties = {
	displayName: 'Only Changed',
	name: 'onlyChanged',
	type: 'boolean',
	default: false,
	description:
		'Whether to return only records created or changed since the previous query made under the same system name. Requires System Name to be set.',
};

export const systemNameOption: INodeProperties = {
	displayName: 'System Name',
	name: 'systemName',
	type: 'string',
	default: '',
	description:
		'Name of the external system. Collmex stores the timestamp of the last query under this name, which is what Only Changed compares against.',
};

export const onlyCreatedBySystemOption: INodeProperties = {
	displayName: 'Only Created by System',
	name: 'onlyCreatedBySystem',
	type: 'boolean',
	default: false,
	description:
		'Whether to return only records that were created by the system named in System Name',
};

export const searchTextOption: INodeProperties = {
	displayName: 'Search Text',
	name: 'searchText',
	type: 'string',
	default: '',
	description: 'Free text search across the record',
};

export const zipOrCountryOption: INodeProperties = {
	displayName: 'ZIP or Country',
	name: 'zipOrCountry',
	type: 'string',
	default: '',
	description: 'Search by postal code or country code',
};

export const dueForFollowUpOption: INodeProperties = {
	displayName: 'Due for Follow-Up',
	name: 'dueForFollowUp',
	type: 'boolean',
	default: false,
	description: 'Whether to return only records that are due for follow-up',
};
