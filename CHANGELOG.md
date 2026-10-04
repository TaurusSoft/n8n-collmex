# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0]

### Added

- **Stock** resource with `Get` and `Get Many`, querying `STOCK_GET` and
  mapping the 11 fields of `CMXSTK`. Filters: product group, stock type, an
  as-of date for historical stock, free text search, plus the usual company
  override and incremental sync.
- **Stock Availability** resource with `Get` and `Get Many`, querying
  `STOCK_AVAILABLE_GET` and mapping the 6 fields of `STOCK_AVAILABLE`. This is
  the available quantity Collmex derives from stock minus due demands.
- **Open Item** resource with `Get Many`, querying `OPEN_ITEMS_GET` and mapping
  the 20 fields of `OPEN_ITEM` - the unpaid receivables and payables from
  accounting, with invoice number, due date, days overdue, dunning level and
  fees, and the amount split into billed, paid and open. No single `Get`:
  Collmex identifies an item by fiscal year, document number and position, and
  the query takes none of them.
- **Booking** resource with `Get Many`, querying `ACCDOC_GET` and mapping the 31
  fields of `ACCDOC` - one item per posting line, with the account, the side,
  the amount and the customer, vendor or asset the line is attached to. Posting
  lines are not folded into one item per booking the way document line items
  are: a booking number restarts every fiscal year, so grouping on it alone
  could merge two years. No single `Get`, for the same reason as Open Item.
- **Collmex Trigger** node, which starts a workflow when Collmex reports changed
  data. Activating the workflow registers an `API_NOTIFICATION` per selected
  event and deactivating it switches them off; the notification carries no
  payload, so the node answers it with an incremental query. All nine documented
  events are offered, `Buchung ausgeführt` among them once the Booking resource
  existed to serve it — an event with no query behind it would only wake a
  workflow up empty.
- A codex file for the trigger, so it carries the same categories and
  documentation links in the node panel as the Collmex node does. It was
  missing, which nothing enforces and nothing would have reported.
- Trigger items carry `collmexEvent` and `collmexResource` beside the record's
  own fields, so a workflow subscribed to several events can route on them.
- `DeltaQuerySpec` on each resource handler, stating where that query keeps its
  company, Only Changed and System Name fields. The trigger uses it to ask any
  resource for its changes without knowing its layout, and a test checks every
  spec against the resource's own `buildQuery` so the two cannot drift.
- **Product Group**, **Price Group**, **Address Group** and **Broker** are
  dropdowns filled from Collmex, via `PRODUCT_GROUPS_GET`, `PRICE_GROUPS_GET`,
  `ADDRESS_GROUPS_GET` and `EMPLOYEE_GET`. Each list is one query made when the
  node is opened; they read the two or three columns a dropdown needs rather
  than going through a record layout. **Discount Group** stays a free-text
  number, because Collmex documents no query that lists discount groups.
- `scripts/capture-collmex.mjs`, the script the fixtures were captured with. It
  queries a live tenant and probes one filter per documented field number,
  printing what each query is expected to return, so a record layout can be
  re-checked rather than taken on trust. `--dry-run` prints the query rows
  without sending them and needs no credentials, which is enough to read the
  field positions. Plain Node, no dependencies, and not part of the published
  package.

### Changed

- The `(NULL)` constant Collmex writes where an amount cannot exist is now
  treated like an empty field and left out of the output, instead of arriving
  as the string `(NULL)`. It appears on the available stock of products that
  cannot hold any, such as services. This is honoured only on the `N` and `M`
  amount types, the ones Collmex documents it for — a text field holding the
  string keeps it, since there it could be content.
- The transport accepts hook, webhook and load-options contexts as well as
  execution contexts. That is what lets the trigger register its notification
  and fetch changed records, and the dropdowns fill themselves, all through the
  same request function and the same credential.

### Note

Both stock layouts are pinned against a live capture taken on 2026-10-04,
including the `(NULL)` availability of a service product and the derivation of
the available quantity. Two things still rest on the documentation alone,
because the test tenant cannot produce them: the FBA stock type, and batch
numbers and descriptions.

