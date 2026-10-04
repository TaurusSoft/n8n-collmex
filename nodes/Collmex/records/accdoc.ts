import type { FieldSpec } from './types';
import { header } from './types';

/**
 * ACCDOC - one accounting posting line, 31 fields.
 *
 * Like `STOCK_AVAILABLE` and `OPEN_ITEM` this record type carries no `CMX`
 * prefix, which is what Collmex documents.
 *
 * `side` is documented as a coded `I` field - `0 = Soll, 1 = Haben` - but the
 * tenant sends the literal words `Soll` and `Haben` as text, not a number or a
 * coded enumeration. Verified on 2026-10-04 rather than taken from the docs,
 * and typed `C` here to match what actually arrives.
 *
 * The posting date and the date it was recorded each arrive twice: fields 5
 * and 6 as dotted text (`13.09.2026`), fields 28 and 29 as the same two dates
 * in Collmex's compact `D` form. The first pair is kept as text under
 * `*Text` names since `assignField` would otherwise need to parse it, and the
 * second pair is the one actually parsed - the way `CMXPRD` numbers its two
 * "Inaktiv" fields to keep every field a distinct name.
 *
 * `companyId` arrives bare here, as it does on `STOCK_AVAILABLE` and
 * `OPEN_ITEM`, not coded with the company name behind it the way `CMXSTK`
 * sends it.
 *
 * A booking is identified by company, fiscal year and posting number; one
 * booking can have several position rows, one per account touched. They are
 * not folded into a single item with a `positions` array the way a document
 * is: a booking number resets every fiscal year, so grouping on it alone
 * could merge two different years' booking 1. Each row instead carries its
 * own `fiscalYear` and `accountingDocumentNumber`, the same names `OPEN_ITEM`
 * uses, so a workflow can group them itself if it needs to.
 */
export const accdoc: FieldSpec[] = [
	header('recordType', 'C'),
	header('companyId', 'I'),
	header('fiscalYear', 'I'),
	header('accountingDocumentNumber', 'I'),
	header('documentDateText', 'C'),
	header('postedAtText', 'C'),
	header('text', 'C'),
	header('positionNumber', 'I'),
	header('accountNumber', 'I'),
	header('accountName', 'C'),
	header('side', 'C'),
	header('amount', 'M'),
	header('customerId', 'I'),
	header('customerName', 'C'),
	header('vendorId', 'I'),
	header('vendorName', 'C'),
	header('assetId', 'I'),
	header('assetName', 'C'),
	header('cancelledBookingNumber', 'I'),
	header('costCenter', 'C'),
	header('invoiceNumber', 'C'),
	header('salesOrderId', 'I'),
	header('tripId', 'I'),
	header('matchedNumber', 'I'),
	header('matchedFiscalYear', 'I'),
	header('matchedPositionNumber', 'I'),
	header('documentId', 'I'),
	header('documentDate', 'D'),
	header('postedAt', 'D'),
	header('internalMemo', 'C'),
	header('postedBy', 'C'),
];
