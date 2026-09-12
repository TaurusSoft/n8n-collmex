import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { groupDocuments, mapRecord, recordLayouts } from './records';
import { resourceDescriptions, resourceHandlers } from './resources';
import { collmexRequest, extractRecords } from './transport/client';

export class Collmex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Collmex',
		name: 'collmex',
		icon: { light: 'file:collmex.svg', dark: 'file:collmex.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read customers, vendors and sales documents from Collmex',
		defaults: {
			name: 'Collmex',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'collmexApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Customer', value: 'customer' },
					{ name: 'Delivery', value: 'delivery' },
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Quotation', value: 'quotation' },
					{ name: 'Sales Order', value: 'salesOrder' },
					{ name: 'Vendor', value: 'vendor' },
				],
				default: 'customer',
			},
			...resourceDescriptions,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				const handler = resourceHandlers[resource];
				if (handler === undefined) {
					throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
						itemIndex: i,
					});
				}

				const query = await handler.buildQuery(this, i);
				const rows = await collmexRequest.call(this, [query], i);

				const layout = recordLayouts[handler.resultType];
				const dataRows = extractRecords(rows, handler.resultType);

				// Document record types spread one document over several rows,
				// one per line item, with the header data repeated on each.
				const group =
					handler.documentIdIndex !== undefined &&
					(this.getNodeParameter('groupPositions', i, true) as boolean);

				let results: IDataObject[] = group
					? groupDocuments(layout, dataRows, handler.documentIdIndex as number)
					: dataRows.map((row) => mapRecord(layout, row));

				if (operation === 'getAll' && !(this.getNodeParameter('returnAll', i) as boolean)) {
					// Collmex has no server-side paging, so this trims after the fact.
					results = results.slice(0, this.getNodeParameter('limit', i) as number);
				}

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}

				// Failures the API itself reported already arrive as NodeApiError
				// from `collmexRequest`; anything else is a configuration or
				// runtime problem on our side.
				throw error instanceof NodeApiError || error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
