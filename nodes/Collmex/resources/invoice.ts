import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import type { ResourceHandler } from './shared';
import {
	companyIdOption,
	customerIdOption,
	groupPositionsProperty,
	onlyChangedOption,
	onlyCreatedBySystemOption,
	operationsProperty,
	optionsProperty,
	paginationProperties,
	queryRow,
	resolveCompanyId,
	setField,
	systemNameOption,
	toCollmexDate,
} from './shared';

const RESOURCE = 'invoice';

/** INVOICE_GET has 15 fields. */
const FIELD_COUNT = 15;

export const invoiceDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'invoice', 'invoices'),
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		description: 'Number of the invoice to retrieve',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	groupPositionsProperty(RESOURCE),
	optionsProperty(RESOURCE, [
		companyIdOption,
		customerIdOption,
		{
			displayName: 'Invoice Date From',
			name: 'invoiceDateFrom',
			type: 'dateTime',
			default: '',
			description: 'Return only invoices dated on or after this date',
		},
		{
			displayName: 'Invoice Date To',
			name: 'invoiceDateTo',
			type: 'dateTime',
			default: '',
			description: 'Return only invoices dated on or before this date',
		},
		onlyChangedOption,
		onlyCreatedBySystemOption,
		{
			displayName: 'Only Already Output',
			name: 'onlyAlreadyOutput',
			type: 'boolean',
			default: false,
			description:
				'Whether to return only invoices that have already been printed or sent since they were created or last changed',
		},
		{
			displayName: 'Output Required',
			name: 'outputRequired',
			type: 'boolean',
			default: false,
			description:
				'Whether to return only invoices that have not been output yet, or were changed after their last output',
		},
		{
			displayName: 'Product ID',
			name: 'productId',
			type: 'string',
			default: '',
			description: 'Return only invoices containing this product in at least one line item',
		},
		{
			displayName: 'Sales Order ID',
			name: 'salesOrderId',
			type: 'string',
			default: '',
			description: 'Return only invoices belonging to this sales order',
		},
		systemNameOption,
	]),
];

export const invoiceHandler: ResourceHandler = {
	resultType: 'CMXINV',
	documentIdIndex: 1,

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('INVOICE_GET', FIELD_COUNT);

		if (operation === 'get') {
			setField(row, 2, context.getNodeParameter('invoiceId', itemIndex) as string);
		}

		setField(row, 3, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 4, options.customerId as string);
		setField(row, 5, toCollmexDate(options.invoiceDateFrom as string));
		setField(row, 6, toCollmexDate(options.invoiceDateTo as string));
		setField(row, 7, options.onlyAlreadyOutput as boolean);
		// Field 8 is the return format, left at CSV - see salesOrder.ts.
		setField(row, 9, options.onlyChanged as boolean);
		setField(row, 10, options.systemName as string);
		setField(row, 11, options.onlyCreatedBySystem as boolean);
		setField(row, 13, options.outputRequired as boolean);
		setField(row, 14, options.salesOrderId as string);
		setField(row, 15, options.productId as string);

		return row;
	},
};
