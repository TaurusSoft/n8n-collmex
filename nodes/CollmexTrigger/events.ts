import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * The events Collmex can notify about, as field 3 of `API_NOTIFICATION`, each
 * paired with the resources whose changes it announces.
 *
 * Collmex documents nine events. Only the eight below are offered, because a
 * notification is nothing but a trigger for a query - an event with no query
 * behind it would wake the workflow up with nothing to hand it. The one left
 * out is `1 = Buchung ausgeführt`, which needs an accounting resource this
 * package does not have yet.
 *
 * Event 9 covers customers, vendors, addresses and members under a single
 * number, so it maps to more than one resource; of those, this package can
 * query customers and vendors.
 */
export interface CollmexEvent {
	/** Value of field 3 in `API_NOTIFICATION`. */
	id: number;
	name: string;
	description: string;
	/** Keys into `resourceHandlers`, queried in this order when the event fires. */
	resources: string[];
}

export const collmexEvents: CollmexEvent[] = [
	{
		id: 2,
		name: 'Available Stock Changed',
		description: 'Fetches the products whose available quantity changed',
		resources: ['stockAvailability'],
	},
	{
		id: 3,
		name: 'Sales Order Changed',
		description: 'Fetches the created or changed sales orders',
		resources: ['salesOrder'],
	},
	{
		id: 4,
		name: 'Delivery Changed',
		description: 'Fetches the created or changed deliveries',
		resources: ['delivery'],
	},
	{
		id: 5,
		name: 'Invoice Changed',
		description: 'Fetches the created or changed invoices',
		resources: ['invoice'],
	},
	{
		id: 6,
		name: 'Quotation Changed',
		description: 'Fetches the created or changed quotations',
		resources: ['quotation'],
	},
	{
		id: 7,
		name: 'Stock Changed',
		description: 'Fetches the changed stock records',
		resources: ['stock'],
	},
	{
		id: 8,
		name: 'Product or Bill of Material Changed',
		description:
			'Fetches the created or changed products. Collmex also raises this for a changed bill of material, which this package cannot query yet.',
		resources: ['product'],
	},
	{
		id: 9,
		name: 'Customer or Vendor Changed',
		description:
			'Fetches the created or changed customers and vendors. Collmex raises this for addresses too, which this package cannot query yet.',
		resources: ['customer', 'vendor'],
	},
];

/** The event list as the Events parameter needs it. */
export const eventOptions: INodePropertyOptions[] = collmexEvents.map((event) => ({
	name: event.name,
	value: event.id,
	description: event.description,
}));

export function findEvent(id: number): CollmexEvent | undefined {
	return collmexEvents.find((event) => event.id === id);
}
