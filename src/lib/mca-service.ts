/**
 * Ministry of Corporate Affairs (MCA) Lookup & Verification Helper
 *
 * Rules:
 * - Validates CIN format without assuming automated API availability.
 * - Never bypasses CAPTCHA or access restrictions.
 * - Provides verified seed matches for registered corporate demonstration entities.
 * - Always allows manual entry with link to official https://www.mca.gov.in/.
 * - Never falsely claims a company is government-verified without reliable data.
 */

export const MCA_OFFICIAL_PORTAL_URL = "https://www.mca.gov.in/content/mca/global/en/home.html";
export const MCA_MASTER_DATA_URL = "https://www.mca.gov.in/content/mca/global/en/mca/fo-library/company-llp-master-data.html";

// Standard Indian Corporate Identity Number (CIN) format regex:
// 1 character (L or U) + 5 digits + 2 letters (State) + 4 digits (Year) + 3 letters (Type e.g. PTC/PLC) + 6 digits (Reg #)
export const CIN_REGEX = /^[ULul][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;

export interface MCALookupResult {
  found: boolean;
  source: "mca_registry_sample" | "manual_entry" | "format_validated_only";
  cin?: string;
  companyName?: string;
  rocCode?: string;
  registrationNumber?: string;
  companyCategory?: string;
  classOfCompany?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  authorizedCapital?: number;
  paidUpCapital?: number;
  message: string;
}

// Sample verified registry data for demonstration purposes
const KNOWN_MCA_COMPANIES: Record<string, Partial<MCALookupResult>> = {
  "U72900KA2021PTC148892": {
    cin: "U72900KA2021PTC148892",
    companyName: "APEX ENGINEERING & AUTOMATION PRIVATE LIMITED",
    rocCode: "RoC-Bangalore",
    registrationNumber: "148892",
    companyCategory: "Company limited by shares",
    classOfCompany: "Private Limited",
    dateOfIncorporation: "2021-06-18",
    registeredAddress: "Plot No. 42, Peenya Industrial Area, 2nd Stage, Bangalore, Karnataka - 560058",
    authorizedCapital: 2500000,
    paidUpCapital: 1000000,
  },
  "U29100MH2019PTC324110": {
    cin: "U29100MH2019PTC324110",
    companyName: "ZENITH AERO PRECISION COMPONENTS PRIVATE LIMITED",
    rocCode: "RoC-Mumbai",
    registrationNumber: "324110",
    companyCategory: "Company limited by shares",
    classOfCompany: "Private Limited",
    dateOfIncorporation: "2019-04-12",
    registeredAddress: "Unit 14, MIDC Industrial Corridor, Andheri East, Mumbai, Maharashtra - 400093",
    authorizedCapital: 5000000,
    paidUpCapital: 2500000,
  },
  "U28999DL2018PTC339841": {
    cin: "U28999DL2018PTC339841",
    companyName: "BHARAT METALS & TOOLING PRIVATE LIMITED",
    rocCode: "RoC-Delhi",
    registrationNumber: "339841",
    companyCategory: "Company limited by shares",
    classOfCompany: "Private Limited",
    dateOfIncorporation: "2018-09-24",
    registeredAddress: "B-22, Okhla Industrial Area, Phase II, New Delhi, Delhi - 110020",
    authorizedCapital: 10000000,
    paidUpCapital: 7500000,
  },
};

/**
 * Validates the syntactic structure of an Indian CIN
 */
export function validateCINFormat(cin: string): { isValid: boolean; explanation?: string } {
  const cleaned = cin.trim().toUpperCase();
  if (!cleaned) {
    return { isValid: false, explanation: "CIN is required for incorporated corporate entities." };
  }

  if (cleaned.length !== 21) {
    return {
      isValid: false,
      explanation: `CIN must be exactly 21 characters long (current length: ${cleaned.length}).`,
    };
  }

  if (!CIN_REGEX.test(cleaned)) {
    return {
      isValid: false,
      explanation: "CIN format invalid. Expected: [U/L][5 digits][2-letter State][4-digit Year][3 letters][6-digit Reg Number] (e.g. U72900KA2021PTC148892).",
    };
  }

  return { isValid: true };
}

/**
 * Searches MCA database by CIN or Company Name.
 * If live automated API access is restricted by CAPTCHA, provides honest fallback.
 */
export function searchMCACompany(query: string): MCALookupResult {
  const q = query.trim().toUpperCase();

  // 1. Direct CIN Lookup
  if (KNOWN_MCA_COMPANIES[q]) {
    const item = KNOWN_MCA_COMPANIES[q];
    return {
      found: true,
      source: "mca_registry_sample",
      cin: item.cin,
      companyName: item.companyName,
      rocCode: item.rocCode,
      registrationNumber: item.registrationNumber,
      companyCategory: item.companyCategory,
      classOfCompany: item.classOfCompany,
      dateOfIncorporation: item.dateOfIncorporation,
      registeredAddress: item.registeredAddress,
      authorizedCapital: item.authorizedCapital,
      paidUpCapital: item.paidUpCapital,
      message: "Company record successfully retrieved from MCA master records sample.",
    };
  }

  // 2. Name Lookup against known sample records
  for (const item of Object.values(KNOWN_MCA_COMPANIES)) {
    if (item.companyName && (item.companyName.includes(q) || q.includes(item.companyName))) {
      return {
        found: true,
        source: "mca_registry_sample",
        ...item,
        message: "Company record matched by legal entity name.",
      };
    }
  }

  // 3. Format Validation Only Fallback
  if (CIN_REGEX.test(q)) {
    return {
      found: false,
      source: "format_validated_only",
      cin: q,
      message: "Valid CIN format recognized. Live automated MCA API is restricted by government CAPTCHA; please verify details manually or review on https://www.mca.gov.in/.",
    };
  }

  return {
    found: false,
    source: "manual_entry",
    message: "No automated MCA record found. Please enter company details manually or verify on https://www.mca.gov.in/.",
  };
}
