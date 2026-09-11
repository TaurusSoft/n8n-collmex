/**
 * CSV per RFC 4180, but with `;` as the delimiter - the dialect the Collmex
 * data exchange API speaks in both directions.
 *
 * Written by hand instead of pulling in a parser dependency: the dialect is
 * small, and community node packages ship their dependencies into every n8n
 * instance that installs them.
 */

/** Splits a Collmex CSV response into rows of raw, still untyped fields. */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	// Tells a genuinely empty trailing line apart from a record whose only
	// field is empty (a line containing just `""`).
	let started = false;

	const endField = () => {
		row.push(field);
		field = '';
	};

	const endRow = () => {
		endField();
		rows.push(row);
		row = [];
		started = false;
	};

	for (let i = 0; i < text.length; i++) {
		const char = text[i];

		if (quoted) {
			if (char !== '"') {
				field += char;
			} else if (text[i + 1] === '"') {
				// `""` is an escaped quote inside a quoted field.
				field += '"';
				i++;
			} else {
				quoted = false;
			}
			continue;
		}

		// Line endings are `\n` or `\r\n`; the `\n` is what closes the row.
		if (char === '\r') continue;

		started = true;

		if (char === '"') {
			quoted = true;
		} else if (char === ';') {
			endField();
		} else if (char === '\n') {
			endRow();
		} else {
			field += char;
		}
	}

	if (started) endRow();

	return rows;
}

/** Serialises one record, quoting only the fields that actually need it. */
export function formatCsvRow(fields: string[]): string {
	return fields
		.map((value) => (/[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value))
		.join(';');
}
