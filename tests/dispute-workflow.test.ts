import test from "node:test";
import assert from "node:assert";
import {
  createDispute,
  addDisputeEvidence,
  submitDisputeResponse,
  proposeDisputeSettlement,
  acceptDisputeSettlement,
  rejectDisputeSettlement,
  recordSettlementPayment,
  escalateDisputeToODR,
  generateNeutralRuleSummary,
  MSME_ODR_PORTAL_URL,
} from "../src/lib/dispute-service.ts";

test("FairResolve Dispute Workflow: Complete Lifecycle & Double-Counting Safeguards", () => {
  // 1. Verify MSME ODR URL
  assert.strictEqual(
    MSME_ODR_PORTAL_URL,
    "https://odr.msme.gov.in/",
    "Must strictly link to official MSME ODR portal"
  );

  // 2. Create Dispute linked to an invoice
  const dispute = createDispute({
    counterpartyName: "Aura Robotics Systems",
    invoiceNumber: "INV-2026-089",
    receivableId: "rec-008",
    disputeAmount: 240000,
    originalDueDate: "2026-10-25",
    issueCategory: "scope_dispute",
    sellerStatement: "Base chassis delivered per milestone 2 specs with inspection approval.",
    notes: "Buyer withheld ₹2.4L milestone payment citing firmware integration delay.",
  });

  assert.ok(dispute.id, "Dispute ID generated");
  assert.ok(dispute.caseNumber.startsWith("FR-2026-"), "Case number formatted correctly");
  assert.strictEqual(dispute.status, "counterparty_notified", "Initial status is counterparty_notified");
  assert.strictEqual(dispute.disputeAmount, 240000, "Disputed amount is recorded");
  assert.strictEqual(dispute.evidenceItems.length, 1, "Initial invoice evidence created");
  assert.ok(dispute.activityLogs && dispute.activityLogs.length >= 2, "Chronological activity log recorded");

  // 3. Add Evidence
  const evAdded = addDisputeEvidence(
    dispute.id,
    "Signed Acceptance Challan #DEL-8802",
    "delivery_proof"
  );
  assert.strictEqual(evAdded, true, "Evidence added successfully");

  // 4. Submit Buyer Response
  const respAdded = submitDisputeResponse(
    dispute.id,
    "buyer",
    "Integration team requested firmware patch v2.1 before releasing milestone payout."
  );
  assert.strictEqual(respAdded, true, "Buyer response recorded");

  // 5. Verify Neutral Rule-Based Summary Generation
  const summary = generateNeutralRuleSummary(dispute);
  assert.ok(summary.includes("INV-2026-089"), "Summary includes invoice number");
  assert.ok(summary.includes("Aura Robotics Systems"), "Summary includes counterparty");
  assert.ok(summary.includes("₹2,40,000"), "Summary includes formatted dispute value");

  // 6. Propose Settlement Offer
  const offerProposed = proposeDisputeSettlement(
    dispute.id,
    216000,
    "10% credit credit concession; ₹2,16,000 released within 5 business days upon patch deployment."
  );
  assert.strictEqual(offerProposed, true, "Settlement offer recorded");

  // 7. Accept Settlement Offer
  const accepted = acceptDisputeSettlement(dispute.id);
  assert.strictEqual(accepted, true, "Settlement accepted");

  // 8. Track Partial Settlement Payment
  const partialPaid = recordSettlementPayment(dispute.id, 100000);
  assert.strictEqual(partialPaid, true, "Partial payment recorded");

  // 9. Track Final Settlement Completion
  const fullyPaid = recordSettlementPayment(dispute.id, 116000);
  assert.strictEqual(fullyPaid, true, "Final settlement payment recorded");

  // 10. Test ODR Escalation on separate case
  const dispute2 = createDispute({
    counterpartyName: "Deadlock Tech",
    invoiceNumber: "INV-2026-999",
    disputeAmount: 150000,
    originalDueDate: "2026-09-15",
    issueCategory: "delayed_payment",
    sellerStatement: "Payment 40 days overdue with refusal to respond.",
  });

  const escalated = escalateDisputeToODR(dispute2.id);
  assert.strictEqual(escalated, true, "Case escalated to MSME ODR");
});
