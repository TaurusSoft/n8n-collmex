import type { IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { CollmexApi } from '../credentials/CollmexApi.credentials';

const credential = new CollmexApi();

describe('credential definition', () => {
	it('declares a credential test', () => {
		// n8n's automated review rejects a package without one.
		expect(credential.test).toBeDefined();
		expect(credential.test.request).toBeDefined();
	});

	it('spells the test endpoint out as literals', () => {
		// The review inspects this statically and cannot resolve an identifier
		// imported from another module, so these must not be built from a
		// constant. A rejected submission was caused by exactly that.
		expect(credential.test.request.baseURL).toBe('https://www.collmex.de');
		expect(credential.test.request.url).toBe('/c.cmx');
		expect(credential.test.request.method).toBe('POST');
	});

	it('detects a failed login from the response body', () => {
		// Collmex answers bad credentials with HTTP 200, so the status code
		// cannot be used; character 8 separates MESSAGE;E from MESSAGE;S.
		const rule = credential.test.rules?.[0];

		expect(rule?.type).toBe('responseSuccessBody');
		expect(rule?.properties.key).toBe('8');
		expect(rule?.properties.value).toBe('E');
	});

	it('marks the password as a password field', () => {
		const password = credential.properties.find((property) => property.name === 'password');

		expect(password?.typeOptions?.password).toBe(true);
	});

	it('requires the fields the endpoint cannot work without', () => {
		for (const name of ['customerId', 'username', 'password']) {
			const property = credential.properties.find((candidate) => candidate.name === name);

			expect(property?.required, `${name} must be required`).toBe(true);
		}
	});
});

describe('authenticate', () => {
	it('prepends the LOGIN record and replaces the placeholder endpoint', async () => {
		const authenticated = await (
			credential.authenticate as (
				c: Record<string, unknown>,
				r: IHttpRequestOptions,
			) => Promise<IHttpRequestOptions>
		)(
			{
				customerId: '123456',
				username: 'apiuser',
				password: 'secret',
				companyId: 1,
				charset: 'utf8',
			},
			{
				baseURL: 'https://www.collmex.de',
				url: '/c.cmx',
				method: 'POST',
				body: 'CUSTOMER_GET;;1\n',
			},
		);

		expect(authenticated.url).toBe('https://www.collmex.de/c.cmx?123456,0,data_exchange');
		// An absolute url plus a leftover baseURL would be combined by the HTTP
		// client, so the baseURL has to go.
		expect(authenticated.baseURL).toBeUndefined();
		expect((authenticated.body as Buffer).toString('utf8')).toBe(
			'LOGIN;apiuser;secret;1\nCUSTOMER_GET;;1\n',
		);
	});
});
