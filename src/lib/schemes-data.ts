export type SchemeCategory =
  | "msme_support"
  | "startup_support"
  | "credit_guarantee"
  | "manufacturing"
  | "technology_adoption"
  | "agriculture_food"
  | "exports"
  | "renewable_energy"
  | "rd_innovation"
  | "skill_development"
  | "state_incentives";

export type AssistanceType =
  | "Grant"
  | "Capital Subsidy"
  | "Interest Subsidy"
  | "Credit Guarantee"
  | "Concessional Loan"
  | "Reimbursement"
  | "Tax Benefit";

export type SchemeVerificationStatus = "active_verified" | "open" | "unverified_update_pending";

export interface GovernmentScheme {
  id: string;
  name: string;
  code: string;
  ministry: string;
  implementingAgency: string;
  category: SchemeCategory;
  briefDescription: string;
  targetBeneficiaries: string;
  eligibilityCriteria: string[];
  benefitType: AssistanceType;
  verifiedBenefitAmount: string;
  requiredDocuments: string[];
  applicationSteps: string[];
  officialUrl: string;
  sourcePortal: string;
  lastVerifiedDate: string; // YYYY-MM-DD
  status: SchemeVerificationStatus;
  targetIndustries: string[]; // ['All'] or specific
  targetStates: string[]; // ['All India'] or specific states
  eligibleEntityTypes: string[]; // ['Pvt Ltd', 'LLP', 'Partnership', 'Sole Proprietorship', 'All']
  minVintageYears?: number;
  maxTurnoverCrores?: number;
  udyamRequired: boolean;
}

