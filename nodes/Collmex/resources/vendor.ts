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

const RESOURCE = 'vendor';

/** VENDOR_GET has 8 fields. */
const FIELD_COUNT = 8;

export const vendorDescription: INodeProperties[] = [
	operationsProperty(RESOURCE, 'vendor', 'vendors'),
	{
		displayName: 'Vendor ID',
		name: 'vendorId',
		type: 'string',
		required: true,
		default: '',
		description: 'Number of the vendor to retrieve',
		displayOptions: { show: { resource: [RESOURCE], operation: ['get'] } },
	},
	...paginationProperties(RESOURCE),
	optionsProperty(RESOURCE, [
		companyIdOption,
		dueForFollowUpOption,
		onlyChangedOption,
		searchTextOption,
		systemNameOption,
		zipOrCountryOption,
	]),
];

export const vendorHandler: ResourceHandler = {
	resultType: 'CMXLIF',

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const operation = context.getNodeParameter('operation', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('VENDOR_GET', FIELD_COUNT);

		if (operation === 'get') {
			setField(row, 2, context.getNodeParameter('vendorId', itemIndex) as string);
		}

		setField(row, 3, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 4, options.searchText as string);
		setField(row, 5, options.dueForFollowUp as boolean);
		setField(row, 6, options.zipOrCountry as string);
		setField(row, 7, options.onlyChanged as boolean);
		setField(row, 8, options.systemName as string);

		return row;
	},
};
