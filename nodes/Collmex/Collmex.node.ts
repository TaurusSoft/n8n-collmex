import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { groupDocuments, mapRecord, recordLayouts } from './records';
import { resourceDescriptions, resourceHandlers } from './resources';
import type { CollmexCredentials } from './transport/client';
import {
	buildRequestBody,
	buildUrl,
	collmexRequest,
	extractMessages,
	extractRecords,
	findError,
	resolveResponseEncoding,
} from './transport/client';
import { parseCsv } from './transport/csv';

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
		credentials: [{ name: 'collmexApi', required: true, testedBy: 'collmexApiTest' }],
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

	methods = {
		credentialTest: {
			/**
			 * Collmex answers a bad login with HTTP 200 and a `MESSAGE;E;...`
			 * record, so the credentials have to be checked by reading the
			 * response rather than by looking at the status code.
			 */
			async collmexApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as unknown as CollmexCredentials;

				try {
					// `ICredentialTestFunctions` only exposes the deprecated
					// `request` helper - `httpRequest` is not available on this
					// context, so there is nothing to migrate to here.
					// eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions
					const response = await this.helpers.request({
						method: 'POST',
						uri: buildUrl(credentials.customerId),
						headers: { 'Content-Type': 'text/csv' },
						body: buildRequestBody(credentials, [
							['CUSTOMER_GET', '', String(credentials.companyId ?? 1)],
						]),
						encoding: null,
						resolveWithFullResponse: true,
					});

					const contentType = (response.headers as Record<string, string | undefined>)?.[
						'content-type'
					];
					const text = Buffer.from(response.body as Buffer).toString(
						resolveResponseEncoding(contentType),
					);

					const error = findError(extractMessages(parseCsv(text)));

					if (error !== undefined) {
						return { status: 'Error', message: error.text };
					}

					return { status: 'OK', message: 'Connection successful' };
				} catch (error) {
					return { status: 'Error', message: (error as Error).message };
				}
			},
		},
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
