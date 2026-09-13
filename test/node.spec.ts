import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { Collmex } from '../nodes/Collmex/Collmex.node';
import type { CollmexCredentials } from '../nodes/Collmex/transport/auth';
import { applyCollmexAuth } from '../nodes/Collmex/transport/auth';
import { parseCsv } from '../nodes/Collmex/transport/csv';
import {
	customerGetResponse,
	emptyResultResponse,
	invoiceGetResponse,
	loginErrorResponse,
	productGetResponse,
	vendorGetResponse,
} from './fixtures';

interface Harness {
	context: IExecuteFunctions;
	/** The records sent to Collmex, excluding the LOGIN line. */
	sentRecords: () => string[][];
	sentBody: () => string;
}

/**
 * Stands in for n8n's execution context, answering with a canned response and
 * recording what was sent.
 */
function harness(
	parameters: IDataObject,
	response: string,
	options: { continueOnFail?: boolean } = {},
): Harness {
	let body = '';

	const credentials: CollmexCredentials = {
		customerId: '123456',
		username: 'apiuser',
		password: 'secret',
		companyId: 1,
	};

	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Collmex', type: 'collmex', typeVersion: 1 }),
		continueOnFail: () => options.continueOnFail ?? false,
		getCredentials: async () => credentials,
		getNodeParameter(name: string, _index: number, fallback?: unknown) {
			if (name in parameters) return parameters[name];
			if (fallback !== undefined) return fallback;

			throw new Error(`test harness: unexpected parameter "${name}"`);
		},
		helpers: {
			async httpRequestWithAuthentication(
				_credentialsType: string,
				request: IHttpRequestOptions,
			) {
				// Mirrors what n8n does before sending: run the credential's
				// authenticate step, so the assertions see the real wire format
				// including the LOGIN record.
				const authenticated = applyCollmexAuth(credentials, request);
				body = (authenticated.body as Buffer).toString('utf8');

				// Collmex answers in ISO-8859-1 and declares it in the header.
				const buffer = Buffer.from(response, 'latin1');

				return {
					statusCode: 200,
					headers: { 'content-type': 'text/csv; charset=ISO-8859-1' },
					body: buffer.buffer.slice(
						buffer.byteOffset,
						buffer.byteOffset + buffer.byteLength,
					),
				};
			},
		},
	} as unknown as IExecuteFunctions;

	return {
		context,
		sentBody: () => body,
		sentRecords: () => parseCsv(body).slice(1),
	};
}

async function run(
	parameters: IDataObject,
	response: string,
	options?: { continueOnFail?: boolean },
): Promise<{ items: INodeExecutionData[]; sent: string[][]; body: string }> {
	const { context, sentRecords, sentBody } = harness(parameters, response, options);
	const [items] = await new Collmex().execute.call(context);

	return { items, sent: sentRecords(), body: sentBody() };
}

describe('customer', () => {
	it('queries and maps many customers', async () => {
		const { items, sent } = await run(
			{ resource: 'customer', operation: 'getAll', returnAll: true, options: {} },
			customerGetResponse,
		);

		expect(sent).toEqual([['CUSTOMER_GET', '', '1', '', '', '', '', '', '', '', '', '', '']]);
		expect(items).toHaveLength(2);
		expect(items[0].json.customerId).toBe(9999);
		expect(items[1].json.company).toBe('Testfirma 1');
		expect(items[1].json.zip).toBe('01069');
		expect(items[0].pairedItem).toEqual({ item: 0 });
	});

	it('puts the customer number into field 2 for a single get', async () => {
		const { sent } = await run(
			{ resource: 'customer', operation: 'get', customerId: '10000', options: {} },
			customerGetResponse,
		);

		expect(sent[0][1]).toBe('10000');
	});

	it('applies the limit after the fact', async () => {
		const { items } = await run(
			{ resource: 'customer', operation: 'getAll', returnAll: false, limit: 1, options: {} },
			customerGetResponse,
		);

		expect(items).toHaveLength(1);
	});

	it('maps options onto the documented field numbers', async () => {
		const { sent } = await run(
			{
				resource: 'customer',
				operation: 'getAll',
				returnAll: true,
				options: {
					companyId: 2,
					searchText: 'Muster',
					dueForFollowUp: true,
					zipOrCountry: 'DE',
					addressGroup: '3',
					priceGroup: '4',
					discountGroup: '5',
					broker: '6',
					onlyChanged: true,
					systemName: 'n8n',
					includeInactive: true,
				},
			},
			customerGetResponse,
		);

		expect(sent[0]).toEqual([
			'CUSTOMER_GET',
			'', // 2 customer number, unset for getAll
			'2', // 3 company
			'Muster', // 4 free text
			'1', // 5 due for follow-up
			'DE', // 6 postal code or country
			'3', // 7 address group
			'4', // 8 price group
			'5', // 9 discount group
			'6', // 10 broker
			'1', // 11 only changed
			'n8n', // 12 system name
			'1', // 13 include inactive
		]);
	});

	it('omits unset flags rather than sending a zero', async () => {
		const { sent } = await run(
			{
				resource: 'customer',
				operation: 'getAll',
				returnAll: true,
				options: { onlyChanged: false, includeInactive: false },
			},
			customerGetResponse,
		);

		expect(sent[0][10]).toBe('');
		expect(sent[0][12]).toBe('');
	});
});

