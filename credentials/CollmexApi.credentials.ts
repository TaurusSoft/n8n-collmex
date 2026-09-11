import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Collmex authenticates through the first line of the uploaded CSV
 * (`LOGIN;user;password;charset`), not through a header, query parameter or
 * basic auth. There is therefore no `authenticate` block here - an
 * `IAuthenticateGeneric` would attach the credentials in the wrong place.
 * The node builds the LOGIN record itself and validates the credentials via
 * `methods.credentialTest`.
 */
export class CollmexApi implements ICredentialType {
	name = 'collmexApi';

	displayName = 'Collmex API';

	icon: Icon = {
		light: 'file:../nodes/Collmex/collmex.svg',
		dark: 'file:../nodes/Collmex/collmex.dark.svg',
	};

	documentationUrl = 'https://github.com/martinhey/n8n-collmex?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Customer Number',
			name: 'customerId',
			type: 'string',
			required: true,
			default: '',
			placeholder: '191726',
			description:
				'Your Collmex customer or tenant number. It forms part of the API endpoint URL.',
		},
		{
			displayName: 'User',
			name: 'username',
			type: 'string',
			required: true,
			default: '',
			description:
				'A Collmex user that has the "Nur für API" flag set (Administration > Users). The interactive login cannot be used for the API. Extra users with this flag are free of charge.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Company ID',
			name: 'companyId',
			type: 'number',
			default: 1,
			description:
				'Internal number of the company to query by default, as shown under Administration > Company. Individual operations can override this.',
		},
		{
			displayName: 'Request Character Set',
			name: 'charset',
			type: 'options',
			default: 'utf8',
			options: [
				{ name: 'ISO-8859-1', value: 'latin1' },
				{ name: 'UTF-8', value: 'utf8' },
			],
			description:
				'Character set used for data sent to Collmex. Responses are decoded from whatever Collmex declares in its Content-Type header, independently of this setting.',
		},
	];
}
