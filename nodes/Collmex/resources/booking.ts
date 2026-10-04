import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import type { ResourceHandler } from './shared';
import {
	companyIdOption,
	customerIdOption,
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
	vendorIdOption,
} from './shared';

const RESOURCE = 'booking';

/** ACCDOC_GET has 18 fields. */
const FIELD_COUNT = 18;

export const bookingDescription: INodeProperties[] = [
	// No single Get: a booking is identified by company, fiscal year and
	// posting number together, and even then the result is several position
	// rows, not one record.
	operationsProperty(RESOURCE, undefined, 'bookings'),
	...paginationProperties(RESOURCE),
	optionsProperty(RESOURCE, [
		{
			displayName: 'Account Number',
			name: 'accountNumber',
			type: 'string',
			default: '',
			description: 'Return only postings on this account',
		},
		{
			displayName: 'Asset ID',
			name: 'assetId',
			type: 'string',
			default: '',
			description: 'Return only postings belonging to this fixed asset number',
		},
		{
			displayName: 'Booking Number',
			name: 'bookingNumber',
			type: 'string',
			default: '',
			description: 'Number of the booking to return, within Fiscal Year',
		},
		companyIdOption,
		{
			displayName: 'Cost Center',
			name: 'costCenter',
			type: 'string',
			default: '',
			description: 'Return only postings on this cost center',
		},
		customerIdOption,
		{
			displayName: 'Date From',
			name: 'dateFrom',
			type: 'dateTime',
			default: '',
			description: 'Return only postings on or after this document date',
		},
		{
			displayName: 'Date To',
			name: 'dateTo',
			type: 'dateTime',
			default: '',
			description: 'Return only postings on or before this document date',
		},
		{
			displayName: 'Fiscal Year',
			name: 'fiscalYear',
			type: 'number',
			default: '',
			description: 'Return only postings of this fiscal year. Leave unset for every year.',
		},
		{
			displayName: 'Include Cancellations',
			name: 'includeCancellations',
			type: 'boolean',
			default: false,
			description: 'Whether to also return cancelled and cancelling postings',
		},
		{
			displayName: 'Invoice Number',
			name: 'invoiceNumber',
			type: 'string',
			default: '',
			description: 'Return only postings belonging to this invoice number',
		},
		onlyChangedOption,
		{
			displayName: 'Payment ID',
			name: 'paymentId',
			type: 'string',
			default: '',
			description: 'Return the booking belonging to this payment number',
		},
		searchTextOption,
		systemNameOption,
		{
			displayName: 'Trip ID',
			name: 'tripId',
			type: 'string',
			default: '',
			description: 'Return only postings belonging to this business trip number',
		},
		vendorIdOption,
	]),
];

export const bookingHandler: ResourceHandler = {
	resultType: 'ACCDOC',

	delta: {
		queryName: 'ACCDOC_GET',
		fieldCount: FIELD_COUNT,
		companyField: 2,
		onlyChangedField: 16,
		systemNameField: 17,
	},

	async buildQuery(context: IExecuteFunctions, itemIndex: number): Promise<string[]> {
		const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;

		const row = queryRow('ACCDOC_GET', FIELD_COUNT);

		setField(row, 2, await resolveCompanyId(context, itemIndex, options.companyId as number));
		setField(row, 3, options.fiscalYear as number);
		setField(row, 4, options.bookingNumber as string);
		setField(row, 5, options.accountNumber as string);
		setField(row, 6, options.costCenter as string);
		setField(row, 7, options.customerId as string);
		setField(row, 8, options.vendorId as string);
		setField(row, 9, options.assetId as string);
		setField(row, 10, options.invoiceNumber as string);
		setField(row, 11, options.tripId as string);
		setField(row, 12, options.searchText as string);
		setField(row, 13, toCollmexDate(options.dateFrom as string));
		setField(row, 14, toCollmexDate(options.dateTo as string));
		setField(row, 15, options.includeCancellations as boolean);
		setField(row, 16, options.onlyChanged as boolean);
		setField(row, 17, options.systemName as string);
		setField(row, 18, options.paymentId as string);

		return row;
	},
};
