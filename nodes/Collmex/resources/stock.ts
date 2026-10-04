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
	toCollmexDate,
} from './shared';

const RESOURCE = 'stock';

/** STOCK_GET has 9 fields. */
const FIELD_COUNT = 9;

/**
 * Field number of the stock type. Addressed on its own because `0` is a real
 * selection here, which `setField` cannot express.
 */
const STOCK_TYPE_FIELD = 6;

export const stockDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'stock level', 'stock levels'),
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Product whose stock should be retrieved. Collmex keeps one record per stock type and batch, so a single product may return several records.',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	optionsProperty(RESOURCE, [
		{
			displayName: 'As Of Date',
			name: 'asOfDate',
			type: 'dateTime',
			default: '',
			description:
				'Return the stock as it stood at the start of this date instead of the current stock. Movements booked on the date itself are not counted, so passing today returns nothing for stock that was only booked today.',
		},
		companyIdOption,
		onlyChangedOption,
		{
			displayName: 'Product Group',
			name: 'productGroup',
			type: 'string',
			default: '',
			description:
				'Internal number of the product group, as shown under Product > Product Group. A number that does not exist makes Collmex reject the whole query rather than return nothing.',
		},
		searchTextOption,
		{
			displayName: 'Stock Type',
			name: 'stockType',
			type: 'options',
			default: 0,
			description: 'Which kind of stock to return',
			options: [
				{ name: 'Free', value: 0 },
				{ name: 'Blocked', value: 1 },
				{ name: 'FBA', value: 2 },
			],
		},
		systemNameOption,
	]),
];

export const stockHandler: ResourceHandler = {
	resultType: 'CMXSTK',

	delta: {
		queryName: 'STOCK_GET',
		fieldCount: FIELD_COUNT,
		companyField: 2,
		onlyChangedField: 7,
		systemNameField: 8,
	},

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('STOCK_GET', FIELD_COUNT);

		setField(row, 2, await resolveCompanyId(context, itemIndex, options.companyId as number));

		if (operation === 'get') {
			setField(row, 3, context.getNodeParameter('productId', itemIndex) as string);
		}

		setField(row, 4, options.productGroup as string);
		setField(row, 5, options.searchText as string);

		// Leaving the stock type blank returns every type, while `0` restricts
		// the result to free stock - so an opted-in `0` has to survive, which
		// `setField` would discard along with the unset case.
		if (options.stockType !== undefined) {
			row[STOCK_TYPE_FIELD - 1] = String(options.stockType);
		}

		setField(row, 7, options.onlyChanged as boolean);
		setField(row, 8, options.systemName as string);
		setField(row, 9, toCollmexDate(options.asOfDate as string));

		return row;
	},
};
