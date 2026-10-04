import type { INodeProperties } from 'n8n-workflow';

import { bookingDescription, bookingHandler } from './booking';
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
	booking: bookingHandler,
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
	...bookingDescription,
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
