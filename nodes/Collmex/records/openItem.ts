import type { FieldSpec } from './types';
import { header } from './types';

/**
 * OPEN_ITEM - an unpaid receivable or payable, 20 fields.
 *
 * Like `STOCK_AVAILABLE` this record type carries no `CMX` prefix, which is
 * what Collmex documents.
 *
 * One record holds both a customer and a vendor column pair, and only the side
 * that was asked for is filled; the other arrives empty rather than zeroed, so
 * it drops out of the output on its own. The company comes as a bare number
 * here, unlike `CMXSTK` or `PRICE_GROUP`, which send it as a coded
 * enumeration - verified on 2026-10-04 rather than assumed.
 *
 * The dates arrive compact as `JJJJMMTT`, where the customer, product and
 * invoice records send `TT.MM.JJJJ`. `parseDate` accepts both.
 *
 * An item is identified by fiscal year, accounting document number and
 * position; there is no single id, which is why the resource only offers
 * Get Many.
 */
export const openItem: FieldSpec[] = [
	header('recordType', 'C'),
	header('companyId', 'I'),
	header('fiscalYear', 'I'),
	header('accountingDocumentNumber', 'I'),
	header('positionNumber', 'I'),
	header('customerId', 'I'),
	header('customerName', 'C'),
	header('vendorId', 'I'),
	header('vendorName', 'C'),
	header('invoiceNumber', 'C'),
	header('documentDate', 'D'),
	header('paymentCondition', 'I'),
	header('dueDate', 'D'),
	header('daysOverdue', 'I'),
	header('dunningLevel', 'I'),
	header('dunningDate', 'D'),
	header('dunningFees', 'M'),
	header('amount', 'M'),
	header('paid', 'M'),
	header('open', 'M'),
];
