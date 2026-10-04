import type { IDataObject, IHttpRequestOptions, ILoadOptionsFunctions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { loadOptions } from '../nodes/Collmex/methods/loadOptions';
import type { CollmexCredentials } from '../nodes/Collmex/transport/auth';
import { applyCollmexAuth } from '../nodes/Collmex/transport/auth';
import { parseCsv } from '../nodes/Collmex/transport/csv';
import {
	addressGroupsResponse,
	employeesResponse,
	emptyResultResponse,
	priceGroupsResponse,
	productGroupsResponse,
} from './fixtures';

function harness(response: string, currentParameters: IDataObject = {}) {
	let body = '';

	const credentials: CollmexCredentials = {
		customerId: '123456',
		username: 'apiuser',
		password: 'secret',
		companyId: 1,
	};

	const context = {
		getNode: () => ({ name: 'Collmex', type: 'collmex', typeVersion: 1 }),
		getCredentials: async () => credentials,
		getCurrentNodeParameter: (name: string) => currentParameters[name],
		helpers: {
			async httpRequestWithAuthentication(_credentialsType: string, request: IHttpRequestOptions) {
				body = (applyCollmexAuth(credentials, request).body as Buffer).toString('utf8');
				const buffer = Buffer.from(response, 'latin1');

				return {
					statusCode: 200,
					headers: { 'content-type': 'text/csv; charset=ISO-8859-1' },
					body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
				};
			},
		},
	} as unknown as ILoadOptionsFunctions;

	return { context, sentRecords: () => parseCsv(body).slice(1) };
}

describe('product groups', () => {
	it('queries without arguments and lists the groups', async () => {
		// PRODUCT_GROUPS_GET takes no fields at all, not even a company - the
		// only query in this package that does not.
		const { context, sentRecords } = harness(productGroupsResponse);

		expect(await loadOptions.getProductGroups.call(context)).toEqual([
			{ name: 'Elektro (1)', value: '1' },
		]);
		expect(sentRecords()).toEqual([['PRODUCT_GROUPS_GET']]);
	});
});

describe('address groups', () => {
	it('queries without arguments and lists the groups', async () => {
		const { context, sentRecords } = harness(addressGroupsResponse);

		expect(await loadOptions.getAddressGroups.call(context)).toEqual([
			{ name: 'Newsletter (1)', value: '1' },
		]);
		expect(sentRecords()).toEqual([['ADDRESS_GROUPS_GET']]);
	});
});

describe('price groups', () => {
	it('keeps the standard group, whose id is zero', async () => {
		// A falsy id that still has to be offered and selectable, which is why
		// the value is text rather than a number.
		const { context } = harness(priceGroupsResponse);

		expect(await loadOptions.getPriceGroups.call(context)).toEqual([
			{ name: 'Standard (0)', value: '0' },
		]);
	});

	it('asks for the company from the credentials', async () => {
		const { context, sentRecords } = harness(priceGroupsResponse);
		await loadOptions.getPriceGroups.call(context);

		// Field 3 left blank: inactive groups are not offered.
		expect(sentRecords()).toEqual([['PRICE_GROUPS_GET', '1', '']]);
	});

	it('follows a company the user overrode on screen', async () => {
		const { context, sentRecords } = harness(priceGroupsResponse, { 'options.companyId': 4 });
		await loadOptions.getPriceGroups.call(context);

		expect(sentRecords()[0][1]).toBe('4');
	});
});

describe('employees', () => {
	it('lists them by name, with the number behind it', async () => {
		const { context, sentRecords } = harness(employeesResponse);

		expect(await loadOptions.getEmployees.call(context)).toEqual([
			{ name: 'Max Mustermann (1)', value: '1' },
		]);
		// Employee number and free text left blank, so everyone comes back.
		expect(sentRecords()).toEqual([['EMPLOYEE_GET', '', '1', '']]);
	});
});

describe('every list', () => {
	it.each(['getProductGroups', 'getPriceGroups', 'getAddressGroups', 'getEmployees'] as const)(
		'%s returns nothing rather than failing on an empty result',
		async (method) => {
			const { context } = harness(emptyResultResponse);

			expect(await loadOptions[method].call(context)).toEqual([]);
		},
	);
});
