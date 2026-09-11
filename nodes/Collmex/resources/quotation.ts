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

const RESOURCE = 'quotation';

/** QUOTATION_GET has 10 fields. */
const FIELD_COUNT = 10;

export const quotationDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'quotation', 'quotations'),
	{
		displayName: 'Quotation ID',
		name: 'quotationId',
		type: 'string',
		required: true,
		default: '',
		description: 'Number of the quotation to retrieve',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	groupPositionsProperty(RESOURCE),
	optionsProperty(RESOURCE, [
		companyIdOption,
		customerIdOption,
		onlyChangedOption,
		{
			displayName: 'Quotation Date From',
			name: 'quotationDateFrom',
			type: 'dateTime',
			default: '',
			description: 'Return only quotations dated on or after this date',
		},
		{
			displayName: 'Quotation Date To',
			name: 'quotationDateTo',
			type: 'dateTime',
			default: '',
			description: 'Return only quotations dated on or before this date',
		},
		systemNameOption,
	]),
];

export const quotationHandler: ResourceHandler = {
	resultType: 'CMXQTN',
	documentIdIndex: 1,

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('QUOTATION_GET', FIELD_COUNT);

		if (operation === 'get') {
			setField(row, 2, context.getNodeParameter('quotationId', itemIndex) as string);
		}

		setField(row, 3, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 4, options.customerId as string);
		setField(row, 5, toCollmexDate(options.quotationDateFrom as string));
		setField(row, 6, toCollmexDate(options.quotationDateTo as string));
		// Field 8 is the return format, left at CSV - see salesOrder.ts.
		setField(row, 9, options.onlyChanged as boolean);
		setField(row, 10, options.systemName as string);

		return row;
	},
};
