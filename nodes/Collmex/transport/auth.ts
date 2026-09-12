import type { IHttpRequestOptions } from 'n8n-workflow';

import { formatCsvRow } from './csv';

export const COLLMEX_BASE_URL = 'https://www.collmex.de';

export interface CollmexCredentials {
	customerId: string;
	username: string;
	password: string;
	companyId: number;
	charset: 'utf8' | 'latin1';
}

export function buildUrl(customerId: string): string {
	return `${COLLMEX_BASE_URL}/c.cmx?${customerId},0,data_exchange`;
}

/**
 * Turns a bare request into an authenticated Collmex request.
 *
 * Collmex authenticates through the first line of the uploaded CSV rather
 * than through a header, so this prepends the mandatory `LOGIN` record to
 * the body and points the request at the customer's endpoint - the customer
 * number is part of the URL.
 *
 * Field 4 of `LOGIN` selects the character set of the *upload*
 * (empty/0 = ISO-8859-1, 1 = UTF-8). It says nothing about the response,
 * which Collmex encodes as it sees fit and declares in its `Content-Type`.
 *
 * This lives in the credential's `authenticate` function so that the node
 * never has to read the credentials itself.
 */
export function applyCollmexAuth(
	credentials: CollmexCredentials,
	requestOptions: IHttpRequestOptions,
): IHttpRequestOptions {
	const charset: BufferEncoding = credentials.charset === 'latin1' ? 'latin1' : 'utf8';

	const login = formatCsvRow([
		'LOGIN',
		credentials.username,
		credentials.password,
		charset === 'utf8' ? '1' : '0',
	]);

	// The node passes the query records as a string; everything else would be
	// a programming error rather than something to recover from.
	const records = typeof requestOptions.body === 'string' ? requestOptions.body : '';

	return {
		...requestOptions,
		// `url` is absolute, so any `baseURL` the caller set is dropped rather
		// than left to be combined with it.
		baseURL: undefined,
		url: buildUrl(credentials.customerId),
		body: Buffer.from(`${login}\n${records}`, charset),
	};
}
