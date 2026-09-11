import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import type { ResourceHandler } from './shared';
import {
	companyIdOption,
	customerIdOption,
	groupPositionsProperty,
	onlyChangedOption,
	operationsProperty,
	optionsProperty,
	paginationProperties,
	queryRow,
	resolveCompanyId,
	setField,
	systemNameOption,
	toCollmexDate,
} from './shared';

const RESOURCE = 'delivery';

/** DELIVERY_GET has 14 fields. */
const FIELD_COUNT = 14;

export const deliveryDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'delivery', 'deliveries'),
	{
		displayName: 'Delivery ID',
		name: 'deliveryId',
		type: 'string',
		required: true,
		default: '',
		description: 'Number of the delivery to retrieve',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	groupPositionsProperty(RESOURCE),
	optionsProperty(RESOURCE, [
		companyIdOption,
		customerIdOption,
		{
			displayName: 'Delivery Date From',
			name: 'deliveryDateFrom',
			type: 'dateTime',
			default: '',
			description: 'Return only deliveries dated on or after this date',
		},
		{
			displayName: 'Delivery Date To',
			name: 'deliveryDateTo',
			type: 'dateTime',
			default: '',
			description: 'Return only deliveries dated on or before this date',
		},
		onlyChangedOption,
		{
			displayName: 'Only Already Output',
			name: 'onlyAlreadyOutput',
			type: 'boolean',
			default: false,
			description:
				'Whether to return only deliveries that have already been printed or sent since they were created or last changed',
		},
		{
			displayName: 'Sales Order ID',
			name: 'salesOrderId',
			type: 'string',
			default: '',
			description: 'Return only deliveries belonging to this sales order',
		},
		{
			displayName: 'Shipping Type',
			name: 'shippingType',
			type: 'string',
			default: '',
			description: 'Internal number of the shipping type to filter by',
		},
		systemNameOption,
	]),
];

export const deliveryHandler: ResourceHandler = {
	resultType: 'CMXDLV',
	documentIdIndex: 1,

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('DELIVERY_GET', FIELD_COUNT);

		if (operation === 'get') {
			setField(row, 2, context.getNodeParameter('deliveryId', itemIndex) as string);
		}

		setField(row, 3, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 4, options.customerId as string);
		setField(row, 5, toCollmexDate(options.deliveryDateFrom as string));
		setField(row, 6, toCollmexDate(options.deliveryDateTo as string));
		setField(row, 7, options.onlyAlreadyOutput as boolean);
		// Field 8 is the return format, left at CSV - see salesOrder.ts.
		setField(row, 9, options.onlyChanged as boolean);
		setField(row, 10, options.systemName as string);
		setField(row, 12, options.salesOrderId as string);
		setField(row, 13, options.shippingType as string);
		// Field 14 ('mark as output') is deliberately not exposed: it writes
		// back to Collmex, and this node is read-only.

		return row;
	},
};
