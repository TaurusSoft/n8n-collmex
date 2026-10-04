import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { collmexRequest, extractRecords } from '../transport/client';

/**
 * Fills the group dropdowns from Collmex.
 *
 * These lists only need a number and a label, so they read the two columns
 * they want straight out of the response instead of going through a record
 * layout. Collmex sends well under a hundred of each, and there is no paging,
 * so each method is one query returning everything.
 *
 * Every dropdown costs an API call whenever the node is opened, which counts
 * against the 10,000 a day - acceptable for a handful of short lists, and the
 * reason none of these are refreshed on a timer.
 */

/** The value is kept as text, so an id of `0` stays selectable and comparable. */
function toOption(id: string, label: string): INodePropertyOptions {
	const trimmed = label.trim();

	return {
		// The number is shown alongside the label because Collmex itself shows
		// it that way, and queries elsewhere in the node take the number.
		name: trimmed === '' ? id : `${trimmed} (${id})`,
		value: id,
	};
}

function byName(options: INodePropertyOptions[]): INodePropertyOptions[] {
	return options.sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * The company to list for: the per-operation override if the user set one,
 * otherwise the credential's default.
 *
 * `getCurrentNodeParameter` reads what is on screen right now, which is what
 * makes the dropdown follow a company the user has just typed in.
 */
async function currentCompany(context: ILoadOptionsFunctions): Promise<string> {
	const override = context.getCurrentNodeParameter('options.companyId');

	if (override !== undefined && override !== null && override !== '') {
		return String(override);
	}

	const credentials = await context.getCredentials('collmexApi');

	return String(credentials.companyId ?? 1);
}

/**
 * `PRODUCT_GROUPS_GET` takes no arguments at all - not even a company, unlike
 * every other query in this package - and answers with `PRDGRP`: number,
 * description, and the parent group it sits under.
 */
export async function getProductGroups(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const rows = await collmexRequest.call(this, [['PRODUCT_GROUPS_GET']]);

	return byName(extractRecords(rows, 'PRDGRP').map((row) => toOption(row[1], row[2])));
}

/**
 * `ADDRESS_GROUPS_GET` likewise takes no arguments and answers with `ADRGRP`:
 * number and description.
 */
export async function getAddressGroups(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const rows = await collmexRequest.call(this, [['ADDRESS_GROUPS_GET']]);

	return byName(extractRecords(rows, 'ADRGRP').map((row) => toOption(row[1], row[2])));
}

/**
 * `PRICE_GROUPS_GET` wants the company, and takes a second field that decides
 * whether inactive groups come too - left blank here, since offering a group
 * that is switched off would only invite a query that returns nothing.
 *
 * The answer, `PRICE_GROUP`, keeps the number on field 3 and the description
 * on field 4. Field 2 is the company, which arrives as a coded enumeration
 * with the company name behind it rather than as a bare number.
 */
export async function getPriceGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await collmexRequest.call(this, [
		['PRICE_GROUPS_GET', await currentCompany(this), ''],
	]);

	return byName(extractRecords(rows, 'PRICE_GROUP').map((row) => toOption(row[2], row[3])));
}

/**
 * `EMPLOYEE_GET` takes an employee number, a company and a free text, and the
 * first and third are left empty to get everyone.
 *
 * `EMPLOYEE` has 24 fields of personal and bank data; this reads three of
 * them - the number on field 2, and the first and last name on 5 and 6 - since
 * a dropdown needs nothing else. The company on field 3 arrives as a coded
 * enumeration, like the one in `PRICE_GROUP`.
 */
export async function getEmployees(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await collmexRequest.call(this, [
		['EMPLOYEE_GET', '', await currentCompany(this), ''],
	]);

	return byName(
		extractRecords(rows, 'EMPLOYEE').map((row) =>
			toOption(row[1], `${row[4] ?? ''} ${row[5] ?? ''}`),
		),
	);
}

export const loadOptions = {
	getAddressGroups,
	getEmployees,
	getPriceGroups,
	getProductGroups,
};
