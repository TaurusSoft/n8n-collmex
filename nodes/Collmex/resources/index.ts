import type { INodeProperties } from 'n8n-workflow';

import { customerDescription, customerHandler } from './customer';
import { deliveryDescription, deliveryHandler } from './delivery';
import { invoiceDescription, invoiceHandler } from './invoice';
import { openItemDescription, openItemHandler } from './openItem';
import { productDescription, productHandler } from './product';
import { quotationDescription, quotationHandler } from './quotation';
import { salesOrderDescription, salesOrderHandler } from './salesOrder';
import type { ResourceHandler } from './shared';
import { stockDescription, stockHandler } from './stock';
import { stockAvailabilityDescription, stockAvailabilityHandler } from './stockAvailability';
import { vendorDescription, vendorHandler } from './vendor';

export type { ResourceHandler } from './shared';

export const resourceHandlers: Record<string, ResourceHandler> = {
	customer: customerHandler,
	delivery: deliveryHandler,
	invoice: invoiceHandler,
	openItem: openItemHandler,
	product: productHandler,
	quotation: quotationHandler,
	salesOrder: salesOrderHandler,
	stock: stockHandler,
	stockAvailability: stockAvailabilityHandler,
	vendor: vendorHandler,
};

export const resourceDescriptions: INodeProperties[] = [
	...customerDescription,
	...deliveryDescription,
	...invoiceDescription,
	...openItemDescription,
	...productDescription,
	...quotationDescription,
	...salesOrderDescription,
	...stockDescription,
	...stockAvailabilityDescription,
	...vendorDescription,
];
