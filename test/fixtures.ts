/**
 * Responses captured verbatim from a live Collmex tenant on 2026-09-11,
 * decoded from the ISO-8859-1 the server sent.
 *
 * These are the regression backbone: they pin the node against the real
 * wire format rather than against our reading of the documentation. Do not
 * "tidy" them - the odd details (a trailing space in `0 `, the labels glued
 * behind coded numbers, the surplus 42nd CMXLIF column) are exactly what the
 * parsers have to survive.
 */

export const customerGetResponse = [
	'CMXKND;9999;1 Max Mustermann;;;;;Allgemeiner Geschäftspartner;;;;;;0;DE;;;;;;;;;;;0 30 Tage ohne Abzug;0 ;;;1 E-Mail;;;;0 Standard;EUR;0;;;0;0;;0 Deutsch;;;9999;;0;0;0;;0;0;01.01.1970;0',
	'CMXKND;10000;1 Max Mustermann;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;;0;DE;;;;;;;;;;;0 30 Tage ohne Abzug;0 ;;;1 E-Mail;;;;0 Standard;EUR;0;;;0;0;;0 Deutsch;;;10000;11.09.2026;0;0;0;;0;0;11.09.2026;0',
	'MESSAGE;S;208013;CUSTOMER_GET hat 2 Datensätze zurückgegeben',
	'MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.',
	'',
].join('\n');

export const vendorGetResponse = [
	'CMXLIF;9999;1 Max Mustermann;;;;;Allgemeiner Geschäftspartner;;;;;;0;DE;;;;;;;;;;;0 30 Tage ohne Abzug;;;1 E-Mail;;;;EUR;;0 Deutsch;;0 19%;;;0;;01.01.1970',
	'MESSAGE;S;208013;VENDOR_GET hat 1 Datensätze zurückgegeben',
	'MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 5 Datensätze verarbeitet.',
	'',
].join('\n');

/** An empty result set is a message and nothing else - not an error. */
export const emptyResultResponse = [
	'MESSAGE;S;210053;INVOICE_GET hat 0 Datensätze zurückgegeben',
	'MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.',
	'',
].join('\n');

/**
 * What Collmex answers when the user lacks the "Nur für API" flag. Note the
 * HTTP status was 200 - the failure is only visible in the record.
 */
export const loginErrorResponse = [
	"MESSAGE;E;101026;Anmeldung über das API nicht möglich. Benutzer 2226650 kann nur für die interaktive Anmeldung verwendet werden. Verwenden Sie für das API einen Benutzer mit gesetztem Kennzeichen 'Nur für API'.;1",
	'',
].join('\n');


/**
 * A product query, captured live on 2026-09-13.
 *
 * What makes this one worth keeping: record 2's description carries a
 * semicolon and its comment carries line breaks, both inside quoted fields,
 * and the numbers use the German decimal comma. Collmex separates records
 * with CRLF but uses a bare LF inside a field, so the two are kept apart
 * here instead of being joined on one terminator.
 *
 * Two edits against the wire, and no others: the company name is anonymised,
 * and the 1023 character comment is cut to two paragraphs, marked [gekuerzt].
 */
export const productGetResponse = [
	"CMXPRD;1;Kabel USB 2.0 grau;Cable USB 2.0 gray;PCE;1 Elektro;1 Max Mustermann;0 19%;0,000;;1;0 Ware;0;0 Standard;;4044951015290;Sharkoon;0 ;0;0;;0 Einkauf;;;;Eigenschaften: Kabellänge 0,5 m, Version USB 2.0, 1 USB-Anschluss, 2 USB, männlich/männlich, Farbe: Grau.;0 Automatisch;0,00;1;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;0;;;0;;;0;",
	"CMXPRD;2;\"Anker 240W USB C auf USB C Kabel PD 3.1; 1,8m\";Anker 240W USB C USB C cable PD 3.1 [1,8m];PCE;0 ;1 Max Mustermann;0 19%;25,900;GRM;1;0 Ware;0;0 Standard;14,99;;Anker;0 ;2;5;;0 Einkauf;;;;\"Modellnummer: A8060 Anker USB C auf USB C Kabel (1,8m, 240W, geflochten) Schnellladen in robustem, schmutzabweisendem Design\n\nRasantes Laden mit 240W Das Kabel ist mit PD 3.1 für zuverlässiges Schnellladen ausgestattet. [gekürzt]\";0 Automatisch;0,00;1;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;0;;;0;;KAB1058;0;",
	"MESSAGE;S;209033;PRODUCT_GET hat 2 Datensätze zurückgegeben",
	"MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.",
	"",
].join("\r\n");