describe('vendor', () => {
	it('maps a vendor, surplus column included', async () => {
		const { items, sent } = await run(
			{ resource: 'vendor', operation: 'getAll', returnAll: true, options: {} },
			vendorGetResponse,
		);

		expect(sent[0][0]).toBe('VENDOR_GET');
		expect(items).toHaveLength(1);
		expect(items[0].json.vendorId).toBe(9999);
		expect(items[0].json.field42).toBe('01.01.1970');
	});
});

describe('product', () => {
	it('puts the company on field 2 and the product on field 3', async () => {
		// PRODUCT_GET is laid out differently from every other query, where
		// field 2 is the record's own id.
		const { sent } = await run(
			{ resource: 'product', operation: 'get', productId: 'ART-1', options: {} },
			productGetResponse,
		);

		expect(sent[0][0]).toBe('PRODUCT_GET');
		expect(sent[0][1]).toBe('1');
		expect(sent[0][2]).toBe('ART-1');
	});

	it('maps the live response end to end', async () => {
		const { items } = await run(
			{ resource: 'product', operation: 'getAll', returnAll: true, options: {} },
			productGetResponse,
		);

		expect(items).toHaveLength(2);
		expect(items[1].json.description).toBe('Anker 240W USB C auf USB C Kabel PD 3.1; 1,8m');
		expect(items[1].json.salesPrice).toBe(14.99);
	});
});

describe('documents', () => {
	it('groups line items into one item by default', async () => {
		const { items } = await run(
			{
				resource: 'invoice',
				operation: 'getAll',
				returnAll: true,
				groupPositions: true,
				options: {},
			},
			invoiceGetResponse,
		);

		expect(items).toHaveLength(1);
		expect(items[0].json.invoiceId).toBe(1);
		expect(items[0].json.positions).toHaveLength(2);
	});

	it('returns one item per row when grouping is off', async () => {
		const { items } = await run(
			{
				resource: 'invoice',
				operation: 'getAll',
				returnAll: true,
				groupPositions: false,
				options: {},
			},
			invoiceGetResponse,
		);

		expect(items).toHaveLength(2);
		expect(items[0].json.positionNumber).toBe(10);
		expect(items[1].json.positionNumber).toBe(20);
		expect(items[0].json).not.toHaveProperty('positions');
	});

	it('converts date filters to the format Collmex expects', async () => {
		const { sent } = await run(
			{
				resource: 'invoice',
				operation: 'getAll',
				returnAll: true,
				groupPositions: true,
				options: {
					invoiceDateFrom: '2026-01-01T00:00:00.000Z',
					invoiceDateTo: '2026-09-30T00:00:00.000Z',
				},
			},
			emptyResultResponse,
		);

		expect(sent[0][4]).toBe('20260101');
		expect(sent[0][5]).toBe('20260930');
	});

	it('leaves the return format at CSV so no ZIP comes back', async () => {
		const { sent } = await run(
			{
				resource: 'invoice',
				operation: 'getAll',
				returnAll: true,
				groupPositions: true,
				options: {},
			},
			emptyResultResponse,
		);

		expect(sent[0][7]).toBe('');
	});

	it('never asks Collmex to mark deliveries as output', async () => {
		// Field 14 of DELIVERY_GET writes back to Collmex; this node is read-only.
		const { sent } = await run(
			{
				resource: 'delivery',
				operation: 'getAll',
				returnAll: true,
				groupPositions: true,
				options: {},
			},
			emptyResultResponse,
		);

		expect(sent[0]).toHaveLength(14);
		expect(sent[0][13]).toBe('');
	});

	it('returns no items for an empty result instead of failing', async () => {
		const { items } = await run(
			{
				resource: 'invoice',
				operation: 'getAll',
				returnAll: true,
				groupPositions: true,
				options: {},
			},
			emptyResultResponse,
		);

		expect(items).toEqual([]);
	});
});

describe('error handling', () => {
	const failing = {
		resource: 'customer',
		operation: 'getAll',
		returnAll: true,
		options: {},
	};

	it('raises the Collmex message even though the status code was 200', async () => {
		await expect(run(failing, loginErrorResponse)).rejects.toThrow(/Nur für API/);
	});

	it('reports the error as an item when continueOnFail is set', async () => {
		const { items } = await run(failing, loginErrorResponse, { continueOnFail: true });

		expect(items).toHaveLength(1);
		expect(items[0].json.error).toContain('Nur für API');
		expect(items[0].pairedItem).toEqual({ item: 0 });
	});
});

describe('credentials', () => {
	it('sends the LOGIN record ahead of the query', async () => {
		const { body } = await run(
			{ resource: 'customer', operation: 'getAll', returnAll: true, options: {} },
			customerGetResponse,
		);

		expect(body.split('\n')[0]).toBe('LOGIN;apiuser;secret;1');
	});
});
