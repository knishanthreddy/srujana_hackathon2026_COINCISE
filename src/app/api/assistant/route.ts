import { GoogleGenerativeAI } from "@google/generative-ai";

interface AssistantRequestBody {
  message: string;
  context?: {
    currentPath?: string;
    businessName?: string;
    availableCash?: number;
    minimumReserve?: number;
    credroScore?: number;
    credroTrustLevel?: string;
  };
}

/**
 * Built-in knowledge base for common user navigation questions.
 * Used for instant, zero-latency answers and as a robust fallback
 * when GEMINI_API_KEY is not configured or offline.
 */
const KNOWLEDGE_BASE_RESPONSES: Record<string, string> = {
  add_transaction:
    "To add a financial transaction:\n1. Click the '+ New Transaction' button in the top navigation header, or visit **Financial Records** from the sidebar.\n2. Choose **Income** or **Expense**.\n3. Enter the amount, payment status (Completed, Partially Paid, or Expected), category, and description.\n4. Click **Save Record**. Your available cash and forecast will update immediately.",

  find_receivables:
    "You can find and track your customer invoices under **Receivables** in the left sidebar menu (or visit `/receivables`).\nHere you can log new customer invoices, track partial payments, view overdue receivables, and record received disbursements.",

  credro_meaning:
    "Your **Credro™ Score** (0–100) is an operational trust metric that evaluates your business's financial health based on 5 transparent factors: Payment History (25%), Liquidity Cushion (25%), Cash-Flow Stability (20%), Financial Consistency (15%), and Outstanding Obligations (15%).\n\nIt is purely informational to give you financial visibility and does not act as a statutory credit report.",

  understand_forecast:
    "COINCISE forecasts cash using the deterministic formula:\n**Closing Cash = Opening Cash + Expected Inflows - Expected Outflows**.\n\nYou can view forecasts for 7, 30, 60, or 90 days on the **Dashboard** or the dedicated **Cash Forecast** page (`/forecast`). The dashed reference line represents your minimum safety cash reserve floor.",

  shortage_alert:
    "A **Cash Shortage / Reserve Dip Alert** appears when your projected closing cash balance is forecasted to fall below your declared Minimum Cash Reserve floor.\n\nTo address it, go to the **Decision Centre** (`/decision-centre`) to simulate corrective actions like accelerating customer collections or rescheduling non-critical supplier disbursements.",

  update_business_info:
    "To update your business profile, bank accounts, or forecast rules:\n1. Go to **Settings** (`/settings`) from the left sidebar.\n2. You can edit your Legal MCA Name, Trade Name, GSTIN, Bank Accounts, Minimum Cash Reserve, and Typical Growth Rate.\n3. Click **Save Changes** to update your business profile.",

  find_reports:
    "You can generate and export comprehensive financial summaries under **Reports & Analytics** (`/reports`) in the left sidebar.\nThis includes Income & Expense breakdowns, Cash-Flow Forecast summaries, Receivables & Payables ageing tables, and CSV exports.",
};

/**
 * Finds the best matching built-in knowledge response for common questions.
 */