The query filters were probed against the live API as well, which turned up two
things now written into the option descriptions. The as-of date reports the
stock at the _start_ of the given day, so movements booked on that day are not
counted and passing today is not equivalent to leaving the option unset. And a
product group number that does not exist makes Collmex reject the whole query
with message 100102 instead of returning nothing.

The capture corrected one wrong assumption before release: the company number
arrives as a bare number in `STOCK_AVAILABLE`, while `CMXSTK` sends it as a
coded enumeration with the company name behind it. The two record types
genuinely differ.

`ACCDOC` was captured before the Booking resource was written, and corrected a
third: `side` is documented as a coded `I` field, `0 = Soll, 1 = Haben`, but the
tenant sends the literal words `Soll` and `Haben` as text. It is typed `C` to
match. The same capture showed the posting date arriving twice, dotted text and
compact form, which is why the record carries both `documentDateText` and
`documentDate`.

The `API_NOTIFICATION` layout was checked the same way, and corrected another:
the documentation calls field 5 value `2` "Löschen", but Collmex keeps the
notification and only marks it inactive. It stops firing, and activating again
switches it back on, so the lifecycle closes — but a trigger that has run once
leaves a row under Administration > Data that only the web interface can remove.
The node still sends `2`, which is the strongest the API offers; the README says
what it actually does.

A notification does not say which event raised it, because every event a trigger
registers points at the same URL. The node therefore queries all selected events
on each notification, but sends those queries in one exchange, so it stays a
single API call however many events are selected. If nothing changed it
acknowledges the notification without starting the workflow.

The group filters are `options` holding a plain string, not a `resourceLocator`:
the stored value stays scalar, so nothing about them needs a new type version.
The value is text rather than a number because the standard price group is
number `0`, which has to stay selectable. An expression can be used in place of
a selection.

Their four lists were captured before the code was written, the opposite of the
usual order and deliberate, since the test account expires on 2026-10-11 and
code can be written afterwards while a capture cannot. They confirmed the
documented layouts and turned up one more difference between record types:
`PRICE_GROUP` and `EMPLOYEE` send the company as a coded enumeration with the
name behind it, the way `CMXSTK` does and unlike `STOCK_AVAILABLE`.

Polling needs no node of its own: a Schedule Trigger followed by a regular
Collmex node with Only Changed is already a complete polling setup, at the same
one call per interval. The README says so rather than shipping a second trigger
for it.

## [0.2.1]

### Fixed

- The codex `node` identifier in `Collmex.node.json` is now the fully qualified
  node type, `@taurussoftware/n8n-nodes-collmex.collmex`, instead of the bare
  package name that `@n8n/node-cli` scaffolds.

## [0.2.0]

The package passed verification with 0.1.6 once `main` carried the credential
test, which confirms that the 0.1.2 and 0.1.3 reworks of the test were never
needed. This reverts them to the 0.1.1 shape.

Alongside that, every record type is now checked against data Collmex actually
sent, which turned up one mapping bug and settled several layout questions
that had only been read out of the documentation until now.

### Added

- **Product** resource with `Get` and `Get Many`, querying `PRODUCT_GET` and
  mapping the 67 fields of `CMXPRD`. Filters: product group, price group, web
  presence, products with a price only, free text search, plus the usual
  company override and `Only Changed` with `System Name`.
- Captured responses for every record type the node reads, replacing the one
  invoice fixture that had been constructed from the documentation. All seven
  layouts are now checked against data Collmex actually sent.
- A scope invariant over the captured document responses: a field whose value
  changes from row to row within one document describes a line item, so
  marking it as header data would silently drop all but the first value. This
  is the one scope mistake real data can expose.

### Changed

- **Breaking: output no longer repeats the Collmex record type on every item.**
  `recordType` identified the CSV row rather than describing the record, and
  the caller already knows which resource it queried. A workflow reading
  `$json.recordType` has to drop that reference.
- The credential test is a plain `CUSTOMER_GET` again and goes through
  `authenticate` like every other request, which prepends the `LOGIN` record
  and fills in the customer endpoint. The self-contained variant duplicated the
  `LOGIN` format in a second place, where it could drift out of step with the
  encoding the body actually used.
