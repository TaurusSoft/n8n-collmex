# @taurussoftware/n8n-nodes-collmex

This is an n8n community node. It lets you read data from [Collmex](https://www.collmex.de/) in your n8n workflows.

Collmex is a German cloud ERP suite covering accounting, invoicing, order processing and inventory. It exposes a CSV-over-HTTP API for exchanging data with external systems.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

In n8n go to **Settings → Community nodes → Install** and enter the package name:

```
@taurussoftware/n8n-nodes-collmex
```

See the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation for details.

## Operations

This node is **read-only**. It queries Collmex but never creates or changes anything.

| Resource | Operations | Collmex query | Returns |
| --- | --- | --- | --- |
| Customer | Get, Get Many | `CUSTOMER_GET` | `CMXKND` |
| Vendor | Get, Get Many | `VENDOR_GET` | `CMXLIF` |
| Quotation | Get, Get Many | `QUOTATION_GET` | `CMXQTN` |
| Sales Order | Get, Get Many | `SALES_ORDER_GET` | `CMXORD-2` |
| Invoice | Get, Get Many | `INVOICE_GET` | `CMXINV` |
| Delivery | Get, Get Many | `DELIVERY_GET` | `CMXDLV` |

Each resource has an **Options** collection for the filters the corresponding Collmex query supports, such as date ranges, customer number, free text search and a company override.

## Credentials

You need a Collmex account with API access, plus a dedicated API user.

1. **Create an API user.** In Collmex go to *Administration → Users → New* and tick **"Nur für API"**. This is mandatory: your normal interactive login is rejected by the API with `MESSAGE;E;101026`. Collmex does not charge for extra users carrying this flag.
2. **Look up your customer number.** This is your Collmex tenant number, the one that appears in the API endpoint URL.
3. In n8n create **Collmex API** credentials and fill in:
   - **Customer Number** – your tenant number
   - **User** / **Password** – the API user from step 1
   - **Company ID** – the internal company number, `1` unless you run several companies
   - **Request Character Set** – UTF-8 by default; only switch to ISO-8859-1 if you send data that Collmex misreads

Press **Test** to verify. The test reports the actual Collmex message when something is wrong, because Collmex answers a failed login with HTTP 200 rather than an error status.

## Compatibility

Tested against n8n 1.x with `n8n-workflow` as a peer dependency. No known incompatibilities.

## Usage

### Field names instead of CSV columns

The Collmex API speaks CSV, where every field is identified only by its position. This node maps those positions onto named, typed fields, so a customer arrives as `{ customerId: 10000, zip: "01069", city: "Dresden", createdAt: "2026-09-11" }` rather than as a numbered array.

A few details worth knowing:

- **Dates** are normalised to ISO (`2026-09-11`), whichever of the two Collmex formats the server used.
- **Amounts and quantities** are converted from the German decimal comma, so `1.234,50` becomes `1234.5`.
- **Coded values** usually arrive from Collmex with a label glued behind the number (`20 Offen`). The node splits these, giving you both `status: 20` and `statusLabel: "Offen"`.
- **Empty fields are omitted** rather than returned as `null`, so an item only carries what Collmex actually filled in.
- **Undocumented fields are preserved.** Collmex occasionally returns more columns than it documents (`CMXLIF` has 42 against 41 in the specification). Surplus columns appear as `field42`, `field43` and so on rather than being dropped.

### Documents and their line items

Quotations, sales orders, invoices and deliveries are returned by Collmex as **one row per line item**, with the header data repeated on every row. The **Group Positions** option (on by default) folds those rows back into one item per document, with the line items in a `positions` array. Turn it off to get one item per row.

### Limit

Collmex has **no server-side paging**: every query returns the complete result set. The **Limit** option therefore only trims the output after the response has already been transferred. Use the filters in **Options** if you want Collmex itself to return less.

### Incremental sync

Most queries support **Only Changed** together with **System Name**. Collmex stores the timestamp of the last query per system name, so a scheduled workflow using a stable system name (for example `n8n`) will only receive records created or changed since its previous run.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Collmex API documentation](https://www.collmex.de/c.cmx?1005,1,help,api) (German)
* [Collmex API overview](https://www.collmex.de/c.cmx?1005,1,help,api_ueberblick) (German)

## Version history

### 0.2.0

First working release. Read-only access to customers, vendors, quotations, sales orders, invoices and deliveries.

### 0.1.0

Project scaffold only; not functional.
