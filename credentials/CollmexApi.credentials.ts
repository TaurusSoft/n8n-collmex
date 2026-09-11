import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CollmexApi implements ICredentialType {
	name = 'collmexApi';

	displayName = 'Collmex API';

	// Link to your community node's README
	documentationUrl = 'https://github.com/org/-collmex?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			body: {
				token: '={{$credentials.accessToken}}',
			},
			qs: {
				token: '={{$credentials.accessToken}}',
			},
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.collmex.de',
			url: '/v1/user',
		},
	};
}
