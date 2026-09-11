import type { INodeProperties } from 'n8n-workflow';

import { customerDescription, customerHandler } from './customer';
import { deliveryDescription, deliveryHandler } from './delivery';
import { invoiceDescription, invoiceHandler } from './invoice';
import { quotationDescription, quotationHandler } from './quotation';
import { salesOrderDescription, salesOrderHandler } from './salesOrder';
import type { ResourceHandler } from './shared';
import { vendorDescription, vendorHandler } from './vendor';

export type { ResourceHandler } from './shared';

export const resourceHandlers: Record<string, ResourceHandler> = {
	customer: customerHandler,
	delivery: deliveryHandler,
	invoice: invoiceHandler,
	quotation: quotationHandler,
	salesOrder: salesOrderHandler,
	vendor: vendorHandler,
};

export const resourceDescriptions: INodeProperties[] = [
	...customerDescription,
	...deliveryDescription,
	...invoiceDescription,
	...quotationDescription,
	...salesOrderDescription,
	...vendorDescription,
];