- `authenticate` no longer special-cases a body that already starts with
  `LOGIN;`, and no longer clears `baseURL`; nothing sets one any more.

### Fixed

- `finalDiscount` on quotations, sales orders and invoices, and
  `downPaymentPercent` on invoices, arrived as text instead of a number.
  Collmex documents these percentages as integers but sends decimals, so a
  discount of 1.20 percent came out as the string '1,20'. They are typed as
  decimals now. Found by querying a live quotation.

### Removed

- **Breaking: the Request Character Set credential field.** It offered a choice
  with only one sensible answer, so the node now always announces UTF-8 in the
  `LOGIN` record and encodes the body to match. Supporting ISO-8859-1 would
  require encoding uploads differently for non-ASCII ('ü' is 1 byte in
  ISO-8859-1 but 2 in UTF-8), and it cannot represent characters above U+00FF
  at all. Response decoding was never affected - it follows the `charset` in
  Collmex's `Content-Type`. Stored values on existing credentials are ignored,
  so no credential needs re-entering.
- `hasUnknownRecords`, which was exported but never called.

## [0.1.6]

No functional change over 0.1.5. Released only because the Creator Portal
cannot re-run its pre-check without a fresh submission, and this is the first
version whose commit is also on `main`.

### Fixed

- Root cause of the recurring "Missing credential test" rejection, found after
  0.1.5 was rejected with the same message: every release since 0.1.1 was
  tagged and published from the `chore/community-publish` branch, which was
  never merged. The repository's default branch `main` still pointed at 0.1.0,
  whose credential has no `test` property (it relied on `testedBy` in the
  node). The Creator Portal's pre-check evidently reads the default branch, so
  it kept seeing 0.1.0 no matter what was published to npm. `main` is now
  fast-forwarded to the release commits. The explanation given under 0.1.5
  below (an n8n-side infrastructure bug) was wrong.

  Diagnosis notes, so nobody repeats the detour: the `credential-test-required`
  ESLint rule bundled in `@n8n/scan-community-package` 0.32.1 and 0.35.0
  passes on this source, and it also accepts `testedBy`. The Portal pre-check
  is a separate check that does not accept `testedBy`, matching another
  report on the n8n forum where a package with only `testedBy` got the
  identical message:
  https://community.n8n.io/t/http-credential-validation-workaround/302778

## [0.1.5]

Restores the `responseSuccessBody` rule removed in 0.1.4. Three releases (0.1.2
through 0.1.4) each changed the credential test to chase the "Missing
credential test" rejection from n8n's Creator Portal, and none of them made it
go away.

Two reports on the n8n community forum describe the same symptom on unrelated
packages: the Creator Portal rejects with a generic test/verification failure
while `@n8n/scan-community-package` passes clean, and the root cause turned out
to be on n8n's side both times - a stale tag in the verification tool's release
pipeline, and the portal validating an npm version that had already been
unpublished. See:

- https://community.n8n.io/t/creator-portal-reports-tests-failed-but-scan-community-package-passes-on-the-published-package/304437
- https://community.n8n.io/t/verification-pre-check-fails-with-generic-some-tests-have-failed-but-scan-community-package-passes/304095

Nothing here points at `rules` (or anything else in this credential) as the
actual cause, so removing it in 0.1.4 traded away real functionality - the
ability to detect bad Collmex credentials during the test - for no measurable
benefit. Restoring it and instead raising the rejection with the n8n team
directly, referencing the two threads above.

### Added

- Restored the `responseSuccessBody` rule on the credential test, so wrong
  Collmex credentials are reported at test time again instead of only
  surfacing on first execution.

## [0.1.4]

Third attempt at the "Missing credential test" rejection, isolating the last
remaining difference between this credential and the packages that pass n8n's
automated review.

Worth recording: `npx @n8n/scan-community-package`, the tool n8n's own message
recommends for diagnosing the rejection, reports no problems for 0.1.3 on
either the `latest` or `stable` tag.

### Removed

- The `responseSuccessBody` rule on the credential test. **The test can no
  longer detect invalid credentials** - Collmex reports those with HTTP 200 and
  an error record in the body, which needs exactly such a rule to read. Bad
  credentials now surface on the first execution instead. Restore the rule once
  n8n has clarified whether it is supported.

