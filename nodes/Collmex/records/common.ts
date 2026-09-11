import type { FieldSpec } from './types';
import { header } from './types';

/**
 * The 22-field customer address block, identical in CMXQTN, CMXORD-2,
 * CMXINV and CMXDLV. Only its starting offset differs between them.
 *
 * Collmex fills these on export; on import most of them are ignored (the
 * exception is CMXORD-2, where they identify or create the customer).
 */
export const customerAddressFields: FieldSpec[] = [
	header('customerSalutation', 'C'),
	header('customerTitle', 'C'),
	header('customerFirstName', 'C'),
	header('customerLastName', 'C'),
	header('customerCompany', 'C'),
	header('customerDepartment', 'C'),
	header('customerStreet', 'C'),
	header('customerZip', 'C'),
	header('customerCity', 'C'),
	header('customerCountry', 'C'),
	header('customerPhone', 'C'),
	header('customerPhone2', 'C'),
	header('customerFax', 'C'),
	header('customerEmail', 'C'),
	header('customerAccountNumber', 'C'),
	header('customerBankCode', 'C'),
	header('customerAccountHolder', 'C'),
	header('customerIban', 'C'),
	header('customerBic', 'C'),
	header('customerBankName', 'C'),
	header('customerVatId', 'C'),
	header('customerPrivatePerson', 'I'),
];

/**
 * The 14-field deviating delivery address block, identical in CMXQTN,
 * CMXORD-2, CMXINV and CMXDLV.
 */
export const shippingAddressFields: FieldSpec[] = [
	header('shippingSalutation', 'C'),
	header('shippingTitle', 'C'),
	header('shippingFirstName', 'C'),
	header('shippingLastName', 'C'),
	header('shippingCompany', 'C'),
	header('shippingDepartment', 'C'),
	header('shippingStreet', 'C'),
	header('shippingZip', 'C'),
	header('shippingCity', 'C'),
	header('shippingCountry', 'C'),
	header('shippingPhone', 'C'),
	header('shippingPhone2', 'C'),
	header('shippingFax', 'C'),
	header('shippingEmail', 'C'),
];
