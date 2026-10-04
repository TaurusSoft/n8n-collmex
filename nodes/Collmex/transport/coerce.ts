import type { IDataObject } from 'n8n-workflow';

/**
 * Collmex field types, as used in the record layout documentation:
 * C = text, I = integer or coded enumeration, N = decimal (max 3 places),
 * M = monetary amount (2 places), D = date.
 */
export type CollmexFieldType = 'C' | 'I' | 'N' | 'M' | 'D';

/**
 * When exporting coded enumerations Collmex appends the plain-text label
 * behind the number, e.g. `1 Max Mustermann`, `0 30 Tage ohne Abzug` or `0 19%`.
 * Splitting that apart is required, not cosmetic - `Number('1 Max Mustermann')`
 * is `NaN`.
 */
const CODED_ENUM = /^(-?\d+)\s+(\S.*)$/;

/**
 * Where an amount cannot exist at all Collmex writes this constant instead of
 * leaving the field empty - the available stock of a service product, which
 * cannot hold stock, is the documented case.
 *
 * It is only honoured on the `N` and `M` amount types, deliberately: those are
 * the ones Collmex documents it for, and reading it as "no value" everywhere
 * would mean a text field could never legitimately contain the string.
 */
const NULL_SENTINEL = '(NULL)';

/** `2056,34` - Collmex writes decimals with a German comma. */
function parseDecimal(value: string): number | undefined {
	const normalised = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
	const parsed = Number(normalised);

	return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The docs specify `JJJJMMTT` for imports, but exports come back as
 * `TT.MM.JJJJ`. Accept both and normalise to ISO so downstream nodes can
 * sort and compare dates.
 */
function parseDate(value: string): string {
	const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
	if (dotted) {
		return `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`;
	}

	const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
	if (compact) {
		return `${compact[1]}-${compact[2]}-${compact[3]}`;
	}

	return value;
}

/**
 * Writes one CSV field onto `target` under `name`, converted to its Collmex
 * type. Empty fields are omitted entirely rather than emitted as `null`, so
 * the output only carries what Collmex actually filled in.
 *
 * For `I` fields carrying a label the label is emitted alongside as
 * `<name>Label`.
 */
export function assignField(
	target: IDataObject,
	name: string,
	raw: string,
	type: CollmexFieldType,
): void {
	const value = raw.trim();
	if (value === '') return;

	switch (type) {
		case 'C':
			// Kept untrimmed: text fields may carry meaningful whitespace, and
			// leading zeroes matter (a postal code arrives as `01069`).
			target[name] = raw;
			return;

		case 'I': {
			const coded = CODED_ENUM.exec(value);
			if (coded) {
				target[name] = Number(coded[1]);
				target[`${name}Label`] = coded[2].trim();
				return;
			}

			const parsed = Number(value);
			target[name] = Number.isFinite(parsed) ? parsed : value;
			return;
		}

		case 'N':
		case 'M':
			// Only the amount types are read as "no value": that is where
			// Collmex documents the constant and where it was observed. A text
			// field holding `(NULL)` is kept, because there it could be content.
			if (value === NULL_SENTINEL) return;

			target[name] = parseDecimal(value) ?? value;
			return;

		case 'D':
			target[name] = parseDate(value);
			return;
	}
}
