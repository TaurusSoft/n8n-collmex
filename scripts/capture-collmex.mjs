#!/usr/bin/env node

/**
 * Talks to a live Collmex tenant so the record layouts and query field numbers
 * in this package can be checked against the API instead of against the
 * documentation.
 *
 * This exists because a field position is not something a test can discover on
 * its own: a wrong offset silently shifts every following value onto the wrong
 * name, and the documentation has been wrong before - CMXLIF returns 42 fields
 * where it lists 41. Every fixture in `test/fixtures.ts` was taken with this,
 * so anyone reviewing a layout can reproduce the capture rather than trust it.
 *
 * Credentials come from the environment, never from a file or an argument:
 *
 *   COLLMEX_CUSTOMER   customer number - it is part of the endpoint URL
 *   COLLMEX_USER       name of the API user ('Nur für API' must be set on it)
 *   COLLMEX_PASSWORD   its password
 *   COLLMEX_COMPANY    company number, optional, defaults to 1
 *
 * The shorter CMX_* names are accepted too, since that is what the capture
 * sessions used.
 *
 * Usage:
 *   node scripts/capture-collmex.mjs --suite stock
 *   node scripts/capture-collmex.mjs --suite stock --out test/captures
 *   node scripts/capture-collmex.mjs --suite stock --dry-run
 *   node scripts/capture-collmex.mjs 'STOCK_GET;1;;;;;;;'
 *
 * `--dry-run` prints the query rows and sends nothing, so the field positions
 * can be read without a tenant or credentials.
 *
 * A suite is a named list of queries with what each one is expected to return,
 * so running it is a check and not just a dump. Raw query rows are the escape
 * hatch for exploring something a suite does not cover yet.
 *
 * Nothing here writes to the tenant. The delta probes do make Collmex store a
 * "last queried" timestamp under the system name they pass, which is visible
 * under Verwaltung -> Daten and harmless.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ENDPOINT = 'https://www.collmex.de/c.cmx';

/** Reads a credential, accepting either naming convention. */
function fromEnv(name, fallback) {
	const value = process.env[`COLLMEX_${name}`] ?? process.env[`CMX_${name}`];

	if (value === undefined || value === '') {
		if (fallback !== undefined) return fallback;

		throw new Error(`Set COLLMEX_${name} (or CMX_${name}) before running this.`);
	}

	return value;
}

/** `JJJJMMTT`, the format Collmex wants for a date field. */
function collmexDate(offsetDays = 0) {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);

	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, '0'),
		String(date.getDate()).padStart(2, '0'),
	].join('');
}

/**
 * Picks the encoding for the response.
 *
 * Requests always go out as UTF-8, but that says nothing about what comes back:
 * Collmex has answered in ISO-8859-1 throughout and declares what it sent, so
 * the header decides. This mirrors `transport/client.ts` on purpose - if the
 * two ever disagree, the capture is not what the node would have seen.
 */
function responseEncoding(contentType) {
	const charset = /charset=([\w-]+)/i.exec(contentType ?? '')?.[1]?.toLowerCase();

	return charset === 'utf-8' || charset === 'utf8' ? 'utf8' : 'latin1';
}

async function send(credentials, queryRow) {
	// Field 4 of LOGIN announces the charset of the upload; 1 = UTF-8.
	const login = `LOGIN;${credentials.user};${credentials.password};1`;
	const body = Buffer.from(`${login}\n${queryRow}\n`, 'utf8');

	const response = await fetch(`${ENDPOINT}?${credentials.customer},0,data_exchange`, {
		method: 'POST',
		headers: { 'Content-Type': 'text/csv' },
		body,
	});

	const buffer = Buffer.from(await response.arrayBuffer());
	const encoding = responseEncoding(response.headers.get('content-type'));
	const text = buffer.toString(encoding);

	// Collmex separates records with CRLF but may use a bare LF inside a quoted
	// field, so this only splits well enough to count and classify records. The
	// real parsing lives in `transport/csv.ts`; captures are written verbatim.
	const lines = text.split(/\r\n/).filter((line) => line !== '');

	return {
		text,
		encoding,
		data: lines.filter((line) => !line.startsWith('MESSAGE;')),
		errors: lines.filter((line) => line.startsWith('MESSAGE;E;')),
	};
}

/**
 * The queries behind the Stock and Stock Availability fixtures, plus a probe
 * per filter so the field numbers are backed by the API and not just by the
 * documentation.
 *
 * `expect` is prose for a human to read next to the result - this is a
 * reproducible capture, not an assertion suite. Where a result contradicted the
 * documentation it is said so here, so a reviewer sees the surprise rather than
 * having to notice it.
 */
