-- ============================================================
-- HARUNOKAZE CRO CRM - Database Restructure Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop old triggers first
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads CASCADE;
DROP TRIGGER IF EXISTS trg_follow_ups_updated_at ON public.follow_ups CASCADE;
DROP TRIGGER IF EXISTS trg_conversions_updated_at ON public.conversions CASCADE;
DROP TRIGGER IF EXISTS trg_playbook_updated_at ON public.playbook_items CASCADE;
DROP TRIGGER IF EXISTS trg_auto_schedule_fu ON public.leads CASCADE;
DROP TRIGGER IF EXISTS trg_check_duplicate ON public.leads CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop old tables
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.playbook_items CASCADE;
DROP TABLE IF EXISTS public.conversions CASCADE;
DROP TABLE IF EXISTS public.follow_ups CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop new tables if exists (for re-run safety)
DROP TABLE IF EXISTS public.batch_targets CASCADE;
DROP TABLE IF EXISTS public.lead_activities CASCADE;
DROP TABLE IF EXISTS public.expert_consultations CASCADE;
DROP TABLE IF EXISTS public.pemetaan CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;

-- Create Users Table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'cro', -- admin / owner / cro
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync existing users from auth.users to public.users
INSERT INTO public.users (id, name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email, 'User'), email, 'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- User Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    NEW.email,
    'cro'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create Leads Table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT,
  source_campaign TEXT NOT NULL,
  assigned_cro_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  current_status TEXT NOT NULL DEFAULT 'New Lead',
  lead_entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_contacted_date TIMESTAMPTZ,
  follow_up_result TEXT,
  notes TEXT,
  lost_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Payments Table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL, -- pemetaan / roadmap_session / seat_lock
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL,
  proof_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending', -- pending / verified / rejected
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Pemetaan Table
CREATE TABLE public.pemetaan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  form_status TEXT NOT NULL DEFAULT 'not_sent', -- not_sent / sent / submitted
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result_status TEXT NOT NULL DEFAULT 'not_ready', -- not_ready / waiting / ready
  result_ready_at TIMESTAMPTZ,
  result_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Expert Consultations Table
CREATE TABLE public.expert_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  expert_name TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  consultation_result TEXT,
  recommendation TEXT,
  next_step TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Lead Activities Table
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Batch Targets Table
CREATE TABLE public.batch_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  target_seat_lock INTEGER NOT NULL,
  start_date DATE NOT NULL,
  closing_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger helper
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pemetaan_updated_at BEFORE UPDATE ON public.pemetaan FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expert_consultations_updated_at BEFORE UPDATE ON public.expert_consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_batch_targets_updated_at BEFORE UPDATE ON public.batch_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) Configuration
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pemetaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_targets ENABLE ROW LEVEL SECURITY;

-- Simple MVP Policies: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users on users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on pemetaan" ON public.pemetaan FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on expert_consultations" ON public.expert_consultations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on lead_activities" ON public.lead_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on batch_targets" ON public.batch_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert Default Seed Data
INSERT INTO public.batch_targets (batch_name, target_seat_lock, start_date, closing_date, notes)
VALUES ('Batch 1', 28, '2026-06-01', '2026-06-30', 'Target seat lock untuk Batch 1 Harunokaze');
