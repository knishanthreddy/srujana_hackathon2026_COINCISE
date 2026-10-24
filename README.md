# COINCISE

> **AI-Powered Business Finance Forecasting & Decision Support System for Small Businesses & MSMEs**

COINCISE is an enterprise-grade financial intelligence platform tailored for small businesses, manufacturers, contractors, and MSMEs. It bridges the gap between basic bookkeeping and strategic liquidity management by combining deterministic cash-flow forecasting, multi-factor scenario stress-testing, automated risk alerts, executive trade-off modeling, and buyer-seller dispute resolution.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Technology Stack](#technology-stack)
3. [Architecture & Accounting Integrity](#architecture--accounting-integrity)
4. [Project Structure](#project-structure)
5. [Installation & Local Setup](#installation--local-setup)
6. [Automated Testing](#automated-testing)
7. [Supabase Setup & PostgreSQL Migration](#supabase-setup--postgresql-migration)
8. [GitHub Version Control Workflow](#github-version-control-workflow)
9. [Vercel Production Deployment](#vercel-production-deployment)
10. [FairResolve & MSME ODR Disclaimer](#fairresolve--msme-odr-disclaimer)

---

## Key Features

### 1. Executive Financial Dashboard
- **Runway & Liquidity Cockpit**: Live tracking of available liquid cash, expected receipts, outstanding receivables, vendor payables, upcoming expenses, and closing cash projections.
- **Dual Recharts Visualizations**:
  - Continuous daily cash balance trajectory area chart with minimum reserve threshold.
  - Inflows vs. Outflows schedule bar chart.
- **Multi-Horizon Horizon Selector**: Switch between 7, 30, 60, and 90-day predictive windows.
- **Recent Transactions & Direct Navigation**: Quick links to all core modules.

### 2. Financial Records (Double-Entry Cash Ledger)
- Record, edit, delete, search, sort, and categorize income and expenses.
- Real-time status tracking (`cleared`, `pending`, `reconciled`) and payment statuses (`expected`, `partially_paid`, `completed`).
- Zod schema validation ensuring non-negative amounts, valid dates, and required descriptions.
- Instant CSV export and reactive event synchronization.

### 3. Accounts Receivable (Inflows)
- Customer invoice tracking with total amount, received amount, and automated balance calculation ($$\text{Balance Due} = \max(0, \text{Total} - \text{Paid})$$).
- Dynamic overdue aging calculation ($$\text{daysOverdue}$$ against reference dates).
- Partial receipt recording modal with optional **"Synchronize to Cash Ledger"** (creates a reference-linked cleared transaction without double-counting).
- One-click escalation to FairResolve for overdue customer disputes.

### 4. Accounts Payable (Outflows)
- Vendor obligation tracking, expense category tagging, and payment schedule terms (`Immediate`, `Net 15`, `Net 30`, `Net 60`, `Milestone`).
- Partial disbursement recording modal with cash ledger synchronization.
- Overdue tracking, late penalty indicators, and scheduled liability alerts.

### 5. Cash-Flow Forecast Engine
- Mathematical equation:
  $$\text{Closing Cash} = \text{Opening Cash} + \text{Inflows} - \text{Outflows}$$
- Supports 7, 30, 60, and 90-day predictive horizons.
- Daily continuity guarantee: $\text{OpeningCash}(t) = \text{ClosingCash}(t-1)$.
- Identifies **First Projected Shortage Date** (< ₹0) and **Peak Cash Deficit**.
- Configurable minimum safety buffer (default: ₹2,50,000) with breach warnings.
- Grouped period summaries (Weekly 7-day and Monthly 30-day views).
- Interactive Day Inspector modal detailing the exact invoices and bills landing on that date.

### 6. Scenario Simulation Lab
- Pure sandbox modeling: **never modifies original financial ledger records**.
- Preset stress tests:
  - **Base-Case**: Actual live ledger data with zero adjustments.
  - **Optimistic**: +15% revenue growth, 5-day earlier customer collections, and extended vendor terms.
  - **Pessimistic Stress Test**: -25% revenue contraction, +30-day customer delays, accelerated vendor demands, and ₹1,00,000 emergency repair.
  - **Custom Tuner**: Interactive sliders for customer delay (-15d to +60d), sales change (-50% to +50%), supplier shift (-30d to +45d), payroll adjustments (-30% to +30%), emergency expense injection, and loan deferrals.
- Comparative multi-line chart (Baseline vs Hypothetical vs Safety Reserve).

### 7. Smart Alerts
- Algorithmic risk triggers derived deterministically from forecasts and aging rules—**zero random messages**.
- Identifies solvency deficits (< ₹0), reserve breaches, severe debtor overdue periods, and upcoming major supplier payouts.
- Root-cause explanations and direct navigation to resolution workflows.

### 8. Decision Centre
- Actionable executive trade-off modeling:
  - **TReDS Invoice Discounting**: 85% liquidity advance on Day 3 via MSME factoring.
  - **Structured Supplier Installment Split**: 50/50 payment split over 25 days.
  - **15% Discretionary Expense Freeze**: Pauses non-essential consumables.
  - **2% Prompt-Payment Cash Discount**: Incentivizes customer clearances within 5 days.
- Evaluates liquidity recovery curves against the original baseline without executing actual payments.

### 9. FairResolve: Payment Dispute Management
- Structured commercial buyer-seller dispute workspace.
- Case registration linked to existing invoices (zero double-counting).
- Documentary Evidence Vault (tax invoices, signed delivery challans, QA test reports, email correspondence).
- Independent Seller Position and Buyer Formal Response tracking.
- Objective, neutral rule-based fact summaries.
- Settlement offers, counteroffers, mutual acceptance, and installment progress tracking.
- Direct alignment with the official **Ministry of MSME Online Dispute Resolution Portal** (`https://odr.msme.gov.in/`).

### 10. Reports & Analytics
- Multi-dimensional reporting:
  - Income & Expense Statement by category with Pie breakdowns.
  - Forecast vs Actuals variance analysis.
  - Customer Receivables Ageing distribution (Current, 1-15d, 16-30d, 31-60d, 60d+).
  - Supplier Payables schedule buckets (0-7d, 8-15d, 16-30d, 30d+).
  - Scenario benchmarks summary.
  - Dispute resolution recovery metrics.
- Multi-scope date filters (All Records, Last 30 Days, Last 60 Days, Last 90 Days).
- One-click CSV exports for every report.

### 11. Settings & Enterprise Profile
- Business identity configuration (legal name, GSTIN, currency).
- Configurable risk thresholds (minimum safety reserve, overdue trigger days, concentration limit).
- Safe demo data reset button to restore baseline sandbox values.

---

## Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type safety)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charts & Data Visualization**: [Recharts](https://recharts.org/) (AreaChart, LineChart, BarChart, PieChart)
- **Input Validation**: [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Authentication**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **Testing**: Native Node.js Test Runner with `--experimental-strip-types`
- **Deployment**: [Vercel](https://vercel.com/)

---

## Architecture & Accounting Integrity

1. **Strict Liquidity Segregation**: Unpaid customer invoices are strictly categorized as **Expected Inflows** and are never credited to liquid available cash until payment is confirmed.
2. **Double-Counting Prevention**: When linking disputes or projecting receivables/payables, only the remaining balance due is projected. Payments synced to the cash ledger reference the invoice ID to prevent duplicate transactions.
3. **Multi-Tenant Row Level Security (RLS)**: When connected to Supabase PostgreSQL, all tables enforce RLS so each authenticated business can access only its authorized records.
4. **Offline Demo Fallback**: When running without cloud credentials, COINCISE operates seamlessly in **Zero-Config Demo Mode** via browser `localStorage`.

---

## Installation & Local Setup

### Prerequisites
- Node.js version **18.18+** or **20+** (v24 recommended)
- npm version **9+**

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/coincise.git
cd coincise
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration (Optional for Demo Mode)
The app runs out-of-the-box in Offline Demo Mode. To connect a live Supabase database:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated Testing

Run the automated test suites:
```bash
npm test
```

This executes:
1. **Forecast Engine Test Suite** (`tests/forecast-engine.test.ts`):
   - Formula validation: $\text{Opening (₹1,00,000)} + \text{Receipts (₹40,000)} - \text{Supplier (₹50,000)} - \text{Payroll (₹30,000)} = \text{Closing (₹60,000)}$.
   - Multi-day daily continuity ($\text{Opening}(t) = \text{Closing}(t-1)$).
   - Partial payment extraction.
   - Scenario delay and contraction modifiers.
   - Solvency deficit and safety reserve breach detection.
2. **FairResolve Dispute Workflow Suite** (`tests/dispute-workflow.test.ts`):
   - Case creation and invoice linkage.
   - Evidence vault logging.
   - Buyer and seller response capture.
   - Objective neutral summary generation.
   - Settlement proposals, counteroffers, mutual acceptance, and payout tracking.
   - MSME ODR escalation.

To run type checks and production builds:
```bash
npx tsc --noEmit
npm run build
```

---

## Supabase Setup & PostgreSQL Migration

To connect persistent PostgreSQL storage:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open the file [`supabase/migrations/20261025000000_init_coincise_schema.sql`](file:///c:/Users/knish/Downloads/COINCISE/supabase/migrations/20261025000000_init_coincise_schema.sql) in this repository.
4. Copy and paste the entire script into the Supabase SQL Editor and click **Run**.
5. Copy your project **API URL** and **Anon Public Key** from **Settings > API**.
6. Paste them into `.env.local` and restart `npm run dev`.
7. Click the **Demo** badge in the COINCISE header to sign up or sign in. The badge will switch to **Cloud Active**.

---

## GitHub Version Control Workflow

To push this codebase to a new GitHub repository:

```bash
# 1. Initialize git (if not already done)
git init

# 2. Add all files (secrets in .env*.local are excluded by .gitignore)
git add .

# 3. Commit changes
git commit -m "feat: complete COINCISE platform implementation"

# 4. Set main branch and link remote
git branch -M main
git remote add origin https://github.com/your-username/coincise.git

# 5. Push to GitHub
git push -u origin main
```

---

## Vercel Production Deployment

### 1. Import Project in Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New > Project"**.
2. Select your GitHub repository `coincise`.
3. Framework Preset: **Next.js** (automatically detected).
4. Root Directory: `./`.

### 2. Configure Environment Variables
In the Vercel deployment wizard, expand **Environment Variables** and add:
- `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase Service Role Key (Server-only)

*(If you wish to deploy in demo mode first, you can leave these blank).*

### 3. Deploy
Click **Deploy**. Vercel will build and optimize all 14 static and server routes in ~45 seconds.

---

## FairResolve & MSME ODR Disclaimer

> [!IMPORTANT]
> **Statutory Notice**: FairResolve is an internal business mediation and settlement communication utility designed to help commercial buyers and sellers reach consensual agreements. **FairResolve is not a government-authorized arbitration, conciliation, or judicial dispute resolution service.**
>
> If direct commercial negotiations cannot be resolved amicably, eligible Indian enterprises registered under the MSMED Act may escalate their claims directly to the official Government of India portal:
>
> **Official MSME ODR Portal**: [https://odr.msme.gov.in/](https://odr.msme.gov.in/)
