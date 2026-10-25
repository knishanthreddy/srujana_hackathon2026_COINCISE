import type { GovernmentScheme } from "./schemes-data.ts";
import { getOnboardingData } from "./onboarding-service.ts";

export type SchemeMatchLevel =
  | "Eligibility Criteria Met"
  | "Potential Match"
  | "More Information Required"
  | "Status Unverified";

export interface SchemeMatchResult {
  scheme: GovernmentScheme;
  matchScore: number; // 0 to 100
  matchLevel: SchemeMatchLevel;
  reasons: string[];
  isRecommended: boolean;
}

export function evaluateSchemeMatch(
  scheme: GovernmentScheme,
  userProfile = getOnboardingData().profile
): SchemeMatchResult {
  let score = 50; // base potential match
  const reasons: string[] = [];

  const userState = (userProfile.state || "Karnataka").toLowerCase().trim();
  const userIndustry = ((userProfile as any).industry || (userProfile as any).industryCategory || "Manufacturing").toLowerCase().trim();
  const userEntity = (userProfile.entityType || "Private Limited").toLowerCase().trim();
  const hasUdyam = Boolean(userProfile.gstin || userProfile.cin);

  // 1. Geographic / State Match
  const isPanIndia = scheme.targetStates.some((s) => s.toLowerCase() === "all india");
  const stateMatch = scheme.targetStates.some((s) => s.toLowerCase() === userState);

  if (stateMatch && !isPanIndia) {
    score += 25;
    reasons.push(`Targeted State Incentive: Exclusively available for businesses operating in ${userProfile.state || "Karnataka"}.`);
  } else if (isPanIndia) {
    score += 10;
    reasons.push("Pan-India Program: Open to eligible businesses nationwide.");
  } else {
    score -= 30;
  }

  // 2. Industry Match
  const isAllIndustries = scheme.targetIndustries.some((i) => i.toLowerCase() === "all");
  const industryMatch = scheme.targetIndustries.some((i) =>
    userIndustry.includes(i.toLowerCase()) || i.toLowerCase().includes(userIndustry)
  );

  if (industryMatch && !isAllIndustries) {
    score += 20;
    reasons.push(`Sector Fit: Tailored for your ${(userProfile as any).industry || (userProfile as any).industryCategory || "Manufacturing"} sector.`);
  } else if (isAllIndustries) {
    score += 10;
    reasons.push("Universal Sector: Applies across manufacturing, engineering, and service enterprises.");
  } else {
    score -= 15;
  }

  // 3. Entity Type Match
  const isAllEntities = scheme.eligibleEntityTypes.some((e) => e.toLowerCase() === "all");
  const entityMatch = scheme.eligibleEntityTypes.some((e) =>
    userEntity.includes(e.toLowerCase()) || e.toLowerCase().includes(userEntity)
  );

  if (entityMatch || isAllEntities) {
    score += 10;
    reasons.push(`Eligible Structure: Compatible with ${userProfile.entityType || "Private Limited Company"} entities.`);
  }

  // 4. Udyam Registration
  if (scheme.udyamRequired) {
    if (hasUdyam) {
      score += 15;
      reasons.push("Statutory Requirement: Verified Udyam/MCA corporate registration meets scheme prerequisite.");
    } else {
      score -= 10;
      reasons.push("Udyam registration required prior to final grant disbursement.");
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));

  let matchLevel: SchemeMatchLevel = "Potential Match";
  if (scheme.status === "unverified_update_pending") {
    matchLevel = "Status Unverified";
  } else if (finalScore >= 80) {
    matchLevel = "Eligibility Criteria Met";
  } else if (finalScore >= 60) {
    matchLevel = "Potential Match";
  } else {
    matchLevel = "More Information Required";
  }

  const isRecommended = finalScore >= 70;

  return {
    scheme,
    matchScore: finalScore,
    matchLevel,
    reasons,
    isRecommended,
  };
}

/**
 * Evaluates all verified schemes against active business profile.
 */
export function matchAllSchemes(
  schemes: GovernmentScheme[],
  userProfile = getOnboardingData().profile
): SchemeMatchResult[] {
  return schemes
    .map((s) => evaluateSchemeMatch(s, userProfile))
    .sort((a, b) => b.matchScore - a.matchScore);
}
