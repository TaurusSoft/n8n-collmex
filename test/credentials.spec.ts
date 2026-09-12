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

	it('leaves the LOGIN record and endpoint to authenticate', () => {
		// The LOGIN record carries the charset flag that has to match how the
		// body is encoded, so only authenticate builds it. The url is a
		// placeholder that authenticate replaces with the customer endpoint.
		expect(credential.test.request.url).toBe('https://www.collmex.de');
		expect(credential.test.request.method).toBe('POST');
		expect(credential.test.request.body).toMatch(/^=CUSTOMER_GET;/);
		expect(credential.test.request.body).not.toContain('LOGIN');
	});

	it('flags a rejected login via responseSuccessBody', () => {
		// Collmex answers bad credentials with HTTP 200 and an error record in
		// the body (`MESSAGE;E;...`), so only a responseSuccessBody rule can
		// tell the test apart from a real success.
		const rule = credential.test.rules?.[0];

		expect(rule?.type).toBe('responseSuccessBody');
		expect(rule?.properties).toMatchObject({ key: '8', value: 'E' });
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
				url: 'https://www.collmex.de',
				method: 'POST',
				body: 'CUSTOMER_GET;;1\n',
			},
		);

		expect(authenticated.url).toBe('https://www.collmex.de/c.cmx?123456,0,data_exchange');
		expect((authenticated.body as Buffer).toString('utf8')).toBe(
			'LOGIN;apiuser;secret;1\nCUSTOMER_GET;;1\n',
		);
	});
});
