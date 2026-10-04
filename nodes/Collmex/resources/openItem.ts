import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import type { ResourceHandler } from './shared';
import {
	brokerOption,
	companyIdOption,
	customerIdOption,
	operationsProperty,
	optionsProperty,
	paginationProperties,
	queryRow,
	resolveCompanyId,
	setField,
	toCollmexDate,
	vendorIdOption,
} from './shared';

const RESOURCE = 'openItem';

/** OPEN_ITEMS_GET has 7 fields. */
const FIELD_COUNT = 7;

export const openItemDescription: INodeProperties[] = [
	// No single Get: an open item is identified by fiscal year, document number
	// and position, and the query takes none of them.
	operationsProperty(RESOURCE, undefined, 'open items'),
	{
		displayName: 'Side',
		name: 'side',
		type: 'options',
		default: '0',
		description: 'Whether to return what customers owe or what is owed to vendors',
		// Kept as text so the customer side, which Collmex codes as `0`, is sent
		// rather than dropped as an empty value.
		options: [
			{ name: 'Receivable (Customer)', value: '0' },
			{ name: 'Payable (Vendor)', value: '1' },
		],
		displayOptions: { show: { resource: [RESOURCE] } },
	},
	...paginationProperties(RESOURCE),
	optionsProperty(RESOURCE, [
		{
			displayName: 'As Of Date',
			name: 'asOfDate',
			type: 'dateTime',
			default: '',
			description: 'Return the open items as they stood on this date',
		},
		brokerOption('Employee who brokered the business, to filter by'),
		companyIdOption,
		customerIdOption,
		vendorIdOption,
	]),
];

export const openItemHandler: ResourceHandler = {
	resultType: 'OPEN_ITEM',

	// OPEN_ITEMS_GET has no Only Changed or System Name field, so this resource
	// cannot be queried incrementally and the trigger cannot serve it.

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('OPEN_ITEMS_GET', FIELD_COUNT);

		setField(row, 2, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 3, context.getNodeParameter('side', itemIndex) as string);
		setField(row, 4, options.customerId as string);
		setField(row, 5, options.vendorId as string);
		setField(row, 6, options.broker as string);
		setField(row, 7, toCollmexDate(options.asOfDate as string));

		return row;
	},
};
