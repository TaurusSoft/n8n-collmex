import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { userDescription } from './resources/user';
import { companyDescription } from './resources/company';

export class Collmex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Collmex',
		name: 'collmex',
		icon: { light: 'file:collmex.svg', dark: 'file:collmex.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Collmex API',
		defaults: {
			name: 'Collmex',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'collmexApi', required: true }],
		requestDefaults: {
			baseURL: 'https://www.collmex.de',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Company',
						value: 'company',
					},
				],
				default: 'user',
			},
			...userDescription,
			...companyDescription,
		],
	};
}
