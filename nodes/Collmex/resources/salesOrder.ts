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

const RESOURCE = 'salesOrder';

/** SALES_ORDER_GET has 12 fields. */
const FIELD_COUNT = 12;

export const salesOrderDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'sales order', 'sales orders'),
	{
		displayName: 'Sales Order ID',
		name: 'salesOrderId',
		type: 'string',
		required: true,
		default: '',
		description: 'Number of the sales order to retrieve',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	groupPositionsProperty(RESOURCE),
	optionsProperty(RESOURCE, [
		companyIdOption,
		customerIdOption,
		{
			displayName: 'Customer Order Number',
			name: 'customerOrderNumber',
			type: 'string',
			default: '',
			description: "The customer's own order number",
		},
		onlyChangedOption,
		onlyCreatedBySystemOption,
		{
			displayName: 'Order Date From',
			name: 'orderDateFrom',
			type: 'dateTime',
			default: '',
			description: 'Return only orders placed on or after this date',
		},
		{
			displayName: 'Order Date To',
			name: 'orderDateTo',
			type: 'dateTime',
			default: '',
			description: 'Return only orders placed on or before this date',
		},
		systemNameOption,
	]),
];

export const salesOrderHandler: ResourceHandler = {
	resultType: 'CMXORD-2',
	documentIdIndex: 1,

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('SALES_ORDER_GET', FIELD_COUNT);

		if (operation === 'get') {
			setField(row, 2, context.getNodeParameter('salesOrderId', itemIndex) as string);
		}

		setField(row, 3, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 4, options.customerId as string);
		setField(row, 5, toCollmexDate(options.orderDateFrom as string));
		setField(row, 6, toCollmexDate(options.orderDateTo as string));
		setField(row, 7, options.customerOrderNumber as string);
		// Field 8 is the return format. It stays at CSV - the ZIP/PDF formats
		// would need binary handling and are out of scope for this node.
		setField(row, 9, options.onlyChanged as boolean);
		setField(row, 10, options.systemName as string);
		setField(row, 11, options.onlyCreatedBySystem as boolean);

		return row;
	},
};
