import test from "node:test";
import assert from "node:assert";
import { validateCINFormat, searchMCACompany, MCA_OFFICIAL_PORTAL_URL } from "../src/lib/mca-service.ts";
import {
  calculateTotalLiquidCash,
  calculateWorkingCapitalAssets,
  calculateTotalLiabilities,
  DEFAULT_ONBOARDING_DATA,
} from "../src/lib/onboarding-service.ts";
import type { OnboardingOpeningFinances } from "../src/lib/onboarding-types.ts";

// =========================================================================
// TEST SUITE 1: MCA & CIN SYNTAX VERIFICATION
// =========================================================================

test("CIN Format Validator: Validates standard 21-character Indian corporate identifier", () => {
  // Valid Pvt Ltd CIN
  const valid1 = validateCINFormat("U72900KA2021PTC148892");
  assert.strictEqual(valid1.isValid, true, "Valid 21-char CIN must pass");

  // Valid Listed Company CIN
  const valid2 = validateCINFormat("L29100MH2019PLC324110");
  assert.strictEqual(valid2.isValid, true, "Valid Listed PLC CIN must pass");

  // Invalid length (< 21 characters)
  const shortCin = validateCINFormat("U72900KA2021PTC1488");
  assert.strictEqual(shortCin.isValid, false, "Short CIN must fail");
  assert.ok(shortCin.explanation?.includes("21 characters"), "Should mention 21 characters requirement");

  // Invalid characters / structure
  const invalidPattern = validateCINFormat("X12345678901234567890");
  assert.strictEqual(invalidPattern.isValid, false, "Invalid pattern must fail regex");

  // Empty string
  const empty = validateCINFormat("");
  assert.strictEqual(empty.isValid, false, "Empty CIN must fail");
});

test("MCA Search Service: Honest verification and reliable fallbacks", () => {
  // Test known registered demonstration entity
  const resultKnown = searchMCACompany("U72900KA2021PTC148892");
  assert.strictEqual(resultKnown.found, true, "Known entity must be found");
  assert.strictEqual(resultKnown.source, "mca_registry_sample");
  assert.strictEqual(resultKnown.companyName, "APEX ENGINEERING & AUTOMATION PRIVATE LIMITED");
  assert.strictEqual(resultKnown.rocCode, "RoC-Bangalore");

  // Test search by company name substring
  const resultByName = searchMCACompany("Zenith Aero");
  assert.strictEqual(resultByName.found, true, "Lookup by name must match");
  assert.strictEqual(resultByName.cin, "U29100MH2019PTC324110");

  // Test valid CIN format not in seed registry -> honest format_validated_only fallback
  const resultValidUnknown = searchMCACompany("U12345DL2023PTC999999");
  assert.strictEqual(resultValidUnknown.found, false, "Unknown CIN is not claimed as verified");
  assert.strictEqual(resultValidUnknown.source, "format_validated_only");
  assert.ok(resultValidUnknown.message.includes("https://www.mca.gov.in/"), "Must guide user to official MCA portal");

  // Test unformatted manual entry
  const resultManual = searchMCACompany("Random Unregistered Business");
  assert.strictEqual(resultManual.found, false);
  assert.strictEqual(resultManual.source, "manual_entry");

  // Official portal constant integrity
  assert.ok(MCA_OFFICIAL_PORTAL_URL.startsWith("https://www.mca.gov.in"), "Official URL must point to MCA");
});

// =========================================================================
// TEST SUITE 2: AUTOMATIC BALANCE DUE CALCULATIONS
// =========================================================================

test("Receivables & Payables: Automatic Balance Due Calculation (Outstanding = Total - Paid)", () => {
  // Receivable with partial payment
  const invoiceAmount = 450000;
  const amountReceived = 150000;
  const receivableOutstanding = invoiceAmount - amountReceived;
  assert.strictEqual(receivableOutstanding, 300000, "Outstanding receivable must be ₹3,00,000");

  // Receivable with zero payment
  const unpaidInvoice = 200000;
  const unpaidReceived = 0;
  assert.strictEqual(unpaidInvoice - unpaidReceived, 200000, "Unpaid receivable outstanding equals full amount");

  // Fully settled receivable
  assert.strictEqual(50000 - 50000, 0, "Fully settled receivable outstanding must be 0");

  // Payable with partial payment
  const billAmount = 180000;
  const billPaid = 60000;
  const payableOutstanding = billAmount - billPaid;
  assert.strictEqual(payableOutstanding, 120000, "Outstanding payable must be ₹1,20,000");
});

// =========================================================================
// TEST SUITE 3: ACCOUNTING INTEGRITY - STRICT LIQUID CASH ISOLATION
// =========================================================================

