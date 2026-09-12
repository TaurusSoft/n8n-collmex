# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
