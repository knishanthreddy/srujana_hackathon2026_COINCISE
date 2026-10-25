-- =========================================================================
-- COINCISE - Document Imports & Transaction Reconciliation Migration
-- =========================================================================

-- 1. DOCUMENT IMPORTS TABLE
CREATE TABLE IF NOT EXISTS public.document_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('bank_statement', 'invoice', 'bill', 'receipt', 'generic_ledger', 'unknown')),
    records_detected INT DEFAULT 0 CHECK (records_detected >= 0),
    records_imported INT DEFAULT 0 CHECK (records_imported >= 0),
    extraction_engine VARCHAR(50) DEFAULT 'deterministic',
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'pending_review', 'failed')),
    errors JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADD RECONCILIATION & AUDIT COLUMNS TO EXISTING TABLES
ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.document_imports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_document_name TEXT,
ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciled_receivable_id UUID REFERENCES public.receivables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reconciled_payable_id UUID REFERENCES public.payables(id) ON DELETE SET NULL;

ALTER TABLE public.receivables
ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.document_imports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_document_name TEXT;

ALTER TABLE public.payables
ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.document_imports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_document_name TEXT;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_document_imports_business ON public.document_imports(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_import_batch ON public.financial_records(import_batch_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.document_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants isolate document imports"
ON public.document_imports FOR ALL
USING (business_id = public.get_auth_business_id())
WITH CHECK (business_id = public.get_auth_business_id());