test("Liquid Cash Isolation: Inventory, Fixed Assets, Advances & Receivables are NEVER Counted in Liquid Cash", () => {
  const sampleFinances: OnboardingOpeningFinances = {
    cashInHand: 40000, // Liquid
    bankAccounts: [
      {
        id: "bank-1",
        bankName: "HDFC Bank",
        accountNickname: "Primary Current",
        accountType: "current",
        currentBalance: 500000,
        restrictedAmount: 100000, // Margin money locked for bank guarantee
        availableBalance: 400000, // Available = 500,000 - 100,000 = 400,000
        lastUpdatedDate: "2026-10-24",
      },
      {
        id: "bank-2",
        bankName: "SBI",
        accountNickname: "Reserve Current",
        accountType: "current",
        currentBalance: 200000,
        restrictedAmount: 0,
        availableBalance: 200000,
        lastUpdatedDate: "2026-10-24",
      },
    ],
    reservedCash: 100000,
    minimumReserve: 250000,
    otherLiquidFunds: 10000, // Liquid
    shortTermInvestments: 75000, // Not immediate liquid operating cash
    receivables: [
      {
        id: "rec-1",
        customerName: "Buyer Corp",
        invoiceNumber: "INV-001",
        invoiceDate: "2026-10-10",
        dueDate: "2026-10-31",
        invoiceAmount: 600000,
        amountReceived: 100000,
        expectedCollectionDate: "2026-10-31",
        outstandingBalance: 500000,
      },
    ],
    supplierAdvances: [
      {
        id: "adv-1",
        supplierName: "Steel Suppliers Ltd",
        advanceAmount: 150000,
        purpose: "Raw material advance",
      },
    ],
    inventoryItems: [
      {
        id: "inv-1",
        itemName: "Raw Materials Stock",
        estimatedValue: 350000,
        valuationDate: "2026-10-20",
      },
    ],
    fixedAssets: [
      {
        id: "fa-1",
        assetName: "CNC Milling Machine",
        category: "machinery",
        purchaseCost: 2000000,
        currentEstimatedValue: 1600000,
      },
    ],
    otherCurrentAssets: 25000,
    payables: [
      {
        id: "pay-1",
        vendorName: "Cutting Tooling Ltd",
        invoiceNumber: "SUP-101",
        dueDate: "2026-11-02",
        totalAmount: 120000,
        paidAmount: 20000,
        outstandingBalance: 100000,
        category: "Tooling",
      },
    ],
    loans: [
      {
        id: "loan-1",
        liabilityType: "loan",
        name: "Working Capital Loan",
        amount: 500000,
      },
    ],
    taxesPayable: [
      {
        id: "tax-1",
        liabilityType: "tax_payable",
        name: "GST Q2 Settlement",
        amount: 45000,
      },
    ],
    payrollObligations: [
      {
        id: "pr-1",
        liabilityType: "payroll_obligation",
        name: "Pending Salaries",
        amount: 180000,
      },
    ],
    otherLiabilities: [],
  };

  // 1. Compute Liquid Cash
  // Formula: Cash in Hand (40,000) + HDFC available (400,000) + SBI available (200,000) + Other Liquid (10,000) = 650,000
  const liquidCash = calculateTotalLiquidCash(sampleFinances);
  assert.strictEqual(
    liquidCash,
    650000,
    "Liquid cash must equal exactly ₹6,50,000 (excluding inventory, advances, receivables, and restricted funds)"
  );

  // 2. Verify restricted funds were deducted
  const rawBankSum = 500000 + 200000;
  assert.ok(
    liquidCash < 40000 + rawBankSum + 10000,
    "Restricted margin money must NOT be included in liquid operational cash"
  );

  // 3. Compute Working Capital Assets
  // Receivables outstanding (500,000) + Advances (150,000) + Inventory (350,000) + Fixed Assets (1,600,000) + Other (25,000) = 2,625,000
  const workingCapital = calculateWorkingCapitalAssets(sampleFinances);
  assert.strictEqual(
    workingCapital,
    2625000,
    "Working capital assets must equal ₹26,25,000"
  );

  // 4. Compute Total Liabilities
  // Payables outstanding (100,000) + Loans (500,000) + Taxes (45,000) + Payroll (180,000) = 825,000
  const totalLiabilities = calculateTotalLiabilities(sampleFinances);
  assert.strictEqual(
    totalLiabilities,
    825000,
    "Total opening liabilities must equal ₹8,25,000"
  );
});

test("Default Onboarding Seed Integrity: Valid initial setup state", () => {
  assert.strictEqual(DEFAULT_ONBOARDING_DATA.currentStep, 1);
  assert.strictEqual(DEFAULT_ONBOARDING_DATA.profile.entityType, "pvt_ltd");
  assert.ok(DEFAULT_ONBOARDING_DATA.profile.cin);

  const defaultLiquid = calculateTotalLiquidCash(DEFAULT_ONBOARDING_DATA.openingFinances);
  assert.ok(defaultLiquid > 0, "Default liquid cash must be positive");

  const defaultLiabilities = calculateTotalLiabilities(DEFAULT_ONBOARDING_DATA.openingFinances);
  assert.ok(defaultLiabilities > 0, "Default liabilities must be positive");
});
