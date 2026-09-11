import type { CollmexFieldType } from '../transport/coerce';

/**
 * Document record types (quotation, sales order, invoice, delivery) send one
 * CSV row per line item, repeating the header data on every row. `scope`
 * says which half a field belongs to so the rows can be folded back into one
 * document with a `positions` array.
 *
 * Fields without a `scope` count as header data.
 */
export type FieldScope = 'header' | 'position';

export interface FieldSpec {
	name: string;
	type: CollmexFieldType;
	scope?: FieldScope;
}

/** Shorthand for a header field, which is the common case. */
export function header(name: string, type: CollmexFieldType): FieldSpec {
	return { name, type };
}

/** Shorthand for a line item field. */
export function position(name: string, type: CollmexFieldType): FieldSpec {
	return { name, type, scope: 'position' };
}
