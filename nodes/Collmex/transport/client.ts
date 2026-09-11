import type { IExecuteFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { formatCsvRow, parseCsv } from './csv';

export const COLLMEX_BASE_URL = 'https://www.collmex.de';

export interface CollmexCredentials {
	customerId: string;
	username: string;
	password: string;
	companyId: number;
	charset: 'utf8' | 'latin1';
}

/**
 * A `MESSAGE` record from a Collmex response.
 *
 * The layout is `MESSAGE;<type>;<id>;<text>[;<line>]` - the trailing line
 * number is only present on errors, so the record length varies.
 */
export interface CollmexMessage {
	type: string;
	id: string;
	text: string;
	line?: string;
}

export const MESSAGE_RECORD = 'MESSAGE';

/** Records Collmex adds to a response that are protocol, not payload. */
const PROTOCOL_RECORDS = [MESSAGE_RECORD, 'NEW_OBJECT_ID'];

/**
 * Builds the request body: the mandatory `LOGIN` record followed by the
 * query records.
 *
 * Field 4 of `LOGIN` selects the character set of the *upload*
 * (empty/0 = ISO-8859-1, 1 = UTF-8).
 */
export function buildRequestBody(
	credentials: CollmexCredentials,
	records: string[][],
): Buffer {
	const login = formatCsvRow([
		'LOGIN',
		credentials.username,
		credentials.password,
		credentials.charset === 'utf8' ? '1' : '0',
	]);

	const body = [login, ...records.map(formatCsvRow)].join('\n') + '\n';

	return Buffer.from(body, credentials.charset);
}

export function buildUrl(customerId: string): string {
	return `${COLLMEX_BASE_URL}/c.cmx?${customerId},0,data_exchange`;
}

/**
 * Picks the encoding for the *response*.
 *
 * This deliberately ignores the credential setting: Collmex answers in
 * ISO-8859-1 even when the upload announced UTF-8, but it always declares
 * what it sent in the `Content-Type` header.
 */
export function resolveResponseEncoding(contentType?: string): BufferEncoding {
	const charset = /charset=([\w-]+)/i.exec(contentType ?? '')?.[1]?.toLowerCase();

	if (charset === 'utf-8' || charset === 'utf8') return 'utf8';

	return 'latin1';
}

export function extractMessages(rows: string[][]): CollmexMessage[] {
	return rows
		.filter((row) => row[0] === MESSAGE_RECORD)
		.map((row) => ({
			type: row[1] ?? '',
			id: row[2] ?? '',
			text: row[3] ?? '',
			line: row[4],
		}));
}

/** Strips protocol records, leaving only the data rows. */
export function extractRecords(rows: string[][], recordType: string): string[][] {
	return rows.filter((row) => row[0] === recordType);
}

export function hasUnknownRecords(rows: string[][], recordType: string): boolean {
	return rows.some(
		(row) =>
			row[0] !== '' &&
			row[0] !== recordType &&
			!PROTOCOL_RECORDS.includes(row[0]),
	);
}

/**
 * Collmex reports failures as a `MESSAGE;E;...` record with HTTP 200, so the
 * status code says nothing. Only type `E` is an error - a successful query
 * also returns `MESSAGE;S;...` records.
 */
export function findError(messages: CollmexMessage[]): CollmexMessage | undefined {
	return messages.find((message) => message.type === 'E');
}

export function toApiError(
	context: IExecuteFunctions,
	error: CollmexMessage,
	itemIndex: number,
): NodeApiError {
	return new NodeApiError(
		context.getNode(),
		{ message: error.text, code: error.id } as JsonObject,
		{
			message: error.text,
			description: `Collmex message ${error.id}`,
			itemIndex,
		},
	);
}

/**
 * Sends records to the Collmex data exchange endpoint and returns the parsed
 * response rows.
 *
 * The credentials travel inside the request body, which is why this node is
 * programmatic: n8n's declarative authentication can only put credentials
 * into headers, query strings or basic auth.
 */
export async function collmexRequest(
	this: IExecuteFunctions,
	records: string[][],
	itemIndex: number,
): Promise<string[][]> {
	const credentials = (await this.getCredentials('collmexApi')) as unknown as CollmexCredentials;

	// `httpRequestWithAuthentication` applies the credential's `authenticate`
	// block, which can only place credentials in headers, the query string or
	// basic auth. Collmex needs them as the first CSV record of the request
	// body, so the LOGIN record is built here and the plain helper is used.
	// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: buildUrl(credentials.customerId),
		headers: { 'Content-Type': 'text/csv' },
		body: buildRequestBody(credentials, records),
		encoding: 'arraybuffer',
		returnFullResponse: true,
	});

	const contentType = (response.headers as Record<string, string | undefined>)?.[
		'content-type'
	];
	const text = Buffer.from(response.body as ArrayBuffer).toString(
		resolveResponseEncoding(contentType),
	);

	const rows = parseCsv(text);
	const error = findError(extractMessages(rows));

	if (error !== undefined) {
		throw toApiError(this, error, itemIndex);
	}

	return rows;
}