function matchKnowledgeBase(query: string): string | null {
  const q = query.toLowerCase();

  if (q.includes("add") && (q.includes("transaction") || q.includes("record") || q.includes("income") || q.includes("expense"))) {
    return KNOWLEDGE_BASE_RESPONSES.add_transaction;
  }
  if (q.includes("receivable") || (q.includes("customer") && q.includes("invoice"))) {
    return KNOWLEDGE_BASE_RESPONSES.find_receivables;
  }
  if (q.includes("credro") || q.includes("trust score") || q.includes("score mean")) {
    return KNOWLEDGE_BASE_RESPONSES.credro_meaning;
  }
  if (q.includes("forecast") || q.includes("projected") || q.includes("understand my forecast")) {
    return KNOWLEDGE_BASE_RESPONSES.understand_forecast;
  }
  if (q.includes("shortage") || q.includes("alert") || q.includes("breach") || q.includes("dip")) {
    return KNOWLEDGE_BASE_RESPONSES.shortage_alert;
  }
  if (q.includes("update") || q.includes("company") || q.includes("business info") || q.includes("setting")) {
    return KNOWLEDGE_BASE_RESPONSES.update_business_info;
  }
  if (q.includes("report") || q.includes("analytics") || q.includes("export") || q.includes("csv")) {
    return KNOWLEDGE_BASE_RESPONSES.find_reports;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body: AssistantRequestBody = await req.json();
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return Response.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    // Server-side environment variable lookup
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // Context formatting for accurate application grounding
    const contextNote = body.context
      ? `Active Business Context:
- Current Page: ${body.context.currentPath || "/"}
- Business Trade Name: ${body.context.businessName || "Registered Business"}
- Available Operating Cash: ₹${(body.context.availableCash || 0).toLocaleString("en-IN")}
- Minimum Reserve Floor: ₹${(body.context.minimumReserve || 0).toLocaleString("en-IN")}
- Credro Trust Score: ${body.context.credroScore !== undefined ? `${body.context.credroScore}/100 (${body.context.credroTrustLevel || "Evaluated"})` : "Calculating"}`
      : "No live context provided.";

    // 1. If GEMINI_API_KEY is not configured:
    // Provide a friendly configuration instruction and fall back to the built-in knowledge base.
    if (!apiKey) {
      const fallbackAnswer = matchKnowledgeBase(userMessage);

      if (fallbackAnswer) {
        return Response.json({
          response: fallbackAnswer,
          isAIGenerated: false,
          configurationRequired: true,
          note: "Note: Live Gemini AI intelligence is currently unconfigured. To enable generative AI, add GEMINI_API_KEY to your .env.local file.",
        });
      }

      return Response.json({
        response:
          "Welcome to COINCISE Assistant! I can help you navigate the platform.\n\n" +
          "• **Financial Records** (`/records`): Add income/expenses and view your cash ledger.\n" +
          "• **Receivables & Payables** (`/receivables`, `/payables`): Track customer invoices and supplier bills.\n" +
          "• **Cash Forecast** (`/forecast`): View 7, 30, 60, and 90-day cash projections.\n" +
          "• **Credro™ Score**: See your operational trust rating on the dashboard.\n" +
          "• **Decision Centre** (`/decision-centre`): Test corrective actions for cash shortages.\n\n" +
          "*Tip: To enable live Gemini AI chat responses, add your `GEMINI_API_KEY` in `.env.local`.*",
        isAIGenerated: false,
        configurationRequired: true,
      });
    }

    // 2. If GEMINI_API_KEY is available:
    // Use the official Google Generative AI SDK with gemini-1.5-flash
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are the COINCISE Assistant, a helpful, friendly, and concise in-app guide for COINCISE (an AI-powered business finance and cash-flow management platform for Indian MSMEs).

ROLE AND MISSION:
- Help users understand and navigate the COINCISE web application.
- Explain where features are located, how calculations work, and what dashboard metrics mean.
- Keep responses short, direct, and easy to understand (usually 2-4 sentences or a concise bulleted list).
- Format responses in clean Markdown.

COINCISE NAVIGATION MAP:
- Dashboard ('/'): Live available cash, Credro Trust Score, 7/30/60/90-day cash-flow forecast chart, inflows vs outflows, recent transactions.
- Financial Records ('/records'): Add, edit, delete income/expense transactions, filter by status, export to CSV.
- Receivables ('/receivables'): Customer invoices, due dates, partial payments, overdue tracking.
- Payables ('/payables'): Vendor bills, payment schedules, disbursements.
- Cash Forecast ('/forecast'): Daily projected closing balances, reserve breaches, minimum cash reserve.
- Scenario Lab ('/scenarios'): Simulate customer payment delays, sales dips, emergency expenses, supplier term shifts.
- Smart Alerts ('/alerts'): Automated shortage detection, overdue invoice alerts.
- Decision Centre ('/decision-centre'): Simulate corrective actions like earlier customer collections.
- FairResolve ('/fairresolve'): Payment dispute resolution workflow with official MSME Samadhaan / ODR portal links.
- Reports & Analytics ('/reports'): Financial summaries, ageing reports, exportable CSVs.
- Settings ('/settings'): Business profile, bank accounts, minimum reserve, forecast assumptions.
- Onboarding ('/onboarding'): 5-step Business Setup Wizard with MCA CIN verification.

CREDRO TRUST SCORE:
- Summarizes financial reliability (0-100) across 5 transparent factors: Payment History (25%), Liquidity Cushion (25%), Cash-Flow Stability (20%), Financial Consistency (15%), Outstanding Obligations (15%).
- Levels: Excellent (85-100), Good (70-84), Fair (50-69), Low (0-49).

STRICT GUARDRAILS:
1. Never invent or hallucinate financial figures.
2. Never claim to have executed a financial transfer, edited records, or changed settings. You are an informational guide only.
3. If the user asks you to modify data or pay a bill, clearly guide them on how to do it themselves in the respective module.
4. If asked about loan approvals, explain that Credro is an internal operational visibility metric, not a statutory credit bureau guarantee.`,
      });

      const prompt = `${contextNote}\n\nUser Question: ${userMessage}`;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      return Response.json({
        response: responseText,
        isAIGenerated: true,
      });
    } catch (aiError: unknown) {
      console.error("Gemini API call failed:", aiError);
      // Graceful fallback to knowledge base on API error (e.g. quota, bad key)
      const fallback = matchKnowledgeBase(userMessage);

      return Response.json({
        response:
          (fallback ? fallback + "\n\n" : "") +
          "*(Notice: Live Gemini response could not be completed at this moment. Built-in navigation guidance was used instead.)*",
        isAIGenerated: false,
        apiError: true,
      });
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: errMessage }, { status: 500 });
  }
}
