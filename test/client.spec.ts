import { describe, expect, it } from 'vitest';

import type { CollmexCredentials } from '../nodes/Collmex/transport/auth';
import { applyCollmexAuth, buildUrl } from '../nodes/Collmex/transport/auth';
import {
	buildRecordPayload,
	extractMessages,
	extractRecords,
	findError,
	resolveResponseEncoding,
} from '../nodes/Collmex/transport/client';
import { parseCsv } from '../nodes/Collmex/transport/csv';
import { customerGetResponse, emptyResultResponse, loginErrorResponse } from './fixtures';

const credentials: CollmexCredentials = {
	customerId: '123456',
	username: 'apiuser',
	password: 'secret',
	companyId: 1,
	charset: 'utf8',
};

/** Runs the credential's authenticate step over a bare request. */
function authenticate(
	overrides: Partial<CollmexCredentials>,
	records: string[][],
): { url: string; body: Buffer } {
	const result = applyCollmexAuth({ ...credentials, ...overrides }, {
		url: 'https://www.collmex.de',
		method: 'POST',
		body: buildRecordPayload(records),
	});

	return { url: result.url, body: result.body as Buffer };
}

describe('buildUrl', () => {
	it('builds the data exchange endpoint', () => {
		expect(buildUrl('123456')).toBe('https://www.collmex.de/c.cmx?123456,0,data_exchange');
	});
});

describe('buildRecordPayload', () => {
	it('serialises records without a LOGIN line', () => {
		// The LOGIN record is added by the credential, not by the node.
		expect(buildRecordPayload([['CUSTOMER_GET', '', '1']])).toBe('CUSTOMER_GET;;1\n');
	});
});

describe('applyCollmexAuth', () => {
	it('fills in the customer specific endpoint', () => {
		expect(authenticate({}, []).url).toBe(
			'https://www.collmex.de/c.cmx?123456,0,data_exchange',
		);
	});

	it('puts the LOGIN record first', () => {
		const { body } = authenticate({}, [['CUSTOMER_GET', '', '1']]);

		expect(body.toString('utf8')).toBe('LOGIN;apiuser;secret;1\nCUSTOMER_GET;;1\n');
	});

	it('signals ISO-8859-1 with a 0 in the charset field', () => {
		const { body } = authenticate({ charset: 'latin1' }, []);

		expect(body.toString('latin1')).toBe('LOGIN;apiuser;secret;0\n');
	});

	it('encodes the body in the requested charset', () => {
		const records = [['CUSTOMER_GET', 'Müller']];

		const utf8 = authenticate({}, records).body;
		const latin1 = authenticate({ charset: 'latin1' }, records).body;

		// 'ü' is two bytes in UTF-8 and one in ISO-8859-1.
		expect(utf8.length).toBe(latin1.length + 1);
		expect(latin1.toString('latin1')).toContain('Müller');
	});

	it('does not add a second LOGIN record to a body that has one', () => {
		// The credential test builds its own, so authenticate must leave it be.
		const result = applyCollmexAuth(credentials, {
			url: 'https://www.collmex.de',
			method: 'POST',
			body: 'LOGIN;someone;else;1\nCUSTOMER_GET;;1\n',
		});

		expect((result.body as Buffer).toString('utf8')).toBe(
			'LOGIN;someone;else;1\nCUSTOMER_GET;;1\n',
		);
	});

	it('escapes a password containing the delimiter', () => {
		const body = authenticate({ password: 'pa;ss"word' }, []).body.toString('utf8');

		expect(body).toBe('LOGIN;apiuser;"pa;ss""word";1\n');
		// And it survives a round trip, so the password reaches Collmex intact.
		expect(parseCsv(body)[0][2]).toBe('pa;ss"word');
	});
});

describe('resolveResponseEncoding', () => {
	it('follows the Content-Type header', () => {
		expect(resolveResponseEncoding('text/csv; charset=ISO-8859-1')).toBe('latin1');
		expect(resolveResponseEncoding('text/csv; charset=UTF-8')).toBe('utf8');
		expect(resolveResponseEncoding('text/csv; charset=utf-8')).toBe('utf8');
	});

	it('falls back to ISO-8859-1, which is what Collmex actually sends', () => {
		expect(resolveResponseEncoding(undefined)).toBe('latin1');
		expect(resolveResponseEncoding('text/csv')).toBe('latin1');
	});
});

describe('messages', () => {
	it('reads the four-field success form', () => {
		const messages = extractMessages(parseCsv(customerGetResponse));

		expect(messages).toHaveLength(2);
		expect(messages[0]).toEqual({
			type: 'S',
			id: '208013',
			text: 'CUSTOMER_GET hat 2 Datensätze zurückgegeben',
			line: undefined,
		});
	});

	it('does not treat success messages as failures', () => {
		expect(findError(extractMessages(parseCsv(customerGetResponse)))).toBeUndefined();
		expect(findError(extractMessages(parseCsv(emptyResultResponse)))).toBeUndefined();
	});

	it('reads the five-field error form, including the line number', () => {
		const error = findError(extractMessages(parseCsv(loginErrorResponse)));

		expect(error?.id).toBe('101026');
		expect(error?.line).toBe('1');
		expect(error?.text).toContain('Nur für API');
	});
});

describe('extractRecords', () => {
	it('keeps only the requested record type', () => {
		const rows = extractRecords(parseCsv(customerGetResponse), 'CMXKND');

		expect(rows).toHaveLength(2);
		expect(rows.every((row) => row[0] === 'CMXKND')).toBe(true);
	});

	it('returns nothing when the result set is empty', () => {
		expect(extractRecords(parseCsv(emptyResultResponse), 'CMXINV')).toEqual([]);
	});
});