function stockSuite(company) {
	const stockGet = (fields = {}) =>
		[
			'STOCK_GET',
			company,
			fields.product ?? '',
			fields.productGroup ?? '',
			fields.text ?? '',
			fields.stockType ?? '',
			fields.onlyChanged ?? '',
			fields.systemName ?? '',
			fields.asOfDate ?? '',
		].join(';');

	return [
		{
			label: 'CMXSTK',
			query: stockGet(),
			expect: 'every stock record of the company - the Stock fixture',
			capture: true,
		},
		{
			label: 'STOCK_AVAILABLE',
			query: ['STOCK_AVAILABLE_GET', company, '', '', ''].join(';'),
			expect: 'one record per product - the Stock Availability fixture',
			capture: true,
		},
		{
			label: 'filter-stock-type-free',
			query: stockGet({ stockType: '0' }),
			expect:
				'free stock only. A 0 must survive here, which is why the node writes field 6 directly instead of through setField',
		},
		{
			label: 'filter-stock-type-blocked',
			query: stockGet({ stockType: '1' }),
			expect: 'blocked stock only',
		},
		{
			label: 'filter-product-group',
			query: stockGet({ productGroup: '1' }),
			expect: 'the records of products in group 1',
		},
		{
			label: 'filter-product-group-unknown',
			query: stockGet({ productGroup: '999' }),
			expect:
				'an ERROR, message 100102 - an unknown group fails the whole query rather than returning nothing',
			expectError: true,
		},
		{
			label: 'filter-text-hit',
			query: stockGet({ text: 'Kabel' }),
			expect: 'the records whose product matches the text',
		},
		{
			label: 'filter-text-miss',
			query: stockGet({ text: 'Zzz' }),
			expect: 'nothing',
		},
		{
			label: 'filter-as-of-yesterday',
			query: stockGet({ asOfDate: collmexDate(-1) }),
			expect: 'the stock as of the start of yesterday',
		},
		{
			label: 'filter-as-of-today',
			query: stockGet({ asOfDate: collmexDate(0) }),
			expect:
				'NOT the current stock. The as-of date reports the stock at the start of the day, so movements booked today are missing - passing today is not the same as omitting the field',
		},
		{
			label: 'filter-delta-first',
			query: stockGet({ onlyChanged: '1', systemName: 'n8n-verify' }),
			expect: 'everything changed since the previous run under this system name',
		},
		{
			label: 'filter-delta-second',
			query: stockGet({ onlyChanged: '1', systemName: 'n8n-verify' }),
			expect: 'nothing - the run above just moved the cursor',
		},
		{
			label: 'filter-single-product-availability',
			query: ['STOCK_AVAILABLE_GET', company, '1', '', ''].join(';'),
			expect: 'the availability of product 1 alone',
		},
	];
}

const suites = { stock: stockSuite };

function parseArgs(argv) {
	const options = { suite: undefined, out: undefined, dryRun: false, rows: [] };

	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--suite') options.suite = argv[++i];
		else if (argv[i] === '--out') options.out = argv[++i];
		else if (argv[i] === '--dry-run') options.dryRun = true;
		else options.rows.push(argv[i]);
	}

	return options;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));

	if (options.suite === undefined && options.rows.length === 0) {
		console.error(
			[
				'Usage:',
				'  node scripts/capture-collmex.mjs --suite <name> [--out <dir>] [--dry-run]',
				"  node scripts/capture-collmex.mjs '<QUERY_ROW>' ['<QUERY_ROW>' ...]",
				'',
				`Suites: ${Object.keys(suites).join(', ')}`,
				'',
				'--dry-run prints the query rows without sending them, and needs no credentials.',
			].join('\n'),
		);
		process.exitCode = 2;

		return;
	}

	// Checked before the credentials, so a mistyped suite name does not first
	// send you looking for an environment variable.
	if (options.suite !== undefined && suites[options.suite] === undefined) {
		throw new Error(`Unknown suite "${options.suite}". Known: ${Object.keys(suites).join(', ')}`);
	}

	// A dry run needs no tenant, which is the point: it lets someone without
	// Collmex access read the field positions the node actually sends.
	const credentials = options.dryRun
		? undefined
		: {
				customer: fromEnv('CUSTOMER'),
				user: fromEnv('USER'),
				password: fromEnv('PASSWORD'),
			};
	const company = fromEnv('COMPANY', '1');

	const queries =
		options.suite !== undefined
			? suites[options.suite](company)
			: options.rows.map((query, index) => ({ label: `query-${index + 1}`, query }));

	if (options.out !== undefined) await mkdir(options.out, { recursive: true });

	let unexpectedErrors = 0;

	for (const item of queries) {
		if (options.dryRun) {
			console.log(`### ${item.label}`);
			console.log(`    query    : ${item.query}`);
			if (item.expect !== undefined) console.log(`    expected : ${item.expect}`);
			console.log('');
			continue;
		}

		// Sequentially and never in parallel: Collmex allows five concurrent
		// calls per user and asks for the previous one to finish first.
		const result = await send(credentials, item.query);

		console.log(`### ${item.label}`);
		console.log(`    query    : ${item.query}`);
		if (item.expect !== undefined) console.log(`    expected : ${item.expect}`);
		console.log(`    charset  : ${result.encoding}`);
		console.log(`    records  : ${result.data.length}`);
		for (const line of result.data) console.log(`    > ${line}`);
		for (const line of result.errors) console.log(`    !! ${line}`);
		console.log('');

		if (result.errors.length > 0 && item.expectError !== true) unexpectedErrors++;

		if (options.out !== undefined && (item.capture === true || options.suite === undefined)) {
			const file = join(options.out, `${item.label}.csv`);
			await writeFile(file, result.text, 'utf8');
			console.log(`    saved ${file}\n`);
		}
	}

	// An unexpected error record means the capture is not usable, and Collmex
	// reports those with HTTP 200 - so the exit code has to come from the body.
	if (unexpectedErrors > 0) {
		console.error(`${unexpectedErrors} query/queries returned an unexpected error record.`);
		process.exitCode = 1;
	}
}

try {
	await main();
} catch (error) {
	// A missing environment variable or a mistyped suite is a usage mistake, not
	// something a stack trace helps with.
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
