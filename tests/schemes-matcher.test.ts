import { test } from "node:test";
import assert from "node:assert";
import { VERIFIED_GOVERNMENT_SCHEMES } from "../src/lib/schemes-data.ts";
import { evaluateSchemeMatch, matchAllSchemes } from "../src/lib/schemes-matcher.ts";

test("Personalized Match: Karnataka Manufacturing MSME qualifies for Karnataka Industrial Subsidy", () => {
  const karnatakaScheme = VERIFIED_GOVERNMENT_SCHEMES.find(
    (s) => s.id === "scheme-karnataka-psi"
  )!;

  const mockProfile = {
    mcaLegalName: "Bangalore Precision Engineering Pvt Ltd",
    tradeName: "Bangalore Precision",
    industryCategory: "Manufacturing",
    state: "Karnataka",
    entityType: "Private Limited",
    gstin: "29AAACB1122R1Z1",
    cin: "U29304KA2023PTC174829",
  };

  const match = evaluateSchemeMatch(karnatakaScheme, mockProfile as any);

  assert.ok(match.matchScore >= 80, `Score must be >= 80, was ${match.matchScore}`);
  assert.strictEqual(match.matchLevel, "Eligibility Criteria Met");
  assert.strictEqual(match.isRecommended, true);
  assert.ok(
    match.reasons.some((r) => r.includes("Karnataka")),
    "Should explain Karnataka location match"
  );
});

test("Pan-India Scheme Matching: CGTMSE matches all solvent micro/small enterprises", () => {
  const cgtmse = VERIFIED_GOVERNMENT_SCHEMES.find(
    (s) => s.id === "scheme-cgtmse"
  )!;

  const mockProfile = {
    mcaLegalName: "Zenith Services LLP",
    industryCategory: "Services",
    state: "Maharashtra",
    entityType: "LLP",
    gstin: "27AAACZ9900R1Z2",
  };

  const match = evaluateSchemeMatch(cgtmse, mockProfile as any);

  assert.ok(match.matchScore >= 70, `Score must be >= 70, was ${match.matchScore}`);
  assert.ok(
    match.matchLevel === "Eligibility Criteria Met" || match.matchLevel === "Potential Match"
  );
  assert.ok(
    match.reasons.some((r) => r.includes("Pan-India")),
    "Should identify Pan-India accessibility"
  );
});

test("State Mismatch Penalty: Non-matching state incentives receive lower rank", () => {
  const karnatakaScheme = VERIFIED_GOVERNMENT_SCHEMES.find(
    (s) => s.id === "scheme-karnataka-psi"
  )!;

  const maharashtraProfile = {
    mcaLegalName: "Mumbai Exports Ltd",
    industryCategory: "Trading",
    state: "Maharashtra",
    entityType: "Public Limited",
  };

  const match = evaluateSchemeMatch(karnatakaScheme, maharashtraProfile as any);
  assert.ok(
    match.matchScore < 60,
    `Score for wrong state must be low (<60), was ${match.matchScore}`
  );
  assert.strictEqual(match.matchLevel, "More Information Required");
});

test("Scheme Ranking: matchAllSchemes sorts by match score descending", () => {
  const mockProfile = {
    industryCategory: "Manufacturing",
    state: "Karnataka",
    entityType: "Private Limited",
    gstin: "29AAACB1122R1Z1",
  };

  const ranked = matchAllSchemes(VERIFIED_GOVERNMENT_SCHEMES, mockProfile as any);
  assert.ok(ranked.length > 0);

  for (let i = 0; i < ranked.length - 1; i++) {
    assert.ok(
      ranked[i].matchScore >= ranked[i + 1].matchScore,
      `Ranked list must be descending: ${ranked[i].matchScore} >= ${ranked[i + 1].matchScore}`
    );
  }
});
