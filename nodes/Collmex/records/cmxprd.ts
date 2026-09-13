import type { FieldSpec } from './types';
import { header } from './types';

/**
 * CMXPRD - product master record, 67 fields.
 *
 * Note the company sits on field 7 here, not field 3 as in the customer and
 * vendor records.
 *
 * Collmex reuses two labels within this layout: "Inaktiv" appears on 13 (the
 * product itself) and 54 (the web shop entry), and "Reserviert" on 39, 40, 56,
 * 57, 58 and 61. They are numbered here so every field keeps a distinct name.
 */
export const cmxprd: FieldSpec[] = [
	header('recordType', 'C'),
	header('productId', 'C'),
	header('description', 'C'),
	header('descriptionEnglish', 'C'),
	header('unit', 'C'),
	header('productGroup', 'I'),
	header('companyId', 'I'),
	header('taxClassification', 'I'),
	header('weight', 'N'),
	header('weightUnit', 'C'),
	header('priceQuantity', 'N'),
	header('productType', 'I'),
	header('inactive', 'I'),
	header('priceGroup', 'I'),
	header('salesPrice', 'M'),
	header('gtin', 'C'),
	header('manufacturer', 'C'),
	header('shippingGroup', 'I'),
	header('minimumStock', 'N'),
	header('orderQuantity', 'N'),
	header('batchRequired', 'I'),
	header('procurementType', 'I'),
	header('productionTime', 'I'),
	header('labourCosts', 'M'),
	header('labourCostsQuantity', 'N'),
	header('comment', 'C'),
	header('costCalculation', 'I'),
	header('costs', 'M'),
	header('costsQuantity', 'N'),
	header('purchaseVendor', 'I'),
	header('purchaseTaxClassification', 'I'),
	header('purchaseProductIdAtVendor', 'C'),
	header('purchasePackagingUnit', 'N'),
	header('purchaseDescription', 'C'),
	header('purchasePrice', 'M'),
	header('purchasePriceQuantity', 'N'),
	header('purchaseLeadTime', 'I'),
	header('purchaseCurrency', 'C'),
	header('reserved39', 'I'),
	header('reserved40', 'I'),
	header('websiteId', 'I'),
	header('shopShortText', 'C'),
	header('shopLongText', 'C'),
	header('shopTextsAreHtml', 'I'),
	header('shopFileName', 'C'),
	header('shopKeywords', 'C'),
	header('shopTitle', 'C'),
	header('shopTemplateId', 'I'),
	header('shopImageUrl', 'C'),
	header('basePriceQuantity1', 'N'),
	header('basePriceQuantity2', 'N'),
	header('basePriceUnit', 'I'),
	header('priceOnRequest', 'I'),
	header('shopInactive', 'I'),
	// Documented as numeric, but exported as a comma separated list of
	// category numbers, so it is kept as text.
	header('shopCategories', 'C'),
	header('reserved56', 'I'),
	header('reserved57', 'I'),
	header('reserved58', 'I'),
	header('manufacturerProductId', 'C'),
	header('deliveryRelevant', 'I'),
	header('reserved61', 'C'),
	header('ebayItemNumber', 'C'),
	header('directDelivery', 'I'),
	header('commodityCode', 'C'),
	header('storageLocation', 'C'),
	header('noStockManagement', 'I'),
	header('countryOfOrigin', 'C'),
];
