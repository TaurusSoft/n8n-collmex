import type { FieldSpec } from './types';
import { header } from './types';

/**
 * CMXKND - customer master record, 54 fields.
 *
 * Verified against live data from the API: every populated field landed on
 * the position the import documentation predicts.
 */
export const cmxknd: FieldSpec[] = [
	header('recordType', 'C'),
	header('customerId', 'I'),
	header('companyId', 'I'),
	header('salutation', 'C'),
	header('title', 'C'),
	header('firstName', 'C'),
	header('lastName', 'C'),
	header('company', 'C'),
	header('department', 'C'),
	header('street', 'C'),
	// Text, not a number: postal codes arrive with leading zeroes (`01069`).
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
	header('reserved', 'C'),
	header('vatId', 'C'),
	header('paymentCondition', 'I'),
	header('discountGroup', 'I'),
	header('deliveryTerms', 'C'),
	header('deliveryTermsAddition', 'C'),
	header('outputMedium', 'I'),
	header('accountHolder', 'C'),
	// Number plus optional comment, repeatable and comma separated, so this
	// stays text rather than being forced into a number.
	header('addressGroups', 'C'),
	header('ebayMemberName', 'C'),
	header('priceGroup', 'I'),
	header('currency', 'C'),
	header('broker', 'I'),
	header('costCenter', 'C'),
	header('followUpDate', 'D'),
	header('deliveryBlock', 'I'),
	header('constructionOrCleaningService', 'I'),
	header('vendorNumberAtCustomer', 'C'),
	header('outputLanguage', 'I'),
	header('cc', 'C'),
	header('phone2', 'C'),
	header('directDebitMandateReference', 'C'),
	header('mandateSignatureDate', 'D'),
	header('dunningBlock', 'I'),
	header('noMailings', 'I'),
	header('privatePerson', 'I'),
	header('url', 'C'),
	header('partialDeliveriesAllowed', 'I'),
	header('partialInvoicesAllowed', 'I'),
	header('createdAt', 'D'),
	header('invoiceFormat', 'I'),
];
