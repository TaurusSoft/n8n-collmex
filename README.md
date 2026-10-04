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

| Resource           | Operations    | Collmex query         | Returns           |
| ------------------ | ------------- | --------------------- | ----------------- |
| Customer           | Get, Get Many | `CUSTOMER_GET`        | `CMXKND`          |
| Vendor             | Get, Get Many | `VENDOR_GET`          | `CMXLIF`          |
| Product            | Get, Get Many | `PRODUCT_GET`         | `CMXPRD`          |
| Quotation          | Get, Get Many | `QUOTATION_GET`       | `CMXQTN`          |
| Sales Order        | Get, Get Many | `SALES_ORDER_GET`     | `CMXORD-2`        |
| Invoice            | Get, Get Many | `INVOICE_GET`         | `CMXINV`          |
| Delivery           | Get, Get Many | `DELIVERY_GET`        | `CMXDLV`          |
| Stock              | Get, Get Many | `STOCK_GET`           | `CMXSTK`          |
| Stock Availability | Get, Get Many | `STOCK_AVAILABLE_GET` | `STOCK_AVAILABLE` |
| Open Item          | Get Many      | `OPEN_ITEMS_GET`      | `OPEN_ITEM`       |

Each resource has an **Options** collection for the filters the corresponding Collmex query supports, such as date ranges, customer number, free text search and a company override.

### Group filters are dropdowns

**Product Group**, **Price Group**, **Address Group** and **Broker** are filled from Collmex rather than typed as numbers. Each one is a query made when you open the node, so the lists cost an API call apiece against the daily limit — they are short lists, and none of them refresh on a timer.

This also removes a trap: an unknown product group number makes Collmex reject the whole query with message 100102 instead of returning nothing, and a list you pick from cannot produce one.

An expression can be used in place of a selection where a workflow has to compute the number.

**Discount Group** stays a free-text number: Collmex has no query that lists discount groups.

## Trigger

The **Collmex Trigger** node starts a workflow when Collmex reports that data changed. Collmex calls this push mechanism API notifications, and recommends it over polling.

Activating the workflow registers an `API_NOTIFICATION` for each selected event, pointing at the node's webhook URL; deactivating it switches them off again. When an event occurs, Collmex calls that URL — **with no payload**, so the node answers the call by asking Collmex what changed, using the same incremental sync the regular node offers.

| Event                               | Fetches             |
| ----------------------------------- | ------------------- |
| Available Stock Changed             | Stock Availability  |
| Sales Order Changed                 | Sales Order         |
| Delivery Changed                    | Delivery            |
| Invoice Changed                     | Invoice             |
| Quotation Changed                   | Quotation           |
| Stock Changed                       | Stock               |
| Product or Bill of Material Changed | Product             |
| Customer or Vendor Changed          | Customer and Vendor |

Collmex documents a ninth event, `Buchung ausgeführt` (a booking was made). It is deliberately not offered: this package has no accounting resource, so the trigger would wake the workflow up with nothing to hand it.

Each item carries `collmexEvent` and `collmexResource` alongside the record's own fields, so a workflow subscribed to several events can route on them.

Four things worth knowing:

- **The notification does not say which event raised it.** Every event registered by one trigger points at the same URL, so the node queries all selected events on each notification. The queries go out in a single request, so it stays one API call per notification — but subscribing to everything means more work per notification than subscribing to what you need.
- **Collmex sends at most one notification a minute**, and stops after 100 unacknowledged ones. Any query under the trigger's system name acknowledges them, which this node does on every call.
- **Nothing changed means nothing runs.** If the query comes back empty the node acknowledges the notification without starting the workflow, so there are no empty executions.
- **Deactivating leaves the entry behind.** The API documents `2` as "delete", but Collmex keeps the notification and only marks it inactive. It no longer fires, and reactivating the workflow switches it back on, so nothing breaks — but a trigger that has been activated once leaves a row under **Administration → Data → API notifications**, and only the web interface can remove it. Changing a trigger's System Name therefore leaves the old entry behind, switched off.

