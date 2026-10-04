import type { FieldSpec } from './types';
import { header } from './types';

/**
 * STOCK_AVAILABLE - available stock, 6 fields.
 *
 * Unlike the other result types this one has no `CMX` prefix: Collmex answers
 * STOCK_AVAILABLE_GET with records of the same name as the query.
 *
 * Two fields carry sentinels rather than values. `availableQuantity` comes
 * back as the literal `(NULL)` for products that cannot hold stock at all,
 * such as services - `assignField` drops that, so the field is simply absent.
 * A negative `replenishmentTime` means Collmex could not work the lead time
 * out because the product has no valid vendor agreement.
 */
export const stockAvailable: FieldSpec[] = [
	header('recordType', 'C'),
	header('productId', 'C'),
	header('companyId', 'I'),
	header('availableQuantity', 'N'),
	header('unit', 'C'),
	header('replenishmentTime', 'I'),
];
