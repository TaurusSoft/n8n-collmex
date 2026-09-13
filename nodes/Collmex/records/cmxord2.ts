import { customerAddressFields, shippingAddressFields } from './common';
import type { FieldSpec } from './types';
import { header, position } from './types';

/**
 * CMXORD-2 - sales order, 99 fields, one row per line item.
 *
 * Note fields 86, 87 and 93: the documentation states explicitly that these
 * flags live on the order header even though they sit in the middle of the
 * line item block, so they are marked as header fields.
 */
export const cmxord2: FieldSpec[] = [
	header('recordType', 'C'),
	header('orderId', 'I'),
	position('positionNumber', 'I'),
	header('orderType', 'I'),
	header('companyId', 'I'),
	header('customerId', 'I'),
	...customerAddressFields,
	header('customerOrderNumber', 'C'),
	header('orderDate', 'D'),
	header('priceDate', 'D'),
	header('paymentCondition', 'I'),
	header('currency', 'C'),
	header('priceGroup', 'I'),
	header('discountGroup', 'I'),
	// Documented as an integer, but Collmex sends a decimal percentage
	// ('1,20' was observed live). Typed as a decimal so it arrives as a
	// number rather than falling back to text.
	header('finalDiscount', 'N'),
	header('discountReason', 'C'),
	header('confirmationText', 'C'),
	header('closingText', 'C'),
	header('internalMemo', 'C'),
	header('partialInvoicesAllowed', 'I'),
	header('partialDeliveriesAllowed', 'I'),
	header('deleted', 'I'),
	header('status', 'I'),
	header('language', 'I'),
	header('processor', 'I'),
	header('broker', 'I'),
	header('systemName', 'C'),
	header('finalDiscountAmount', 'M'),
	header('finalDiscountAmountReason', 'C'),
	header('voucher', 'C'),
	header('cancelledOn', 'D'),
	header('shippingType', 'I'),
	header('shippingCosts', 'M'),
	header('cashOnDeliveryFee', 'M'),
	header('deliveryTerms', 'C'),
	header('deliveryTermsAddition', 'C'),
	...shippingAddressFields,
	position('positionType', 'I'),
	position('productId', 'C'),
	position('productDescription', 'C'),
	position('unit', 'C'),
	position('quantity', 'N'),
	position('unitPrice', 'M'),
	position('deliveryDate', 'D'),
	position('priceQuantity', 'N'),
	position('positionDiscount', 'M'),
	position('positionValue', 'M'),
	position('productType', 'I'),
	position('taxClassification', 'I'),
	position('taxAlsoAbroad', 'I'),
	position('revenueType', 'I'),
	header('finallyDelivered', 'I'),
	header('finallyInvoiced', 'I'),
	position('revenue', 'M'),
	position('costs', 'M'),
	position('grossProfit', 'M'),
	position('margin', 'M'),
	position('costsManual', 'M'),
	header('deliveryBlock', 'I'),
	header('customerNoMailings', 'I'),
	header('totalAmountGross', 'M'),
	header('quotationId', 'I'),
	header('paymentReference', 'C'),
	header('differentRecipient', 'I'),
	position('deliveryRelevant', 'I'),
];
