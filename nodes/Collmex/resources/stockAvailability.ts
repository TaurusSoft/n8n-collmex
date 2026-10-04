import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import type { ResourceHandler } from './shared';
import {
	companyIdOption,
	onlyChangedOption,
	operationsProperty,
	optionsProperty,
	paginationProperties,
	queryRow,
	resolveCompanyId,
	setField,
	systemNameOption,
} from './shared';

const RESOURCE = 'stockAvailability';

/** STOCK_AVAILABLE_GET has 5 fields. */
const FIELD_COUNT = 5;

export const stockAvailabilityDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'product availability', 'product availabilities'),
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		description: 'Product whose available stock should be retrieved',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	optionsProperty(RESOURCE, [companyIdOption, onlyChangedOption, systemNameOption]),
];

export const stockAvailabilityHandler: ResourceHandler = {
	resultType: 'STOCK_AVAILABLE',

	delta: {
		queryName: 'STOCK_AVAILABLE_GET',
		fieldCount: FIELD_COUNT,
		companyField: 2,
		onlyChangedField: 4,
		systemNameField: 5,
	},

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('STOCK_AVAILABLE_GET', FIELD_COUNT);

		setField(row, 2, await resolveCompanyId(context, itemIndex, options.companyId as number));

		if (operation === 'get') {
			setField(row, 3, context.getNodeParameter('productId', itemIndex) as string);
		}

		setField(row, 4, options.onlyChanged as boolean);
		setField(row, 5, options.systemName as string);

		return row;
	},
};
