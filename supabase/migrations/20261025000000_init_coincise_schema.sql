-- =========================================================================
-- COINCISE - Enterprise Schema & Row Level Security (RLS) Policies
-- PostgreSQL Migration for Supabase
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESS PROFILES
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_name TEXT NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    minimum_reserve NUMERIC(15, 2) DEFAULT 250000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'owner',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    contact_email TEXT,
    phone TEXT,
    payment_terms_days INT DEFAULT 30,
    credit_limit NUMERIC(15, 2) DEFAULT 500000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SUPPLIERS (VENDORS)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    contact_email TEXT,
    phone TEXT,
    category TEXT DEFAULT 'Raw Materials',
    payment_schedule VARCHAR(50) DEFAULT 'net_30',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FINANCIAL RECORDS (CASH LEDGER)
CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    paid_amount NUMERIC(15, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    payment_status VARCHAR(30) NOT NULL CHECK (payment_status IN ('expected', 'partially_paid', 'completed')),
    status VARCHAR(30) DEFAULT 'cleared' CHECK (status IN ('cleared', 'pending', 'reconciled')),
    description TEXT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RECEIVABLES (CUSTOMER INVOICES)
CREATE TABLE IF NOT EXISTS public.receivables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
    paid_amount NUMERIC(15, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    balance_due NUMERIC(15, 2) NOT NULL CHECK (balance_due >= 0),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('paid', 'pending', 'partially_paid', 'overdue')),
    days_overdue INT DEFAULT 0,
    contact_email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. PAYABLES (SUPPLIER OBLIGATIONS)
CREATE TABLE IF NOT EXISTS public.payables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
    paid_amount NUMERIC(15, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    balance_due NUMERIC(15, 2) NOT NULL CHECK (balance_due >= 0),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('paid', 'pending', 'partially_paid', 'overdue')),
    category TEXT NOT NULL,
    contact_email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. SMART ALERTS
CREATE TABLE IF NOT EXISTS public.smart_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    date DATE NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    suggested_action TEXT NOT NULL,
    action_link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. SCENARIO SIMULATIONS
CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    cash_impact NUMERIC(15, 2) DEFAULT 0,
    effective_day INT DEFAULT 0,
    modifiers JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. FAIRRESOLVE DISPUTES
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    receivable_id UUID REFERENCES public.receivables(id) ON DELETE SET NULL,
    case_number TEXT NOT NULL UNIQUE,
    counterparty_name TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    dispute_amount NUMERIC(15, 2) NOT NULL CHECK (dispute_amount > 0),
    original_due_date DATE NOT NULL,
    issue_category VARCHAR(50) NOT NULL CHECK (issue_category IN ('delayed_payment', 'defective_goods', 'deduction_unauthorized', 'scope_dispute')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'counterparty_notified', 'evidence_submitted', 'settlement_proposed', 'resolved', 'escalated_to_odr')),
    settlement_offer_amount NUMERIC(15, 2),
    settlement_terms TEXT,
    buyer_response TEXT,
    seller_response TEXT,
    rule_summary TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. DISPUTE EVIDENCE ITEMS
CREATE TABLE IF NOT EXISTS public.dispute_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'delivery_proof', 'email_thread', 'contract', 'qa_report')),
    file_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. DISPUTE ACTIVITY TIMELINE LOGS
CREATE TABLE IF NOT EXISTS public.dispute_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
    actor VARCHAR(50) NOT NULL, -- e.g. 'Seller (You)', 'Buyer', 'System'
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. MUTUAL SETTLEMENTS & PAYMENT TRACKING
CREATE TABLE IF NOT EXISTS public.dispute_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
    agreed_amount NUMERIC(15, 2) NOT NULL,
    terms TEXT NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partially_paid', 'completed')),
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_records_business_date ON public.financial_records(business_id, date);
CREATE INDEX IF NOT EXISTS idx_receivables_business_status ON public.receivables(business_id, status);
CREATE INDEX IF NOT EXISTS idx_payables_business_status ON public.payables(business_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_business ON public.disputes(business_id);
CREATE INDEX IF NOT EXISTS idx_evidence_dispute ON public.dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_activity_dispute ON public.dispute_activity_logs(dispute_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant isolation: businesses access only their own data
-- =========================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_settlements ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch the user's business ID
CREATE OR REPLACE FUNCTION public.get_auth_business_id()
RETURNS UUID AS $$
    SELECT id FROM public.businesses WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Businesses
CREATE POLICY "Users can only read and write their own business"
ON public.businesses FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. User Profiles
CREATE POLICY "Users can only view their own user profile"
ON public.user_profiles FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Customers
CREATE POLICY "Tenants isolate customers"
ON public.customers FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 4. Suppliers
CREATE POLICY "Tenants isolate suppliers"
ON public.suppliers FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 5. Financial Records
CREATE POLICY "Tenants isolate financial records"
ON public.financial_records FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 6. Receivables
CREATE POLICY "Tenants isolate receivables"
ON public.receivables FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 7. Payables
CREATE POLICY "Tenants isolate payables"
ON public.payables FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 8. Smart Alerts
CREATE POLICY "Tenants isolate smart alerts"
ON public.smart_alerts FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 9. Scenarios
CREATE POLICY "Tenants isolate scenarios"
ON public.scenarios FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 10. Disputes
CREATE POLICY "Tenants isolate disputes"
ON public.disputes FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());

-- 11. Evidence
CREATE POLICY "Tenants isolate dispute evidence"
ON public.dispute_evidence FOR ALL
USING (dispute_id IN (SELECT id FROM public.disputes WHERE business_id = public.get_auth_business_id()))
WITH CHECK (dispute_id IN (SELECT id FROM public.disputes WHERE business_id = public.get_auth_business_id()));

-- 12. Activity Logs
CREATE POLICY "Tenants isolate dispute activity logs"
ON public.dispute_activity_logs FOR ALL
USING (dispute_id IN (SELECT id FROM public.disputes WHERE business_id = public.get_auth_business_id()))
WITH CHECK (dispute_id IN (SELECT id FROM public.disputes WHERE business_id = public.get_auth_business_id()));

-- 13. Dispute Settlements
CREATE POLICY "Tenants isolate dispute settlements"
ON public.dispute_settlements FOR ALL
USING (dispute_id IN (SELECT id FROM public.disputes WHERE business_id = public.get_auth_business_id()))
WITH CHECK (dispute_id IN (SELECT id FROM public.disputes WHERE business_id = public.get_auth_business_id()));
