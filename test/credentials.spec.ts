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

	it('describes the whole test request without relying on authenticate', () => {
		// n8n's automated review determines the request statically and cannot
		// execute the custom authenticate function, so endpoint and LOGIN
		// record are spelled out as credential expressions here.
		expect(credential.test.request.baseURL).toBe('https://www.collmex.de');
		expect(credential.test.request.url).toContain('{{$credentials.customerId}}');
		expect(credential.test.request.method).toBe('POST');
		expect(credential.test.request.body).toMatch(/^=LOGIN;/);
		expect(credential.test.request.body).toContain('{{$credentials.password}}');
	});

	it('flags a rejected login via responseSuccessBody', () => {
		// Collmex answers bad credentials with HTTP 200 and an error record in
		// the body (`MESSAGE;E;...`), so only a responseSuccessBody rule can
		// tell the test apart from a real success. Removing this in 0.1.4 to
		// chase the "Missing credential test" rejection didn't fix it (see
		// CHANGELOG) and only cost us the ability to detect bad credentials.
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
