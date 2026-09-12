import type { IExecuteFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { COLLMEX_BASE_URL } from './auth';
import { formatCsvRow, parseCsv } from './csv';

export { COLLMEX_BASE_URL, buildUrl } from './auth';
export type { CollmexCredentials } from './auth';

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
 * Serialises the query records; the LOGIN line is added by `authenticate`.
 *
 * Each record gets its own terminator rather than joining on one, so an
 * empty list yields an empty payload instead of a stray blank line.
 */
export function buildRecordPayload(records: string[][]): string {
	return records.map((record) => `${formatCsvRow(record)}\n`).join('');
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
 * Authentication is handled entirely by the credential's `authenticate`
 * function, which prepends the LOGIN record and fills in the real URL - the
 * customer number is part of it. That keeps credential handling out of the
 * node, so the placeholder URL below is expected to be replaced.
 */
export async function collmexRequest(
	this: IExecuteFunctions,
	records: string[][],
	itemIndex: number,
): Promise<string[][]> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'collmexApi', {
		method: 'POST',
		url: COLLMEX_BASE_URL,
		headers: { 'Content-Type': 'text/csv' },
		body: buildRecordPayload(records),
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
