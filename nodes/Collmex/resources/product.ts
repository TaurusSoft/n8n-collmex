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
	searchTextOption,
	setField,
	systemNameOption,
} from './shared';

const RESOURCE = 'product';

/** PRODUCT_GET has 10 fields. */
const FIELD_COUNT = 10;

export const productDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'product', 'products'),
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		description: 'Number of the product to retrieve',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	optionsProperty(RESOURCE, [
		companyIdOption,
		onlyChangedOption,
		{
			displayName: 'Only With Price',
			name: 'onlyWithPrice',
			type: 'boolean',
			default: false,
			description: 'Whether to return only products that have a price',
		},
		{
			displayName: 'Price Group',
			name: 'priceGroup',
			type: 'string',
			default: '',
			description:
				'Internal number of the price group whose price should be returned. Without it Collmex returns the price of the standard group 0.',
		},
		{
			displayName: 'Product Group',
			name: 'productGroup',
			type: 'string',
			default: '',
			description:
				'Internal number of the product group. Returns products in that group or any of its subgroups.',
		},
		searchTextOption,
		systemNameOption,
		{
			displayName: 'Website ID',
			name: 'websiteId',
			type: 'string',
			default: '',
			description: 'Internal number of the web presence. Returns only products belonging to it.',
		},
	]),
];

export const productHandler: ResourceHandler = {
	resultType: 'CMXPRD',

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('PRODUCT_GET', FIELD_COUNT);

		// Unlike the other queries, PRODUCT_GET puts the company on field 2 and
		// the record's own id on field 3.
		setField(row, 2, await resolveCompanyId(context, itemIndex, options.companyId as number));

		if (operation === 'get') {
			setField(row, 3, context.getNodeParameter('productId', itemIndex) as string);
		}

		setField(row, 4, options.productGroup as string);
		setField(row, 5, options.priceGroup as string);
		setField(row, 6, options.onlyChanged as boolean);
		setField(row, 7, options.systemName as string);
		setField(row, 8, options.websiteId as string);
		setField(row, 9, options.onlyWithPrice as boolean);
		setField(row, 10, options.searchText as string);

		return row;
	},
};
