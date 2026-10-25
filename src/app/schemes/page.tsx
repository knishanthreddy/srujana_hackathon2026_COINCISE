"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Landmark,
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  CheckCircle2,
  Check,
  AlertTriangle,
  Building2,
  Sparkles,
  Info,
  X,
  ShieldCheck,
  FileText,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
} from "lucide-react";
import {
  VERIFIED_GOVERNMENT_SCHEMES,
  GovernmentScheme,
  SchemeCategory,
} from "@/lib/schemes-data";
import {
  evaluateSchemeMatch,
  matchAllSchemes,
  SchemeMatchResult,
} from "@/lib/schemes-matcher";
import { getOnboardingData } from "@/lib/onboarding-service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

const STORAGE_KEY_SAVED_SCHEMES = "coincise_saved_schemes_v1";

export default function SchemesPage() {
  const [profile, setProfile] = useState(getOnboardingData().profile);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [savedSchemeIds, setSavedSchemeIds] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<SchemeMatchResult | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    setProfile(getOnboardingData().profile);
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_SCHEMES);
      if (raw) setSavedSchemeIds(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const toggleSaveScheme = (id: string) => {
    setSavedSchemeIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY_SAVED_SCHEMES, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const matchedSchemes = useMemo(() => {
    return matchAllSchemes(VERIFIED_GOVERNMENT_SCHEMES, profile);
  }, [profile]);

  const filteredMatches = useMemo(() => {
    return matchedSchemes.filter(({ scheme, isRecommended }) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        scheme.name.toLowerCase().includes(search) ||
        scheme.ministry.toLowerCase().includes(search) ||
        scheme.briefDescription.toLowerCase().includes(search) ||
        scheme.benefitType.toLowerCase().includes(search);

      if (!matchSearch) return false;

      // Category tab
      if (activeCategory === "recommended") {
        if (!isRecommended) return false;
      } else if (activeCategory === "saved") {
        if (!savedSchemeIds.includes(scheme.id)) return false;
      } else if (activeCategory !== "all") {
        if (scheme.category !== activeCategory) return false;
      }

      // State Filter
      if (stateFilter !== "all") {
        const isPanIndia = scheme.targetStates.some((s) => s.toLowerCase() === "all india");
        const matchSpecific = scheme.targetStates.some((s) => s.toLowerCase() === stateFilter.toLowerCase());
        if (!isPanIndia && !matchSpecific) return false;
      }

      return true;
    });
  }, [matchedSchemes, searchTerm, activeCategory, stateFilter, savedSchemeIds]);

  const handleOpenDetail = (match: SchemeMatchResult) => {
    setSelectedMatch(match);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#242321] tracking-tight">
              Government Schemes & Subsidies
            </h1>
            <Badge variant="teal" className="text-xs font-semibold">
              Official Portals
            </Badge>
          </div>
          <p className="text-xs text-[#7A7369] mt-0.5">
            Discover verified grants, capital subsidies, and credit guarantees aligned with your industry, state, and MSME profile.
          </p>
        </div>

        {/* Source Badges */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] text-[#7A7369]">
          <span className="font-semibold text-[#242321]">Sources:</span>
          <span className="px-2 py-0.5 bg-white rounded-lg border border-[#E8E1D5] font-mono">myScheme</span>
          <span className="px-2 py-0.5 bg-white rounded-lg border border-[#E8E1D5] font-mono">msme.gov.in</span>
          <span className="px-2 py-0.5 bg-white rounded-lg border border-[#E8E1D5] font-mono">Startup India</span>
        </div>
      </div>

      {/* User Profile Alignment Strip */}
      <Card className="p-4 bg-white border border-[#E8E1D5] rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#242321] text-sm">
                  {profile.tradeName || profile.mcaLegalName || "Acme Precision Technologies"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#DDEFE8] text-[#138C83] rounded-full border border-[#138C83]/20">
                  Udyam Eligible
                </span>
              </div>
              <p className="text-[#7A7369] text-[11px] mt-0.5">
                Sector: <strong>{profile.industry || (profile as any).industryCategory || "Manufacturing & Precision Tooling"}</strong> • State:{" "}
                <strong>{profile.state || "Karnataka"}</strong> • Entity:{" "}
                <strong>{profile.entityType || "Private Limited"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-[11px] text-[#7A7369]">Matching against your profile</span>
            <Link href="/settings" className="text-xs font-semibold text-[#F15A35] hover:underline">
              Edit Settings &rarr;
            </Link>
          </div>
        </div>
      </Card>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: "All Schemes", value: "all" },
            { label: "Recommended For You", value: "recommended" },
            { label: `Saved (${savedSchemeIds.length})`, value: "saved" },
            { label: "Credit Guarantees", value: "credit_guarantee" },
            { label: "MSME Support", value: "msme_support" },
            { label: "Technology Adoption", value: "technology_adoption" },
            { label: "Startup Programs", value: "startup_support" },
            { label: "State Incentives", value: "state_incentives" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === tab.value
                  ? "bg-[#242321] text-white shadow-xs"
                  : "bg-white text-[#7A7369] border border-[#E8E1D5] hover:text-[#242321]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7A7369]" />
            <input
              type="text"
              placeholder="Search scheme name, ministry, or benefit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#E8E1D5] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#242321] outline-none focus:border-[#F15A35]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="text-[#7A7369] text-[11px]">Region:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="bg-white border border-[#E8E1D5] rounded-xl px-2.5 py-1 text-xs text-[#242321] outline-none focus:border-[#F15A35]"
            >
              <option value="all">All India & States</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Delhi">Delhi NCR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schemes Grid */}
      {filteredMatches.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-[#E8E1D5] rounded-3xl">
          <Landmark className="w-10 h-10 text-[#7A7369]/50 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-[#242321]">No schemes match your filter</h3>
          <p className="text-xs text-[#7A7369] mt-0.5 max-w-sm mx-auto">
            Try resetting your search query or selecting &quot;All Schemes&quot; to view all central and state programs.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setActiveCategory("all");
              setStateFilter("all");
            }}
            className="mt-4 rounded-xl text-xs border-[#E8E1D5]"
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMatches.map((match) => {
            const { scheme, matchScore, matchLevel, reasons } = match;
            const isSaved = savedSchemeIds.includes(scheme.id);

            return (
              <Card
                key={scheme.id}
                className="p-5 bg-white border border-[#E8E1D5] hover:border-[#F15A35]/40 rounded-3xl shadow-xs flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Top Bar: Ministry & Bookmark */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-semibold text-[#7A7369] line-clamp-1">
                      {scheme.ministry}
                    </span>
                    <button
                      onClick={() => toggleSaveScheme(scheme.id)}
                      className="p-1 text-[#7A7369] hover:text-[#F15A35] transition-colors shrink-0"
                      title={isSaved ? "Remove from saved" : "Save scheme"}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-[#F15A35]" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Scheme Title */}
                  <h3 className="font-bold text-sm text-[#242321] line-clamp-2 leading-snug">
                    {scheme.name}
                  </h3>

                  {/* Benefit Badge & Highlight */}
                  <div className="mt-3 p-3 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5]/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7369]">
                        {scheme.benefitType}
                      </span>
                      <span className="text-[10px] font-mono text-[#138C83] font-bold">
                        Verified
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#242321] line-clamp-2 leading-tight">
                      {scheme.verifiedBenefitAmount}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#7A7369] mt-3 line-clamp-2 leading-relaxed">
                    {scheme.briefDescription}
                  </p>

                  {/* Match Evaluation Pill & Reason */}
                  <div className="mt-4 pt-3 border-t border-[#E8E1D5]/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          matchLevel === "Eligibility Criteria Met"
                            ? "bg-[#DDEFE8] text-[#138C83]"
                            : matchLevel === "Potential Match"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5]"
                        }`}
                      >
                        {matchLevel === "Eligibility Criteria Met" && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {matchLevel} ({matchScore}%)
                      </span>

                      <span className="text-[10px] text-[#A69C8D]">
                        {scheme.targetStates.join(", ")}
                      </span>
                    </div>

                    {reasons[0] && (
                      <p className="text-[11px] text-[#242321] line-clamp-1 italic">
                        &bull; {reasons[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-5 pt-3 border-t border-[#E8E1D5]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetail(match)}
                    className="w-full rounded-xl text-xs flex items-center justify-center gap-1.5 hover:border-[#F15A35] hover:text-[#F15A35] transition-colors"
                  >
                    View Details & Eligibility
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Scheme Detail Modal */}
      {selectedMatch && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedMatch.scheme.name}
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Ministry & Category Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#7A7369] bg-[#F7F3EA] px-2.5 py-1 rounded-lg border border-[#E8E1D5]">
                {selectedMatch.scheme.ministry}
              </span>
              <span className="text-xs font-bold text-[#F15A35] bg-[#FCE4D8] px-2.5 py-1 rounded-lg border border-[#F15A35]/20">
                {selectedMatch.scheme.benefitType}
              </span>
              <span className="text-xs font-mono text-[#7A7369] ml-auto">
                Verified: {selectedMatch.scheme.lastVerifiedDate}
              </span>
            </div>

            {/* Benefit Highlight Box */}
            <div className="p-4 bg-[#DDEFE8]/40 border border-[#138C83]/30 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-[#138C83] uppercase tracking-wider block">
                Verified Benefit & Financial Support
              </span>
              <p className="text-sm font-bold text-[#242321]">
                {selectedMatch.scheme.verifiedBenefitAmount}
              </p>
              <p className="text-xs text-[#7A7369] mt-1">
                Agency: <strong>{selectedMatch.scheme.implementingAgency}</strong>
              </p>
            </div>

            {/* Description */}
            <div>
              <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block mb-1">
                Description & Objectives
              </span>
              <p className="text-xs text-[#242321] leading-relaxed">
                {selectedMatch.scheme.briefDescription}
              </p>
            </div>

            {/* Personal Alignment Analysis */}
            <div className="p-3.5 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5] space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#F15A35]" />
                <span className="font-bold text-[#242321]">
                  Why this matches your business ({selectedMatch.matchScore}% Score):
                </span>
              </div>
              <ul className="space-y-1 text-[#7A7369] text-xs">
                {selectedMatch.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#138C83] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Eligibility Criteria */}
            <div>
              <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block mb-1">
                Key Eligibility Criteria
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#242321]">
                {selectedMatch.scheme.eligibilityCriteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Required Documents */}
            <div>
              <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block mb-1">
                Required Documentation
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {selectedMatch.scheme.requiredDocuments.map((doc, i) => (
                  <div
                    key={i}
                    className="p-2 bg-[#F7F3EA] rounded-xl border border-[#E8E1D5] flex items-center gap-2 text-[11px] text-[#242321]"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#7A7369] shrink-0" />
                    <span className="line-clamp-1">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Walkthrough */}
            <div>
              <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block mb-1">
                Step-by-Step Application Process
              </span>
              <ol className="space-y-1.5 text-xs text-[#242321]">
                {selectedMatch.scheme.applicationSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#E8E1D5] text-[#242321] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Security & Official Portal Disclaimer */}
            <div className="p-3 bg-[#FCE4D8]/30 rounded-2xl border border-[#F15A35]/20 text-[11px] text-[#7A7369] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#F15A35] shrink-0 mt-0.5" />
              <span>
                <strong>Official Portal Submission:</strong> COINCISE is an informational guidance tool. Applications must be completed on official government platforms. Never share banking passwords or OTPs on non-government portals.
              </span>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-[#E8E1D5] flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSaveScheme(selectedMatch.scheme.id)}
                className="rounded-xl text-xs flex items-center gap-1.5 border-[#E8E1D5]"
              >
                {savedSchemeIds.includes(selectedMatch.scheme.id) ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-[#F15A35]" /> Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" /> Save Opportunity
                  </>
                )}
              </Button>

              <a
                href={selectedMatch.scheme.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F15A35] text-white hover:bg-[#d94825] shadow-sm transition-colors"
              >
                Open Official Portal
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
