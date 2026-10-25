import { test } from "node:test";
import assert from "node:assert";
import { parseCSV, normalizeDate, parseCleanNumber } from "../src/lib/parsers/csv-parser.ts";
import { parseQIF, parseOFX } from "../src/lib/parsers/ofx-qif-parser.ts";
import { extractTransactionsFromText } from "../src/lib/parsers/pdf-parser.ts";

test("Normalize Dates: Standardizes DD/MM/YYYY, DD-MMM-YYYY and ISO into YYYY-MM-DD", () => {
  assert.strictEqual(normalizeDate("2026-10-24"), "2026-10-24");
  assert.strictEqual(normalizeDate("24/10/2026"), "2026-10-24");
  assert.strictEqual(normalizeDate("15-Oct-2026"), "2026-10-15");
  assert.strictEqual(normalizeDate("05-MAY-26"), "2026-05-05");
});

test("Clean Currency & Lakhs Formatting: Strips symbols and commas correctly", () => {
  assert.strictEqual(parseCleanNumber("₹1,50,000.00"), 150000);
  assert.strictEqual(parseCleanNumber("  45,250.50 "), 45250.5);
  assert.strictEqual(parseCleanNumber("-₹12,000"), 12000);
  assert.strictEqual(parseCleanNumber(95000), 95000);
});

test("CSV Bank Statement Parser: Correctly extracts debit and credit rows", () => {
  const sampleCSV = `Date,Narration,Chq/Ref No,Withdrawal (Dr),Deposit (Cr),Closing Balance
2026-10-15,NEFT CR-APEX SOLUTIONS-INV-078,UTR998822,,145000.00,545000.00
2026-10-16,VENDOR PYMT STEEL TUBES,CHQ11029,48000.00,,497000.00
2026-10-17,OFFICE ELECTRICITY BILL,TXN4488,6500.00,,490500.00`;

  const result = parseCSV(sampleCSV, "hdfc_oct_statement.csv");

  assert.strictEqual(result.transactions.length, 3);
  assert.strictEqual(result.documentType, "bank_statement");

  // Inflow check
  const inflow = result.transactions[0];
  assert.strictEqual(inflow.date, "2026-10-15");
  assert.strictEqual(inflow.amount, 145000);
  assert.strictEqual(inflow.type, "income");
  assert.strictEqual(inflow.reference, "UTR998822");

  // Outflow check
  const outflow = result.transactions[1];
  assert.strictEqual(outflow.date, "2026-10-16");
  assert.strictEqual(outflow.amount, 48000);
  assert.strictEqual(outflow.type, "expense");
  assert.strictEqual(outflow.reference, "CHQ11029");
});

test("CSV Parser: Handles semicolon delimiter and single amount with Dr/Cr direction", () => {
  const sampleSemicolon = `Txn Date;Particulars;Amount;Dr/Cr
18/10/2026;Client Milestone Retainer;85000.00;CR
19/10/2026;Monthly Cloud Server Hosting;4200.00;DR`;

  const result = parseCSV(sampleSemicolon, "ledger.csv");
  assert.strictEqual(result.transactions.length, 2);
  assert.strictEqual(result.transactions[0].type, "income");
  assert.strictEqual(result.transactions[0].amount, 85000);
  assert.strictEqual(result.transactions[1].type, "expense");
  assert.strictEqual(result.transactions[1].amount, 4200);
});

test("QIF Banking Parser: Accurately parses standard Quicken Interchange Format", () => {
  const sampleQIF = `!Type:Bank
D10/20/2026
T125000.00
PClient Retainer Advance
NUTR001122
^
D10/21/2026
T-32000.00
PRaw Material Vendor Pymt
NREF4455
^`;

  const result = parseQIF(sampleQIF);
  assert.strictEqual(result.transactions.length, 2);
  assert.strictEqual(result.transactions[0].type, "income");
  assert.strictEqual(result.transactions[0].amount, 125000);
  assert.strictEqual(result.transactions[0].reference, "UTR001122");

  assert.strictEqual(result.transactions[1].type, "expense");
  assert.strictEqual(result.transactions[1].amount, 32000);
});

test("OFX Banking Parser: Accurately parses Open Financial Exchange XML/SGML transactions", () => {
  const sampleOFX = `<OFX>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261022120000
<TRNAMT>95000.00
<FITID>TXN992817
<NAME>Apex Services Receipt
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261023120000
<TRNAMT>-18500.00
<FITID>TXN992818
<NAME>Factory Tooling Maintenance
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

  const result = parseOFX(sampleOFX);
  assert.strictEqual(result.transactions.length, 2);
  assert.strictEqual(result.transactions[0].date, "2026-10-22");
  assert.strictEqual(result.transactions[0].amount, 95000);
  assert.strictEqual(result.transactions[0].type, "income");

  assert.strictEqual(result.transactions[1].date, "2026-10-23");
  assert.strictEqual(result.transactions[1].amount, 18500);
  assert.strictEqual(result.transactions[1].type, "expense");
});

test("PDF Text Heuristic Extractor: Identifies invoice header fields and totals", () => {
  const sampleInvoiceText = `TAX INVOICE
Invoice No: INV-2026-901
Date: 22/10/2026
Due Date: 15/11/2026
Billed To: Zen Precision Tools Pvt Ltd
Total GST: ₹18,000.00
Grand Total: ₹1,18,000.00`;

  const result = extractTransactionsFromText(sampleInvoiceText, "invoice_901.pdf");
  assert.strictEqual(result.documentType, "invoice");
  assert.strictEqual(result.transactions.length, 1);
  assert.strictEqual(result.transactions[0].amount, 118000);
  assert.strictEqual(result.transactions[0].invoiceNumber, "INV-2026-901");
  assert.strictEqual(result.transactions[0].type, "income");
});
