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
 * A two-line-item invoice.
 *
 * Unlike the fixtures above this one is constructed from the documented
 * CMXINV layout rather than captured, because the test tenant holds no
 * documents. Replace it with a captured response once one exists.
 */
export function buildInvoiceResponse(): string {
	const position = (
		positionNumber: string,
		productId: string,
		description: string,
		quantity: string,
		unitPrice: string,
		positionValue: string,
	): string => {
		const row = new Array<string>(96).fill('');
		const set = (fieldNumber: number, value: string) => {
			row[fieldNumber - 1] = value;
		};

		set(1, 'CMXINV');
		set(2, '20001');
		set(3, positionNumber);
		set(4, '0 Rechnung');
		set(5, '1 Max Mustermann');
		set(7, '10000');
		set(12, 'Testfirma 1');
		set(14, 'Bayrische Str. 12');
		set(15, '01069');
		set(16, 'Dresden');
		set(17, 'DE');
		set(30, '11.09.2026');
		set(32, '0 30 Tage ohne Abzug');
		set(33, 'EUR');
		set(46, '20 Offen');
		set(69, '0 Normalposition');
		set(70, productId);
		set(71, description);
		set(72, 'Stk');
		set(73, quantity);
		set(74, unitPrice);
		set(77, positionValue);

		return row.join(';');
	};

	return [
		position('10', 'ART-1', 'Testprodukt A', '2', '19,99', '39,98'),
		position('20', 'ART-2', 'Testprodukt B', '1,5', '1.234,50', '1.851,75'),
		'MESSAGE;S;210053;INVOICE_GET hat 1 Datensätze zurückgegeben',
		'',
	].join('\n');
}

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
