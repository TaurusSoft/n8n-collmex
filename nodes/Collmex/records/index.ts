import type { IDataObject } from 'n8n-workflow';

import { assignField } from '../transport/coerce';
import { cmxdlv } from './cmxdlv';
import { cmxinv } from './cmxinv';
import { cmxknd } from './cmxknd';
import { cmxlif } from './cmxlif';
import { cmxord2 } from './cmxord2';
import { cmxqtn } from './cmxqtn';
import type { FieldScope, FieldSpec } from './types';

export type { FieldScope, FieldSpec } from './types';

export const recordLayouts: Record<string, FieldSpec[]> = {
	CMXDLV: cmxdlv,
	CMXINV: cmxinv,
	CMXKND: cmxknd,
	CMXLIF: cmxlif,
	'CMXORD-2': cmxord2,
	CMXQTN: cmxqtn,
};

/**
 * Turns one CSV row into a named, typed object.
 *
 * Pass a `scope` to keep only the header or only the line item half of a
 * document record; omit it to get everything flat.
 */
export function mapRecord(
	layout: FieldSpec[],
	row: string[],
	scope?: FieldScope,
): IDataObject {
	const result: IDataObject = {};

	// Field 1 holds the record type. It is how a row is recognised, not data
	// about the record, and `extractRecords` has already used it by this point -
	// so it is skipped rather than repeated on every item.
	for (let i = 1; i < row.length; i++) {
		const spec = layout[i];

		if (spec === undefined) {
			// Collmex returns more columns than it documents - CMXLIF comes back
			// with 42 fields against 41 in the spec. Pass the surplus through as
			// text instead of silently dropping data.
			if (scope !== 'position') {
				assignField(result, `field${i + 1}`, row[i], 'C');
			}
			continue;
		}

		if (scope !== undefined && (spec.scope ?? 'header') !== scope) continue;

		assignField(result, spec.name, row[i], spec.type);
	}

	return result;
}

/**
 * Folds the one-row-per-line-item layout of quotations, sales orders,
 * invoices and deliveries back into one object per document.
 *
 * Collmex repeats the header data on every row and keeps the rows of a
 * document together, so a change of document number starts a new document.
 */
export function groupDocuments(
	layout: FieldSpec[],
	rows: string[][],
	idIndex: number,
): IDataObject[] {
	const documents: IDataObject[] = [];
	let current: IDataObject | undefined;
	let currentId: string | undefined;

	for (const row of rows) {
		const id = row[idIndex];

		if (current === undefined || id !== currentId) {
			current = mapRecord(layout, row, 'header');
			current.positions = [];
			documents.push(current);
			currentId = id;
		}

		(current.positions as IDataObject[]).push(mapRecord(layout, row, 'position'));
	}

	return documents;
}