export const VERIFIED_GOVERNMENT_SCHEMES: GovernmentScheme[] = [
  {
    id: "scheme-cgtmse",
    name: "Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)",
    code: "CGTMSE-2024",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    implementingAgency: "CGTMSE & Scheduled Commercial Banks / SIDBI",
    category: "credit_guarantee",
    briefDescription:
      "Provides third-party collateral-free credit guarantee coverage for term loans and working capital credit facilities extended to micro and small enterprises.",
    targetBeneficiaries: "New and existing Micro and Small Enterprises in Manufacturing and Services sectors.",
    eligibilityCriteria: [
      "Must be an eligible Micro or Small Enterprise under MSMED Act definition",
      "Valid Udyam Registration Certificate is mandatory",
      "Project must be financially viable as assessed by lending institution",
      "Retail trade, educational institutions, and SHGs are subject to specific sub-limits",
    ],
    benefitType: "Credit Guarantee",
    verifiedBenefitAmount: "Collateral-free credit guarantee up to ₹5.00 Crore with 75% to 85% guarantee coverage.",
    requiredDocuments: [
      "Udyam Registration Certificate",
      "Project Report / Detailed Business Plan",
      "Past 2–3 years Audited Financials & ITR (for existing units)",
      "Bank Account Statements (Past 12 months)",
      "KYC of Directors / Partners / Proprietor",
    ],
    applicationSteps: [
      "Prepare detailed project report with capital expenditure and working capital estimates.",
      "Approach any scheduled commercial bank, RRB, or SIDBI branch offering CGTMSE loans.",
      "Lending institution reviews sanction and applies for CGTMSE guarantee cover directly on the portal.",
    ],
    officialUrl: "https://www.cgtmse.in/",
    sourcePortal: "msme.gov.in & cgtmse.in",
    lastVerifiedDate: "2026-10-15",
    status: "active_verified",
    targetIndustries: ["All"],
    targetStates: ["All India"],
    eligibleEntityTypes: ["All"],
    maxTurnoverCrores: 50,
    udyamRequired: true,
  },
  {
    id: "scheme-pmegp",
    name: "Prime Minister's Employment Generation Programme (PMEGP)",
    code: "PMEGP-KVIC",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    implementingAgency: "Khadi and Village Industries Commission (KVIC) & State KVIB / DIC",
    category: "msme_support",
    briefDescription:
      "A credit-linked subsidy programme to generate self-employment opportunities through establishment of micro-enterprises in non-farm sector.",
    targetBeneficiaries: "Individuals, Self Help Groups, and new Micro Enterprises above 18 years of age.",
    eligibilityCriteria: [
      "Any individual above 18 years of age (at least 8th standard pass for projects above ₹10 Lakh in manufacturing)",
      "Only for new micro-units (existing units or units having availed other government subsidies are ineligible)",
      "Manufacturing sector projects up to ₹50 Lakh and Service sector up to ₹20 Lakh",
    ],
    benefitType: "Capital Subsidy",
    verifiedBenefitAmount: "Margin money subsidy of 15% to 35% of total project cost (up to ₹17.5 Lakh in rural areas).",
    requiredDocuments: [
      "Aadhaar Card and PAN",
      "Detailed Project Report (DPR)",
      "Highest Educational Qualification Certificate",
      "Special Category / Caste Certificate (if claiming 25% or 35% subsidy)",
      "Rural Area Certificate (issued by Gram Panchayat / BDO)",
    ],
    applicationSteps: [
      "Submit online application on official PMEGP e-Portal (kviconline.gov.in/pmegpeportal).",
      "District Level Task Force Committee (DLTFC) scrutinizes the proposal.",
      "Forwarded to financing bank for loan sanction and EDP training completion.",
      "Subsidy deposited into 3-year lock-in Term Deposit Receipt (TDR) by KVIC.",
    ],
    officialUrl: "https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp",
    sourcePortal: "myscheme.gov.in & kviconline.gov.in",
    lastVerifiedDate: "2026-10-10",
    status: "active_verified",
    targetIndustries: ["Manufacturing", "Services", "Food Processing", "Textiles", "Engineering"],
    targetStates: ["All India"],
    eligibleEntityTypes: ["Sole Proprietorship", "Partnership", "Self Help Groups"],
    udyamRequired: false,
  },
  {
    id: "scheme-mudra",
    name: "Pradhan Mantri MUDRA Yojana (PMMY)",
    code: "PMMY-MUDRA",
    ministry: "Ministry of Finance (Department of Financial Services)",
    implementingAgency: "MUDRA Ltd, Commercial Banks, NBFCs, MFIs",
    category: "credit_guarantee",
    briefDescription:
      "Provides collateral-free working capital and term loans to non-corporate, non-farm small and micro enterprises.",
    targetBeneficiaries: "Small business owners, shopkeepers, artisanal units, repair shops, and MSMEs.",
    eligibilityCriteria: [
      "Non-corporate small business enterprises in rural and urban areas",
      "Clean credit record with participating lending institution",
      "Covers Shishu (up to ₹50,000), Kishore (₹50,000 to ₹5 Lakh), Tarun (₹5 Lakh to ₹10 Lakh), and Tarun Plus (up to ₹20 Lakh)",
    ],
    benefitType: "Concessional Loan",
    verifiedBenefitAmount: "Collateral-free institutional financing up to ₹20 Lakh with concessional interest rates.",
    requiredDocuments: [
      "Proof of Identity & Address (Aadhaar / Voter ID)",
      "Proof of Business Enterprise (Udyam, Trade License, GST)",
      "Past 6 months Bank Account Statement",
      "Quotation of machinery or items to be purchased",
    ],
    applicationSteps: [
      "Apply through the official Udyamimitra portal (udyamimitra.in) or directly at any commercial bank.",
      "Select loan tier (Shishu, Kishore, Tarun, Tarun Plus).",
      "Sanctioned funds disbursed directly to borrower's account or machinery supplier.",
    ],
    officialUrl: "https://www.mudra.org.in/",
    sourcePortal: "myscheme.gov.in & mudra.org.in",
    lastVerifiedDate: "2026-10-05",
    status: "active_verified",
    targetIndustries: ["All"],
    targetStates: ["All India"],
    eligibleEntityTypes: ["All"],
    udyamRequired: false,
  },
  {
    id: "scheme-zed",
    name: "MSME Sustainable (ZED) Certification Scheme",
    code: "ZED-MSME",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    implementingAgency: "Quality Council of India (QCI) & Ministry of MSME",
    category: "technology_adoption",
    briefDescription:
      "Promotes Zero Defect and Zero Effect manufacturing practices among MSMEs with substantial financial assistance for certification.",
    targetBeneficiaries: "Manufacturing MSMEs with valid Udyam Registration.",
    eligibilityCriteria: [
      "Manufacturing MSME registered with Udyam Portal",
      "Willingness to undertake assessment across Bronze, Silver, or Gold ZED levels",
    ],
    benefitType: "Capital Subsidy",
    verifiedBenefitAmount: "Financial subsidy up to 80% for Micro, 60% for Small, and 50% for Medium enterprises on certification costs.",
    requiredDocuments: [
      "Udyam Registration Certificate",
      "Factory / Manufacturing Site Photographs",
      "Process Flowcharts and Quality Control documentation",
      "Electricity Bill and Factory License",
    ],
    applicationSteps: [
      "Register on the official ZED portal (zed.msme.gov.in) with Udyam number.",
      "Complete online self-assessment pledge.",
      "Undergo desktop and site assessment by accredited assessment agency.",
      "Receive ZED Certification with applicable government subsidy reimbursed.",
    ],
    officialUrl: "https://zed.msme.gov.in/",
    sourcePortal: "msme.gov.in & zed.msme.gov.in",
    lastVerifiedDate: "2026-10-12",
    status: "active_verified",
    targetIndustries: ["Manufacturing", "Engineering", "Automotive", "Electronics", "Textiles", "Chemicals"],
    targetStates: ["All India"],
    eligibleEntityTypes: ["All"],
    udyamRequired: true,
  },
  {
    id: "scheme-sisfs",
    name: "Startup India Seed Fund Scheme (SISFS)",
    code: "SISFS-DPIIT",
    ministry: "Ministry of Commerce and Industry (DPIIT)",
    implementingAgency: "Startup India & Selected Sector Incubators",
    category: "startup_support",
    briefDescription:
      "Provides financial assistance to early-stage startups for proof of concept, prototype development, product trials, and market-entry commercialization.",
    targetBeneficiaries: "DPIIT-recognized startups incorporated not more than 2 years ago.",
    eligibilityCriteria: [
      "DPIIT recognized startup incorporated not more than 2 years ago at the time of application",
      "Must have a business idea to develop a product or service with market fit or viable commercialization",
      "Must not have received more than ₹10 Lakh of monetary support under other government schemes",
      "Indian promoters must hold at least 51% shareholding",
    ],
    benefitType: "Grant",
    verifiedBenefitAmount: "Grants up to ₹20 Lakh for validation of Proof of Concept/prototype, or up to ₹50 Lakh via debt/convertible debentures.",
    requiredDocuments: [
      "DPIIT Certificate of Recognition",
      "Certificate of Incorporation and MOA/AOA",
      "Pitch Deck / Business Plan demonstrating innovation",
      "Shareholding Pattern Certified by Chartered Accountant",
    ],
    applicationSteps: [
      "Login to Startup India portal (seedfund.startupindia.gov.in).",
      "Select up to 3 approved incubators in order of preference.",
      "Incubator Seed Management Committee evaluates pitch and sanctions funding.",
    ],
    officialUrl: "https://seedfund.startupindia.gov.in/",
    sourcePortal: "startupindia.gov.in",
    lastVerifiedDate: "2026-10-01",
    status: "active_verified",
    targetIndustries: ["Technology", "Healthcare", "Fintech", "AgriTech", "CleanTech", "AI", "Manufacturing"],
    targetStates: ["All India"],
    eligibleEntityTypes: ["Pvt Ltd", "LLP"],
    minVintageYears: 0,
    udyamRequired: false,
  },
  {
    id: "scheme-vishwakarma",
    name: "PM Vishwakarma Scheme",
    code: "PM-VISHWAKARMA",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    implementingAgency: "Ministry of Skill Development & MSME with Banks",
    category: "skill_development",
    briefDescription:
      "Holistic support for traditional artisans and craftspeople working with their hands and tools across 18 traditional family trades.",
    targetBeneficiaries: "Artisans, blacksmiths, carpenters, potters, sculptors, goldsmiths, and cobblers.",
    eligibilityCriteria: [
      "An artisan or craftsperson working in one of the 18 recognized traditional family trades",
      "Minimum age 18 years on date of registration",
      "One member per family eligible",
      "Should not have availed loans under PMEGP or MUDRA in the last 5 years",
    ],
    benefitType: "Concessional Loan",
    verifiedBenefitAmount: "Collateral-free credit support of ₹1 Lakh (Tranche 1) and ₹2 Lakh (Tranche 2) at concessional 5% interest + ₹15,000 toolkit grant.",
    requiredDocuments: [
      "Aadhaar Card and Mobile Linked with Aadhaar",
      "Bank Account Details (Passbook/Cancelled Cheque)",
      "Ration Card / Family Proof",
      "Trade Specific Self-declaration",
    ],
    applicationSteps: [
      "Enroll online through Common Service Centres (CSC) on pmvishwakarma.gov.in.",
      "Verification in three stages (Gram Panchayat/ULB, District Implementation Committee, Screening Committee).",
      "Basic skill training (5-7 days) with ₹500/day stipend followed by toolkit voucher.",
    ],
    officialUrl: "https://pmvishwakarma.gov.in/",
    sourcePortal: "pmvishwakarma.gov.in & myscheme.gov.in",
    lastVerifiedDate: "2026-09-28",
    status: "active_verified",
    targetIndustries: ["Handicrafts", "Metal Working", "Woodworking", "Leather", "Construction Trades"],
    targetStates: ["All India"],
    eligibleEntityTypes: ["Sole Proprietorship", "Individual"],
    udyamRequired: false,
  },
  {
    id: "scheme-karnataka-psi",
    name: "Karnataka Industrial Policy: Capital Investment Subsidy for MSMEs",
    code: "KAR-MSME-SUB",
    ministry: "Commerce & Industries Department, Government of Karnataka",
    implementingAgency: "District Industries Centre (DIC) Karnataka",
    category: "state_incentives",
    briefDescription:
      "State industrial incentive offering capital investment subsidy, stamp duty exemption, and electricity duty relief for manufacturing MSMEs.",
    targetBeneficiaries: "Micro, Small and Medium Manufacturing Enterprises set up in industrial zones across Karnataka.",
    eligibilityCriteria: [
      "New manufacturing unit set up in Zone 1, Zone 2, or Zone 3 of Karnataka Industrial Policy",
      "Registered on Karnataka e-Udyami portal and valid Udyam certificate",
      "Commenced commercial production within policy validity window",
    ],
    benefitType: "Capital Subsidy",
    verifiedBenefitAmount: "Up to 25% capital subsidy on value of fixed assets (VFA) up to ₹50 Lakh, plus 100% stamp duty exemption on land acquisition.",
    requiredDocuments: [
      "Udyam Registration Certificate & Karnataka e-Udyami Acknowledgment",
      "Project Report with Chartered Engineer valuation of plant & machinery",
      "Land purchase deed or KIADB allotment letter",
      "Consent for Operation (CFO) from KSPCB",
      "Power sanction letter and first electricity bill",
    ],
    applicationSteps: [
      "Submit application through Karnataka Single Window Portal (ebizkarnataka.gov.in).",
      "Joint physical inspection conducted by District Industries Centre (DIC).",
      "District Level Single Window Clearance Committee (DLSWCC) approves subsidy disbursement.",
    ],
    officialUrl: "https://kum.karnataka.gov.in/",
    sourcePortal: "kum.karnataka.gov.in",
    lastVerifiedDate: "2026-10-18",
    status: "active_verified",
    targetIndustries: ["Manufacturing", "Precision Engineering", "Electronics", "Automotive", "Textiles"],
    targetStates: ["Karnataka"],
    eligibleEntityTypes: ["All"],
    udyamRequired: true,
  },
  {
    id: "scheme-treds",
    name: "TReDS Platform Invoice Discounting Facilitation",
    code: "TREDS-RBI",
    ministry: "Ministry of MSME & Reserve Bank of India",
    implementingAgency: "RXIL, M1xchange, Invoicemart (RBI Authorized Exchanges)",
    category: "credit_guarantee",
    briefDescription:
      "Institutional invoice discounting mechanism enabling MSMEs to receive immediate liquidity against accepted invoices from corporate and PSU buyers without recourse.",
    targetBeneficiaries: "MSME suppliers dealing with Corporate buyers, CPSEs, and Government Departments.",
    eligibilityCriteria: [
      "MSME supplier with active Udyam Registration",
      "Goods or services supplied with acknowledged and accepted invoices/bills",
      "Buyer must be registered or onboarded on the TReDS exchange",
    ],
    benefitType: "Interest Subsidy",
    verifiedBenefitAmount: "Immediate payment within 48 hours at competitive market bidding rates (typically 7%–9% p.a.) without collateral or ledger encumbrance.",
    requiredDocuments: [
      "Udyam Certificate",
      "Company Registration & Board Resolution",
      "Accepted Customer Invoices and Delivery Proof (Lorry Receipt / Transporter Challan)",
      "Bank Account Mandate (NACH / e-Mandate)",
    ],
    applicationSteps: [
      "Onboard onto an RBI-licensed TReDS platform (e.g. RXIL, M1xchange).",
      "Upload verified customer invoices.",
      "Buyer accepts invoice online; multiple financiers bid for factoring rates.",
      "Funds credited directly to MSME account within T+1 days upon bid acceptance.",
    ],
    officialUrl: "https://www.rxil.in/",
    sourcePortal: "msme.gov.in & rbi.org.in",
    lastVerifiedDate: "2026-10-14",
    status: "active_verified",
    targetIndustries: ["All"],
    targetStates: ["All India"],
    eligibleEntityTypes: ["All"],
    udyamRequired: true,
  },
];