### System Name

The trigger registers itself under a **System Name** of at most 20 characters, and Collmex remembers the position in the change log under it. Give every trigger its own name.

Do not reuse the name of a regular Collmex node that queries the _same_ resource with **Only Changed**: Collmex keeps one position per system name **and** query, so whichever ran last would have consumed the changes and the other would see nothing. Different resources under one name are fine.

### Polling instead of a webhook

If your n8n instance has no URL Collmex can reach, you do not need a trigger node: a **Schedule Trigger** followed by a regular **Collmex** node with **Only Changed** and a **System Name** is a complete polling setup, and costs the same one API call per interval.

The difference is that n8n records an execution on every interval, including the ones where nothing changed, whereas the trigger only runs the workflow when there is something to process.

## Credentials

You need a Collmex account with API access, plus a dedicated API user.

1. **Create an API user.** In Collmex go to _Administration → Users → New_ and enable the API-only flag, labelled **"Nur fuer API"** in the German interface. This is mandatory: your normal interactive login is rejected by the API with `MESSAGE;E;101026`. Collmex does not charge for extra users carrying this flag.
2. **Look up your customer number.** This is your Collmex tenant number, the one that appears in the API endpoint URL.
3. In n8n create **Collmex API** credentials and fill in:
   - **Customer Number** – your tenant number
   - **User** / **Password** – the API user from step 1
   - **Company ID** – the internal company number, `1` unless you run several companies

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

### How many API calls a workflow costs

Collmex allows **10,000 API calls a day** per customer number, at most **five at a time per user**, and asks that a new call waits for the previous one to finish. It also runs maintenance daily from 03:30 to 05:00. A dedicated API user per connected system is recommended.

The node makes **one call per input item**, and each dropdown makes one more whenever you open the node. That matters most when a workflow feeds many items into **Get**: a hundred items are a hundred calls.

**Get Many costs one call regardless of how many records come back**, so where a filter can express what you want, it is far cheaper than looking records up one at a time. Fetching every invoice of a customer with one **Get Many** beats feeding a hundred invoice numbers into **Get**.

The node does not bundle several items into one request. Collmex runs each exchange as a single database transaction, so one bad query rolls the whole thing back — bundling would make one malformed item fail every other item in the batch, and n8n could no longer say which one was at fault.

### Open items

**Open Item** returns the unpaid receivables and payables from Collmex accounting. **Side** chooses which: receivables are what customers owe, payables what is owed to vendors. One record carries both a customer and a vendor column pair, and only the side you asked for is filled — the other arrives empty and is left out of the output.

Each item carries the invoice number, document and due dates, days overdue, dunning level, date and fees, and the amount split into **Amount**, **Paid** and **Open**. That is enough to drive a dunning run or a due-date report without a second query.

There is no single **Get**: Collmex identifies an open item by fiscal year, accounting document number and position, and the query takes none of them.

### Stock and availability

**Stock** returns the stored quantities: Collmex keeps one record per product, stock type and batch, so a single product can come back as several records. The **Stock Type** option restricts this to free, blocked or FBA stock — leaving it unset returns every type.

**As Of Date** gives the stock as it stood at the _start_ of that day. Movements booked on the day itself are not counted, so passing today's date is not the same as leaving the option unset — stock booked earlier today will be missing. Leave it unset for the current stock.

Note that a **Product Group** number that does not exist makes Collmex reject the whole query with message 100102, rather than returning an empty result.

**Stock Availability** is the derived figure, one record per product: the stock of the types marked as available, minus the demands (sales orders, deliveries) due today or earlier. Blocked stock does not count towards it, and the figure **goes negative** where demand exceeds stock — so treat it as a balance, not a quantity. Products that cannot hold stock at all, such as services, come back without an `availableQuantity`. A negative `replenishmentTime` means Collmex could not work the lead time out because the product has no valid vendor agreement.

Note that the two resources report the company number differently: `CMXSTK` sends it as a coded enumeration, so **Stock** items carry both `companyId` and `companyIdLabel`, while **Stock Availability** items carry only `companyId`.