## [0.1.3]

Second attempt at the "Missing credential test" rejection from n8n's automated
review. 0.1.2 assumed the endpoint had to be spelled out as literals, which a
comparison with the verified `@apify/n8n-nodes-apify` disproved - it builds its
`test.baseURL` from an imported constant and passes.

The working assumption now is that the review determines the test request
statically and cannot execute the custom `authenticate` function that rewrites
it. The test therefore no longer depends on that function.

### Changed

- The credential test describes its whole request itself: endpoint and `LOGIN`
  record are built from credential expressions instead of being filled in by
  `authenticate`.
- `applyCollmexAuth` leaves a body that already carries a `LOGIN` record
  untouched, so the self-contained test request is not given a second one.

## [0.1.2]

Addresses the "Missing credential test" rejection from n8n's automated review.
The credential did define a test, but its endpoint was assembled from an
imported constant, which the review cannot resolve when it inspects the source
statically.

### Changed

- The credential test now spells its endpoint out as literal `baseURL` and
  `url` values, matching the shape used in n8n's node starter kit.
- `authenticate` clears any `baseURL` it finds, since it replaces `url` with an
  absolute address.
- Credential field descriptions no longer embed German text; the Collmex
  checkbox is referenced as the API-only flag with its German label quoted.

### Added

- Tests covering the credential definition, so the shape the automated review
  expects cannot regress unnoticed.

## [0.1.1]

Makes the package pass `@n8n/scan-community-package`, which is a prerequisite
for n8n Cloud verification. The scanner runs its own ESLint pass and ignores
`eslint-disable` comments, so the two rules 0.1.0 suppressed had to be
satisfied for real.

### Changed

- Authentication moved into the credential's `authenticate` function. It now
  prepends the `LOGIN` record and fills in the customer specific endpoint, so
  the node no longer reads credentials itself and uses
  `httpRequestWithAuthentication`.
- The credential test is declarative again. The custom `credentialTest` had to
  go because `ICredentialTestFunctions` only exposes the deprecated `request`
  helper. Since Collmex reports bad credentials with HTTP 200, the test relies
  on a `responseSuccessBody` rule that inspects the response body instead of
  the status code.

### Fixed

- An empty record list produced a stray blank line in the request payload.

## [0.1.0]

First release.

### Added

- **Collmex API credentials** with customer number, API user, password, default
  company and request character set, plus a connection test that reads the
  Collmex response - Collmex reports a failed login with HTTP 200, so the status
  code cannot be used.
- **Read-only access to six resources**, each with `Get` and `Get Many`:
  Customer (`CUSTOMER_GET`), Vendor (`VENDOR_GET`), Quotation (`QUOTATION_GET`),
  Sales Order (`SALES_ORDER_GET`), Invoice (`INVOICE_GET`) and Delivery
  (`DELIVERY_GET`).
- **Named, typed output.** The record layouts of `CMXKND`, `CMXLIF`, `CMXQTN`,
  `CMXORD-2`, `CMXINV` and `CMXDLV` are mapped onto field names, with dates
  normalised to ISO, German decimal commas parsed, and the labels Collmex glues
  behind coded numbers split into a separate `<field>Label`.
- **Position grouping** for quotations, sales orders, invoices and deliveries,
  folding the one-row-per-line-item responses into a single item with a
  `positions` array.
- **Per-resource filters**, including date ranges, customer number, free text
  search, a company override, and `Only Changed` with `System Name` for
  incremental sync.
- **Test suite** (`npm test`) built around responses captured verbatim from the
  live API.

### Notes

- Undocumented surplus columns are passed through as `field<N>` instead of being
  dropped: `CMXLIF` returns 42 fields where the documentation lists 41.
- The `mark as output` flag of `DELIVERY_GET` is deliberately not exposed. It
  writes back to Collmex, and this node is read-only.
- The ZIP/PDF return formats of the document queries are not supported; queries
  always request CSV.

## [0.0.1]

Placeholder publish, superseded by 0.1.0 eleven minutes later. Released from the
same commit and with the same code; it exists on npm only because the scaffold's
default version went out before the first real bump. Never tagged. Use 0.1.0 or
later.
