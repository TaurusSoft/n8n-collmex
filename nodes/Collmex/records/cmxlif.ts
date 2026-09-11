import type { FieldSpec } from './types';
import { header } from './types';

/**
 * CMXLIF - vendor master record.
 *
 * The documentation lists 41 fields, but the API returns 42: a trailing date
 * that is almost certainly a "created at" counterpart to CMXKND field 53.
 * It is left out here on purpose - `mapRecord` passes undocumented trailing
 * columns through as `field42` rather than guessing at a name.
 */
export const cmxlif: FieldSpec[] = [
	header('recordType', 'C'),
	header('vendorId', 'I'),
	header('companyId', 'I'),
	header('salutation', 'C'),
	header('title', 'C'),
	header('firstName', 'C'),
	header('lastName', 'C'),
	header('company', 'C'),
	header('department', 'C'),
	header('street', 'C'),
	header('zip', 'C'),
	header('city', 'C'),
	header('comment', 'C'),
	header('inactive', 'I'),
	header('country', 'C'),
	header('phone', 'C'),
	header('fax', 'C'),
	header('email', 'C'),
	header('accountNumber', 'C'),
	header('bankCode', 'C'),
	header('iban', 'C'),
	header('bic', 'C'),
	header('bankName', 'C'),
	header('taxNumber', 'C'),
	header('vatId', 'C'),
	header('paymentCondition', 'I'),
	header('deliveryTerms', 'C'),
	header('deliveryTermsAddition', 'C'),
	header('outputMedium', 'I'),
	header('accountHolder', 'C'),
	header('addressGroups', 'C'),
	header('customerNumberAtVendor', 'C'),
	header('currency', 'C'),
	header('phone2', 'C'),
	header('outputLanguage', 'I'),
	header('expenseAccount', 'I'),
	header('inputTaxClassification', 'I'),
	header('postingText', 'C'),
	header('costCenter', 'C'),
	header('privatePerson', 'I'),
	header('url', 'C'),
];