### Incremental sync

Most queries support **Only Changed** together with **System Name**. Collmex stores the timestamp of the last query per system name, so a scheduled workflow using a stable system name (for example `n8n`) will only receive records created or changed since its previous run.

## Verifying against a live tenant

Every record layout in this package is pinned against a response captured from a real Collmex tenant, not against the documentation. That matters because a wrong field offset silently shifts every following value onto the wrong name, and the documentation has been wrong before — `CMXLIF` returns 42 fields where it lists 41.

`scripts/capture-collmex.mjs` is how those captures are taken, so a layout can be re-checked rather than taken on trust. It needs no dependencies and writes nothing to the tenant.

```bash
export COLLMEX_CUSTOMER=123456   # customer number, part of the endpoint URL
export COLLMEX_USER=apiuser      # an API user, with 'Nur für API' set
export COLLMEX_PASSWORD=...

npm run capture -- --suite stock                       # query and probe
npm run capture -- --suite stock --out test/captures   # also write the responses
npm run capture -- 'STOCK_GET;1;;;;;;;'                # one raw query row
```

Without a tenant at hand, `--dry-run` prints the query rows and sends nothing, so the field positions the node builds can be read without credentials:

```bash
npm run capture -- --suite stock --dry-run
```

A suite runs the queries behind a resource's fixtures plus one probe per filter, printing what each one is expected to return next to the result. It exits non-zero if a query comes back with an error record, which Collmex reports with HTTP 200 — so the exit code reflects the body, not the status line.

Writing captures into the repository is optional; the fixtures in `test/fixtures.ts` carry the responses they were built from and say whether each one was captured or constructed.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Collmex API documentation](https://www.collmex.de/c.cmx?1005,1,help,api) (German)
- [Collmex API overview](https://www.collmex.de/c.cmx?1005,1,help,api_ueberblick) (German)

## Version history

### 0.3.0

Turns the **Product Group**, **Price Group**, **Address Group** and **Broker**
filters into dropdowns filled from Collmex, so the internal numbers no longer
have to be known. The stored value is still a plain string, so nothing about
them changes for an existing workflow.

Adds the **Stock** and **Stock Availability** resources, covering the stored
quantities and the availability Collmex derives from them, and the **Collmex
Trigger** node: Collmex notifies n8n when data changes, and the node answers by
asking what changed. Eight events are supported; polling needs no trigger of its
own and is documented as a Schedule Trigger recipe instead.

The `(NULL)` constant Collmex writes where a value cannot exist is now left out
of the output instead of arriving as a string. Both layouts are pinned against
a live capture; only the FBA stock type and the batch fields rest on the
documentation alone, for want of a test tenant that has them.

### 0.2.0

Adds the Product resource, and every record type is now verified against data
Collmex actually returned rather than against the documentation alone.

Two breaking changes, both small:

- Items no longer carry a `recordType` property. It named the CSV record type
  rather than describing the record, and you already know which resource you
  queried. A workflow reading `$json.recordType` has to drop that reference.
- The **Request Character Set** credential field is gone; requests always use
  UTF-8. Nothing needs re-entering, the stored value is simply ignored.

### 0.1.6

No functional change over 0.1.5; released so the package could be resubmitted for verification. Verified for n8n Cloud from this version on.

### 0.1.5

The credential test detects invalid credentials again, reverting the 0.1.4 change. No change to resources, operations or output.

### 0.1.4

The credential test no longer detects invalid credentials. No change to resources, operations or output.

### 0.1.3

Makes the credential test self-contained so n8n's automated review can determine it. No change to resources, operations or output.

### 0.1.2

Fixes the credential test so n8n's automated review recognises it. No change to resources, operations or output.

### 0.1.1

Internal rework of authentication and the credential test so the package passes n8n's community package scanner. No change to resources, operations or output.

### 0.1.0

First release. Read-only access to customers, vendors, quotations, sales orders, invoices and deliveries.