/**
 * A quotation query, captured live on 2026-09-13.
 *
 * Three quotations across five rows: one without line items, two with two
 * each, which is what makes this the regression case for position grouping.
 * Quotation 3 also carries a final discount of 1,20 percent - the field the
 * documentation types as an integer - and multi-line texts in the header.
 *
 * One edit against the wire: the company name is anonymised.
 */
export const quotationGetResponse = [
	"CMXQTN;1;0;0;1 Max Mustermann;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;20260913;20260913;0 30 Tage ohne Abzug;EUR;0 Standard;0 ;0,00;;;;;0;;0;0;0;0,00;;0 Neu;;0 ;0,00;0,00;;;;;;;;;;;;;;;;;;0;;;;0,000;0,00;0,000;0,00;0,00;0;0;0;0;;;;;;0,00",
	"CMXQTN;2;10;0;1 Max Mustermann;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;20260913;20260913;0 30 Tage ohne Abzug;EUR;0 Standard;0 ;0,00;;\"Sehr geehrte Damen und Herren,\n\nwir freuen uns, dass Sie sich für unsere Produkte interessieren.\";;;0;;0;0;0;0,00;;0 Neu;;0 ;0,00;0,00;;;;;;;;;;;;;;;;;;0;2;\"Anker 240W USB C auf USB C Kabel PD 3.1; 1,8m\";PCE;4;14,99;1;0,00;59,96;0;0;0;0;;59,96;0,00;59,96;100,00;0,00",
	"CMXQTN;2;20;0;1 Max Mustermann;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;20260913;20260913;0 30 Tage ohne Abzug;EUR;0 Standard;0 ;0,00;;\"Sehr geehrte Damen und Herren,\n\nwir freuen uns, dass Sie sich für unsere Produkte interessieren.\";;;0;;0;0;0;0,00;;0 Neu;;0 ;0,00;0,00;;;;;;;;;;;;;;;;;;0;1;Kabel USB 2.0 grau;PCE;13;0,00;1;0,00;0,00;0;0;0;0;;0,00;0,00;0,00;0,00;0,00",
	"CMXQTN;3;10;0;1 Max Mustermann;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;20260913;20260913;0 30 Tage ohne Abzug;EUR;0 Standard;0 ;1,20;Erstkauf;\"Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihr Interesse an unseren Produkten\";\"Wir freuen uns auf Ihren Auftrag\n\nViele Grüße\n\nHans\";;0;;0;0;0;0,00;;0 Neu;;0 ;2,00;0,00;20260930;CFR;;;;;;;;;;;;;;;;0;1;Kabel USB 2.0 grau;PCE;13;0,00;1;0,00;0,00;0;0;0;0;;0,00;0,00;0,00;0,00;0,00",
	"CMXQTN;3;20;0;1 Max Mustermann;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;20260913;20260913;0 30 Tage ohne Abzug;EUR;0 Standard;0 ;1,20;Erstkauf;\"Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihr Interesse an unseren Produkten\";\"Wir freuen uns auf Ihren Auftrag\n\nViele Grüße\n\nHans\";;0;;0;0;0;0,00;;0 Neu;;0 ;2,00;0,00;20260930;CFR;;;;;;;;;;;;;;;;0;2;\"Anker 240W USB C auf USB C Kabel PD 3.1; 1,8m\";PCE;24;14,99;1;0,00;359,76;0;0;0;0;;355,44;0,00;355,44;100,00;0,00",
	"MESSAGE;S;218007;QUOTATION_GET hat 3 Datensätze zurückgegeben",
	"MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.",
	"",
].join("\r\n");

/**
 * A sales order query, captured live on 2026-09-13, for an order created
 * from quotation 3.
 *
 * This is the regression case for the eight header fields that sit in the
 * middle of the line item block (86, 87, 93 to 98). Two of them carry
 * telling values: field 95 is the gross total and field 96 the originating
 * quotation, both identical on every row. Had they been line item data,
 * each row would carry its own.
 *
 * The totals cross-check: 24 x 14.99 = 359.76, less 1.2 percent = 355.44,
 * plus 2.00 shipping = 357.44, plus 19 percent VAT = 425.35.
 *
 * One edit against the wire: the company name is anonymised.
 */
