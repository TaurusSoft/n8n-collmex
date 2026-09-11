# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0]

First working release. The 0.1.0 scaffold targeted a REST API that Collmex does
not have; everything below replaces it.

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

## [0.1.0]

- Initial project scaffold from the n8n community node template. Not functional.
