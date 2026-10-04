import type { FieldSpec } from './types';
import { header } from './types';

/**
 * CMXSTK - stock record, 11 fields.
 *
 * A stock object is identified by the combination of product, company, stock
 * type and batch, so one product can come back as several records. Fields 7
 * and 9 to 11 are export-only; the import ignores them.
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
