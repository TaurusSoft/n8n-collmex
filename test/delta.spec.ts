import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { resourceHandlers } from '../nodes/Collmex/resources';
import { buildDeltaQuery } from '../nodes/Collmex/resources/shared';

/**
 * Minimal stand-in for the execution context, answering a `getAll` with only
 * the incremental options set - the same thing `buildDeltaQuery` produces.
 */
function deltaContext(companyId: number, systemName: string): IExecuteFunctions {
	const parameters: IDataObject = {
		operation: 'getAll',
		options: { companyId, onlyChanged: true, systemName },
	};

	return {
		getNode: () => ({ name: 'Collmex', type: 'collmex', typeVersion: 1 }),
		getCredentials: async () => ({ companyId }),
		getNodeParameter(name: string, _index: number, fallback?: unknown) {
			if (name in parameters) return parameters[name];
			if (fallback !== undefined) return fallback;

			throw new Error(`test context: unexpected parameter "${name}"`);
		},
	} as unknown as IExecuteFunctions;
}

const withDelta = Object.entries(resourceHandlers).filter(
	([, handler]) => handler.delta !== undefined,
);

describe('delta query specs', () => {
	it('covers every resource', () => {
		// The trigger can only serve a resource that declares one, so a resource
		// added without a spec would silently never fire.
		expect(withDelta).toHaveLength(Object.keys(resourceHandlers).length);
	});

	it.each(withDelta.map(([name]) => name))(
		'%s builds the same row as its own buildQuery',
		async (name) => {
			// This is the guard against drift: the spec repeats field numbers that
			// also sit in the resource's buildQuery, and nothing else would notice
			// if one of them were changed and the other not.
			const handler = resourceHandlers[name];
			const built = await handler.buildQuery(deltaContext(7, 'n8n-test'), 0);

			expect(buildDeltaQuery(handler.delta!, 7, 'n8n-test')).toEqual(built);
		},
	);

	it('asks only for changes, and names the system', () => {
		const row = buildDeltaQuery(resourceHandlers.invoice.delta!, 1, 'n8n');
		const spec = resourceHandlers.invoice.delta!;

		expect(row[0]).toBe(spec.queryName);
		expect(row).toHaveLength(spec.fieldCount);
		expect(row[spec.companyField - 1]).toBe('1');
		expect(row[spec.onlyChangedField - 1]).toBe('1');
		expect(row[spec.systemNameField - 1]).toBe('n8n');
	});

	it('leaves every other field blank', () => {
		const spec = resourceHandlers.customer.delta!;
		const row = buildDeltaQuery(spec, 1, 'n8n');
		const used = [spec.companyField, spec.onlyChangedField, spec.systemNameField];

		for (let field = 2; field <= spec.fieldCount; field++) {
			if (used.includes(field)) continue;

			expect(row[field - 1], `field ${field} should be blank`).toBe('');
		}
	});
});
