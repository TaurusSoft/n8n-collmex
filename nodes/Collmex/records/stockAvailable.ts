import type { FieldSpec } from './types';
import { header } from './types';

/**
 * STOCK_AVAILABLE - available stock, 6 fields.
 *
 * Unlike the other result types this one has no `CMX` prefix: Collmex answers
 * STOCK_AVAILABLE_GET with records of the same name as the query.
 *
 * `companyId` arrives as a bare number here, without the plain-text label
 * CMXSTK and the master records put behind it. That is what the tenant sends,
 * verified on 2026-10-04, not an oversight in this layout.
 *
 * `availableQuantity` is derived - stock of the available types minus the
 * demands already due - so it goes negative where demand exceeds stock, and
 * comes back as the literal `(NULL)` for products that cannot hold stock at
 * all, such as services. `assignField` drops that, so the field is absent
 * rather than holding a marker. A negative `replenishmentTime` means Collmex
 * could not work the lead time out because the product has no valid vendor
 * agreement.
 */
export const stockAvailable: FieldSpec[] = [
	header('recordType', 'C'),
	header('productId', 'C'),
	header('companyId', 'I'),
	header('availableQuantity', 'N'),
	header('unit', 'C'),
	header('replenishmentTime', 'I'),
];
