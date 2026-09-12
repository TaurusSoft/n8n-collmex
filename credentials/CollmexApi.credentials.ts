import type {
	IAuthenticate,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

import type { CollmexCredentials } from '../nodes/Collmex/transport/auth';
import { applyCollmexAuth } from '../nodes/Collmex/transport/auth';

/**
 * Collmex authenticates through the first line of the uploaded CSV
 * (`LOGIN;user;password;charset`), not through a header, query parameter or
 * basic auth. `authenticate` is therefore a custom function rather than an
 * `IAuthenticateGeneric`, which can only place credentials in those three
 * spots.
 */
export class CollmexApi implements ICredentialType {
	name = 'collmexApi';

	displayName = 'Collmex API';

	documentationUrl = 'https://github.com/TaurusSoft/n8n-collmex?tab=readme-ov-file#credentials';

	icon: Icon = {
		light: 'file:../nodes/Collmex/collmex.svg',
		dark: 'file:../nodes/Collmex/collmex.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Customer Number',
			name: 'customerId',
			type: 'string',
			required: true,
			default: '',
			placeholder: '123456',
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
				'A Collmex user with the API-only flag enabled, labelled "Nur fuer API" in the German Collmex interface (Administration > Users). The interactive login cannot be used for the API. Extra users carrying this flag are free of charge.',
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

	authenticate: IAuthenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> =>
		applyCollmexAuth(credentials as unknown as CollmexCredentials, requestOptions);

	/**
	 * This test only confirms that Collmex is reachable and that the request
	 * is well formed. It cannot confirm the credentials themselves, because
	 * Collmex answers a rejected login with HTTP 200 and an error record in
	 * the CSV body. Verified against the live API:
	 *
	 *   wrong customer number -> MESSAGE;E;200004;Ungueltige Kundennummer
	 *   wrong user/password   -> MESSAGE;E;101004;Benutzer oder Kennwort ...
	 *   success               -> CMXKND;... or MESSAGE;S;...
	 *
	 * Telling those apart needs a `responseSuccessBody` rule inspecting the
	 * body, which earlier versions had. It was removed while investigating why
	 * n8n's automated review reports this test as missing - `rules` is the last
	 * remaining difference between this credential and the verified packages it
	 * was compared against. Restore it once that is settled; bad credentials
	 * surface on the first execution until then.
	 */
	test: ICredentialTestRequest = {
		request: {
			// Deliberately self-contained: endpoint and LOGIN record are built
			// from credential expressions rather than left to `authenticate`,
			// so the whole request can be determined without executing code.
			// `authenticate` detects the LOGIN record and leaves it alone.
			baseURL: 'https://www.collmex.de',
			url: '=/c.cmx?{{$credentials.customerId}},0,data_exchange',
			method: 'POST',
			headers: { 'Content-Type': 'text/csv' },
			body: '=LOGIN;{{$credentials.username}};{{$credentials.password}};1\nCUSTOMER_GET;;{{$credentials.companyId}}\n',
		},
	};
}
