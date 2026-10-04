import type { FieldSpec } from './types';
import { header } from './types';

/**
 * CMXSTK - stock record, 11 fields.
 *
 * A stock object is identified by the combination of product, company, stock
 * type and batch, so one product can come back as several records. Fields 7
 * and 9 to 11 are export-only; the import ignores them.
 *
 * `value` is the product costs times the quantity, so it is zero for a product
 * that carries no costs rather than being unset. Unlike STOCK_AVAILABLE, this
 * record sends the company as a coded enumeration with the company name behind
 * it.
 */
export const cmxstk: FieldSpec[] = [
	header('recordType', 'C'),
	header('productId', 'C'),
	header('companyId', 'I'),
	header('quantity', 'N'),
	header('stockType', 'I'),
	header('batchNumber', 'I'),
	header('value', 'M'),
	header('batchDescription', 'C'),
	header('productDescription', 'C'),
	header('storageLocation', 'C'),
	header('baseUnit', 'C'),
];