export const salesOrderGetResponse = [
	"CMXORD-2;1;10;0;1 Max Mustermann;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;;20260913;20260913;2 14 Tage 3%, 30 Tage o.A.;EUR;0 Standard;0 ;1,20;Erstkauf;;;;0;0;0;0 Neu;0;0;0;;0,00;;;;0 ;2,00;0,00;CFR;;;;;;;;;;;;;;;;0;1;Kabel USB 2.0 grau;PCE;13;0,00;20260930;1;0,00;0,00;0;0;0;0;0;0;0,00;0,00;0,00;0,00;0,00;0;0;425,35;3;;0;1",
	"CMXORD-2;1;20;0;1 Max Mustermann;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;;20260913;20260913;2 14 Tage 3%, 30 Tage o.A.;EUR;0 Standard;0 ;1,20;Erstkauf;;;;0;0;0;0 Neu;0;0;0;;0,00;;;;0 ;2,00;0,00;CFR;;;;;;;;;;;;;;;;0;2;\"Anker 240W USB C auf USB C Kabel PD 3.1; 1,8m\";PCE;24;14,99;20260930;1;0,00;359,76;0;0;0;0;0;0;355,44;0,00;355,44;100,00;0,00;0;0;425,35;3;;0;1",
	"MESSAGE;S;227007;SALES_ORDER_GET hat 1 Datensätze zurückgegeben",
	"MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.",
	"",
].join("\r\n");

/**
 * A delivery query, captured live on 2026-09-13, for a delivery created
 * from sales order 1.
 *
 * Six fields differ between the two rows here - position number, product,
 * description, quantity, the originating order position and the GTIN - which
 * makes this the sharpest test of the header/line item split: a field that
 * varies per row cannot be header data.
 *
 * One edit against the wire: the company name is anonymised.
 */
export const deliveryGetResponse = [
	"CMXDLV;1;10;0;1 Max Mustermann;10000;1;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;;20260913;;;;0;0;10 Offen;0;0;0,621;;;;0 ;CFR;;;;;;;;;;;;;;;;0;1;Kabel USB 2.0 grau;PCE;13;10;4044951015290;0;;;;",
	"CMXDLV;1;20;0;1 Max Mustermann;10000;1;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;;20260913;;;;0;0;10 Offen;0;0;0,621;;;;0 ;CFR;;;;;;;;;;;;;;;;0;2;\"Anker 240W USB C auf USB C Kabel PD 3.1; 1,8m\";PCE;24;20;;0;;;;",
	"MESSAGE;S;230004;DELIVERY_GET hat 1 Datensätze zurückgegeben",
	"MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.",
	"",
].join("\r\n");

/**
 * An invoice query, captured live on 2026-09-13, for an invoice booked from
 * sales order 1 and delivery 1.
 *
 * Eleven fields differ between the two rows, which is the strongest check
 * of the header/line item split of all the captured responses. It also
 * closes the chain: field 6 names the order, field 90 the delivery, and the
 * order in turn names quotation 3.
 *
 * One edit against the wire: the company name is anonymised.
 */
export const invoiceGetResponse = [
	"CMXINV;1;10;0;1 Max Mustermann;1;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;20260913;20260913;2 14 Tage 3%, 30 Tage o.A.;EUR;0 Standard;0 ;1,20;Erstkauf;;;;0;0;0;0;;0 Neu;0,00;;0 ;2,00;0,00;20260913;CFR;;;;;;;;;;;;;;;;0;1;Kabel USB 2.0 grau;PCE;13;0,00;1;0,00;0,00;0;0;0;10;0;;0,00;0,00;0,00;0,00;0,00;4044951015290;1;;0;;0;0;0,00",
	"CMXINV;1;20;0;1 Max Mustermann;1;10000;;;;;Testfirma 1;;Bayrische Str. 12;01069;Dresden;DE;;;;;;;;;;;;0;20260913;20260913;2 14 Tage 3%, 30 Tage o.A.;EUR;0 Standard;0 ;1,20;Erstkauf;;;;0;0;0;0;;0 Neu;0,00;;0 ;2,00;0,00;20260913;CFR;;;;;;;;;;;;;;;;0;2;\"Anker 240W USB C auf USB C Kabel PD 3.1; 1,8m\";PCE;24;14,99;1;0,00;359,76;0;0;0;20;0;;355,44;0,00;355,44;100,00;0,00;;1;;0;;0;0;0,00",
	"MESSAGE;S;210053;INVOICE_GET hat 1 Datensätze zurückgegeben",
	"MESSAGE;S;204020;Datenübertragung erfolgreich. Es wurden 1 Datensätze verarbeitet.",
	"",
].join("\r\n");
