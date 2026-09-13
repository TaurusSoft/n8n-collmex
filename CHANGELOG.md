# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The package passed verification with 0.1.6 once `main` carried the credential
test, which confirms that the 0.1.2 and 0.1.3 reworks of the test were never
needed. This reverts them to the 0.1.1 shape.

### Changed

- The credential test is a plain `CUSTOMER_GET` again and goes through
  `authenticate` like every other request, which prepends the `LOGIN` record
  and fills in the customer endpoint. The self-contained variant duplicated the
  `LOGIN` format in a second place, where it could drift out of step with the
  encoding the body actually used.
- `authenticate` no longer special-cases a body that already starts with
  `LOGIN;`, and no longer clears `baseURL`; nothing sets one any more.
- Output no longer repeats the Collmex record type on every item. It identifies
  the CSV row rather than describing the record, and the caller already knows
  which resource it queried.

### Removed

- `hasUnknownRecords`, which was exported but never called.

### Added

- **Product** resource with `Get` and `Get Many`, querying `PRODUCT_GET` and
  mapping the 67 fields of `CMXPRD`. Filters: product group, price group, web
  presence, products with a price only, free text search, plus the usual
  company override and `Only Changed` with `System Name`.

### Added

- Captured responses for every record type the node reads, replacing the one
  invoice fixture that had been constructed from the documentation. All seven
  layouts are now checked against data Collmex actually sent.
- A scope invariant over the captured document responses: a field whose value
  changes from row to row within one document describes a line item, so
  marking it as header data would silently drop all but the first value. This
  is the one scope mistake real data can expose.

### Fixed

- `finalDiscount` on quotations, sales orders and invoices, and
  `downPaymentPercent` on invoices, arrived as text instead of a number.
  Collmex documents these percentages as integers but sends decimals, so a
  discount of 1.20 percent came out as the string '1,20'. They are typed as
  decimals now. Found by querying a live quotation.

### Removed

- The **Request Character Set** credential field. It offered a choice with only
  one sensible answer, so it now always announces UTF-8 in the `LOGIN` record
  and encodes the body to match. Supporting ISO-8859-1 would require encoding
  uploads differently for non-ASCII ('ü' is 1 byte in ISO-8859-1 but 2 in
  UTF-8), and it cannot represent characters above U+00FF at all. Response
  decoding was never affected - it follows the `charset` in Collmex's
  `Content-Type`. Stored values on existing credentials are simply ignored.

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
