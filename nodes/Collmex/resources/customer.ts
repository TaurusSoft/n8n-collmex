import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import type { ResourceHandler } from './shared';
import {
	companyIdOption,
	dueForFollowUpOption,
	onlyChangedOption,
	operationsProperty,
	optionsProperty,
	paginationProperties,
	queryRow,
	resolveCompanyId,
	searchTextOption,
	setField,
	systemNameOption,
	zipOrCountryOption,
} from './shared';

const RESOURCE = 'customer';

/** CUSTOMER_GET has 13 fields. */
const FIELD_COUNT = 13;

export const customerDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'customer', 'customers'),
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'Number of the customer to retrieve',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	optionsProperty(RESOURCE, [
		{
			displayName: 'Address Group',
			name: 'addressGroup',
			type: 'string',
			default: '',
			description: 'Internal number of the address group to filter by',
		},
		{
			displayName: 'Broker',
			name: 'broker',
			type: 'string',
			default: '',
			description: 'Employee number of the broker to filter by',
		},
		companyIdOption,
		{
			displayName: 'Discount Group',
			name: 'discountGroup',
			type: 'string',
			default: '',
			description: 'Internal number of the discount group to filter by',
		},
		dueForFollowUpOption,
		{
			displayName: 'Include Inactive',
			name: 'includeInactive',
			type: 'boolean',
			default: false,
			description: 'Whether to include inactive customers as well as active ones',
		},
		onlyChangedOption,
		{
			displayName: 'Price Group',
			name: 'priceGroup',
			type: 'string',
			default: '',
			description: 'Internal number of the price group to filter by',
		},
		searchTextOption,
		systemNameOption,
		zipOrCountryOption,
	]),
];

export const customerHandler: ResourceHandler = {
	resultType: 'CMXKND',

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('CUSTOMER_GET', FIELD_COUNT);

		if (operation === 'get') {
			setField(row, 2, context.getNodeParameter('customerId', itemIndex) as string);
		}

		setField(row, 3, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 4, options.searchText as string);
		setField(row, 5, options.dueForFollowUp as boolean);
		setField(row, 6, options.zipOrCountry as string);
		setField(row, 7, options.addressGroup as string);
		setField(row, 8, options.priceGroup as string);
		setField(row, 9, options.discountGroup as string);
		setField(row, 10, options.broker as string);
		setField(row, 11, options.onlyChanged as boolean);
		setField(row, 12, options.systemName as string);
		setField(row, 13, options.includeInactive as boolean);

		return row;
	},
};
