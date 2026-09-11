import { describe, expect, it } from 'vitest';

import { groupDocuments, mapRecord, recordLayouts } from '../nodes/Collmex/records';
import { parseCsv } from '../nodes/Collmex/transport/csv';
import { buildInvoiceResponse, customerGetResponse, vendorGetResponse } from './fixtures';

describe('record layouts', () => {
	// Straight from the Collmex import documentation. If one of these drifts,
	// every field after the change silently lands on the wrong name.
	it.each([
		['CMXKND', 54],
		['CMXLIF', 41],
		['CMXQTN', 87],
		['CMXORD-2', 99],
		['CMXINV', 96],
		['CMXDLV', 72],
	])('%s has %i documented fields', (type, count) => {
		expect(recordLayouts[type]).toHaveLength(count);
	});

	it('starts every layout with the record type', () => {
		for (const layout of Object.values(recordLayouts)) {
			expect(layout[0]).toEqual({ name: 'recordType', type: 'C' });
		}
	});

	it('has no duplicate field names within a layout', () => {
		for (const [type, layout] of Object.entries(recordLayouts)) {
			const names = layout.map((spec) => spec.name);
			expect(new Set(names).size, `${type} has duplicate field names`).toBe(names.length);
		}
	});

	it('marks the position number as line item data on document types', () => {
		for (const type of ['CMXQTN', 'CMXORD-2', 'CMXINV', 'CMXDLV']) {
			expect(recordLayouts[type][2]).toEqual({
				name: 'positionNumber',
				type: 'I',
				scope: 'position',
			});
		}
	});
});

describe('mapRecord', () => {
	const customers = parseCsv(customerGetResponse).filter((row) => row[0] === 'CMXKND');

	it('maps the live test customer onto the expected names', () => {
		const row = customers.find((candidate) => candidate[1] === '10000');
		expect(row).toHaveLength(54);

		expect(mapRecord(recordLayouts.CMXKND, row as string[])).toEqual({
			recordType: 'CMXKND',
			customerId: 10000,
			companyId: 1,
			companyIdLabel: 'Max Mustermann',
			company: 'Testfirma 1',
			street: 'Bayrische Str. 12',
			zip: '01069',
			city: 'Dresden',
			inactive: 0,
			country: 'DE',
			paymentCondition: 0,
			paymentConditionLabel: '30 Tage ohne Abzug',
			discountGroup: 0,
			outputMedium: 1,
			outputMediumLabel: 'E-Mail',
			priceGroup: 0,
			priceGroupLabel: 'Standard',
			currency: 'EUR',
			broker: 0,
			deliveryBlock: 0,
			constructionOrCleaningService: 0,
			outputLanguage: 0,
			outputLanguageLabel: 'Deutsch',
			directDebitMandateReference: '10000',
			mandateSignatureDate: '2026-09-11',
			dunningBlock: 0,
			noMailings: 0,
			privatePerson: 0,
			partialDeliveriesAllowed: 0,
			partialInvoicesAllowed: 0,
			createdAt: '2026-09-11',
			invoiceFormat: 0,
		});
	});

	it('omits fields Collmex left empty', () => {
		const mapped = mapRecord(recordLayouts.CMXKND, customers[0]);

		expect(mapped).not.toHaveProperty('salutation');
		expect(mapped).not.toHaveProperty('email');
	});

	it('passes undocumented surplus columns through', () => {
		// CMXLIF is documented with 41 fields but returns 42.
		const row = parseCsv(vendorGetResponse).find((candidate) => candidate[0] === 'CMXLIF');
		expect(row).toHaveLength(42);

		const mapped = mapRecord(recordLayouts.CMXLIF, row as string[]);

		expect(mapped.vendorId).toBe(9999);
		expect(mapped.inputTaxClassification).toBe(0);
		expect(mapped.inputTaxClassificationLabel).toBe('19%');
		expect(mapped.field42).toBe('01.01.1970');
	});

	it('filters by scope', () => {
		const row = parseCsv(buildInvoiceResponse()).find((candidate) => candidate[0] === 'CMXINV');

		const headerOnly = mapRecord(recordLayouts.CMXINV, row as string[], 'header');
		const positionOnly = mapRecord(recordLayouts.CMXINV, row as string[], 'position');

		expect(headerOnly.invoiceId).toBe(20001);
		expect(headerOnly).not.toHaveProperty('productId');

		expect(positionOnly.productId).toBe('ART-1');
		expect(positionOnly).not.toHaveProperty('invoiceId');
	});
});

describe('groupDocuments', () => {
	it('folds the line items of one invoice into a single document', () => {
		const rows = parseCsv(buildInvoiceResponse()).filter((row) => row[0] === 'CMXINV');
		const documents = groupDocuments(recordLayouts.CMXINV, rows, 1);

		expect(documents).toHaveLength(1);

		const invoice = documents[0];
		expect(invoice.invoiceId).toBe(20001);
		expect(invoice.customerId).toBe(10000);
		expect(invoice.invoiceDate).toBe('2026-09-11');
		expect(invoice.status).toBe(20);
		expect(invoice.statusLabel).toBe('Offen');
		expect(invoice.customerZip).toBe('01069');

		// Line item data must not bleed into the header.
		expect(invoice).not.toHaveProperty('productId');
		expect(invoice).not.toHaveProperty('positionNumber');

		expect(invoice.positions).toEqual([
			{
				positionNumber: 10,
				positionType: 0,
				positionTypeLabel: 'Normalposition',
				productId: 'ART-1',
				productDescription: 'Testprodukt A',
				unit: 'Stk',
				quantity: 2,
				unitPrice: 19.99,
				positionValue: 39.98,
			},
			{
				positionNumber: 20,
				positionType: 0,
				positionTypeLabel: 'Normalposition',
				productId: 'ART-2',
				productDescription: 'Testprodukt B',
				unit: 'Stk',
				quantity: 1.5,
				unitPrice: 1234.5,
				positionValue: 1851.75,
			},
		]);
	});

	it('starts a new document when the document number changes', () => {
		const row = (id: string) => {
			const fields = new Array<string>(96).fill('');
			fields[0] = 'CMXINV';
			fields[1] = id;
			fields[2] = '10';

			return fields;
		};

		const documents = groupDocuments(
			recordLayouts.CMXINV,
			[row('1'), row('1'), row('2')],
			1,
		);

		expect(documents).toHaveLength(2);
		expect(documents[0].positions).toHaveLength(2);
		expect(documents[1].positions).toHaveLength(1);
	});

	it('returns nothing for an empty result', () => {
		expect(groupDocuments(recordLayouts.CMXINV, [], 1)).toEqual([]);
	});
});
