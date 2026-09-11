import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import type { CollmexFieldType } from '../nodes/Collmex/transport/coerce';
import { assignField } from '../nodes/Collmex/transport/coerce';

function coerce(raw: string, type: CollmexFieldType): IDataObject {
	const target: IDataObject = {};
	assignField(target, 'v', raw, type);

	return target;
}

describe('assignField', () => {
	it('omits empty and whitespace-only fields instead of emitting null', () => {
		expect(coerce('', 'C')).toEqual({});
		expect(coerce('   ', 'I')).toEqual({});
		expect(coerce('', 'D')).toEqual({});
	});

	describe('text', () => {
		it('preserves leading zeroes', () => {
			// A postal code parsed as a number would turn 01069 into 1069.
			expect(coerce('01069', 'C')).toEqual({ v: '01069' });
		});

		it('keeps digit-only text as text', () => {
			expect(coerce('10000', 'C')).toEqual({ v: '10000' });
		});
	});

	describe('coded enumerations', () => {
		it('splits the label Collmex appends behind the number', () => {
			expect(coerce('1 Max Mustermann', 'I')).toEqual({ v: 1, vLabel: 'Max Mustermann' });
			expect(coerce('0 30 Tage ohne Abzug', 'I')).toEqual({
				v: 0,
				vLabel: '30 Tage ohne Abzug',
			});
			expect(coerce('0 19%', 'I')).toEqual({ v: 0, vLabel: '19%' });
			expect(coerce('50 Geliefert', 'I')).toEqual({ v: 50, vLabel: 'Geliefert' });
		});

		it('treats a number with a trailing space as a plain number', () => {
			expect(coerce('0 ', 'I')).toEqual({ v: 0 });
		});

		it('handles negative numbers', () => {
			expect(coerce('-10000', 'I')).toEqual({ v: -10000 });
		});

		it('falls back to text when a field is not numeric at all', () => {
			expect(coerce('not a number', 'I')).toEqual({ v: 'not a number' });
		});
	});

	describe('decimals', () => {
		it('reads the German decimal comma', () => {
			expect(coerce('2056,34', 'M')).toEqual({ v: 2056.34 });
			expect(coerce('5,25', 'N')).toEqual({ v: 5.25 });
		});

		it('reads thousands separators', () => {
			expect(coerce('1.234.567,89', 'M')).toEqual({ v: 1234567.89 });
		});

		it('reads a plain integer', () => {
			expect(coerce('42', 'M')).toEqual({ v: 42 });
		});

		it('handles negative amounts', () => {
			expect(coerce('-19,99', 'M')).toEqual({ v: -19.99 });
		});
	});

	describe('dates', () => {
		it('normalises both documented formats to ISO', () => {
			// The docs specify JJJJMMTT for imports; exports come back TT.MM.JJJJ.
			expect(coerce('20090121', 'D')).toEqual({ v: '2009-01-21' });
			expect(coerce('21.01.2009', 'D')).toEqual({ v: '2009-01-21' });
			expect(coerce('11.09.2026', 'D')).toEqual({ v: '2026-09-11' });
		});

		it('pads single digit days and months', () => {
			expect(coerce('1.9.2026', 'D')).toEqual({ v: '2026-09-01' });
		});

		it('passes an unrecognised value through unchanged', () => {
			expect(coerce('sometime', 'D')).toEqual({ v: 'sometime' });
		});
	});
});
