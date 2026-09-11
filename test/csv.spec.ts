import { describe, expect, it } from 'vitest';

import { formatCsvRow, parseCsv } from '../nodes/Collmex/transport/csv';

describe('parseCsv', () => {
	it('splits on semicolons', () => {
		expect(parseCsv('A;B;C\n')).toEqual([['A', 'B', 'C']]);
	});

	it('keeps a semicolon inside a quoted field', () => {
		expect(parseCsv('A;"x;y";C\n')).toEqual([['A', 'x;y', 'C']]);
	});

	it('unescapes a doubled quote', () => {
		expect(parseCsv('A;"say ""hi""";C\n')).toEqual([['A', 'say "hi"', 'C']]);
	});

	it('keeps a newline inside a quoted field', () => {
		expect(parseCsv('A;"one\ntwo"\n')).toEqual([['A', 'one\ntwo']]);
	});

	it('handles CRLF line endings', () => {
		expect(parseCsv('A;B\r\nC;D\r\n')).toEqual([
			['A', 'B'],
			['C', 'D'],
		]);
	});

	it('does not emit a trailing empty row', () => {
		expect(parseCsv('A;B\n')).toHaveLength(1);
	});

	it('parses a final row without a line break', () => {
		expect(parseCsv('A;B')).toEqual([['A', 'B']]);
	});

	it('keeps trailing empty fields', () => {
		expect(parseCsv('A;;\n')).toEqual([['A', '', '']]);
	});

	it('returns nothing for empty input', () => {
		expect(parseCsv('')).toEqual([]);
	});
});

describe('formatCsvRow', () => {
	it('leaves plain values unquoted', () => {
		expect(formatCsvRow(['CUSTOMER_GET', '', '1'])).toBe('CUSTOMER_GET;;1');
	});

	it('quotes values containing the delimiter, a quote or a newline', () => {
		expect(formatCsvRow(['a;b'])).toBe('"a;b"');
		expect(formatCsvRow(['say "hi"'])).toBe('"say ""hi"""');
		expect(formatCsvRow(['one\ntwo'])).toBe('"one\ntwo"');
	});

	it('round trips through the parser', () => {
		const row = ['CMXKND', 'a;b', 'say "hi"', 'plain', ''];

		expect(parseCsv(`${formatCsvRow(row)}\n`)[0]).toEqual(row);
	});
});
