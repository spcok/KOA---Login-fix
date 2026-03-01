
-- ==========================================
-- 1. CUSTOM JWT CLAIMS SYNC
-- ==========================================

-- Function to sync user role and permissions to auth.users app_metadata
CREATE OR REPLACE FUNCTION public.handle_user_update_sync_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role, 'permissions', NEW.permissions)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for syncing on insert or update
DROP TRIGGER IF EXISTS on_user_update_sync_auth ON public.users;
CREATE TRIGGER on_user_update_sync_auth
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update_sync_auth();

-- ==========================================
-- 2. DATABASE RLS POLICIES
-- ==========================================

-- Enable RLS on all core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_aid_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_round_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bcs_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_movements ENABLE ROW LEVEL SECURITY;

-- Helper function to get role from JWT
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::TEXT;
$$ LANGUAGE sql STABLE;

-- Helper function to check permission from JWT
CREATE OR REPLACE FUNCTION public.has_permission(perm_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() -> 'app_metadata' -> 'permissions' ->> perm_name)::BOOLEAN;
$$ LANGUAGE sql STABLE;

-- USERS POLICIES
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Admins can manage users" ON public.users FOR ALL USING (public.get_my_role() = 'Admin');
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ANIMALS POLICIES
CREATE POLICY "Users can view animals" ON public.animals FOR SELECT USING (true);
CREATE POLICY "Authorized users can manage animals" ON public.animals FOR ALL 
  USING (public.get_my_role() IN ('Admin', 'Staff', 'Veterinarian'));
CREATE POLICY "Soft delete only: prevent hard deletes" ON public.animals FOR DELETE USING (false);

-- LOG ENTRIES POLICIES
CREATE POLICY "Users can view log entries" ON public.log_entries FOR SELECT USING (true);
CREATE POLICY "Authorized users can create logs" ON public.log_entries FOR INSERT 
  WITH CHECK (public.get_my_role() IN ('Admin', 'Staff', 'Veterinarian', 'Volunteer'));
CREATE POLICY "Authorized users can update logs" ON public.log_entries FOR UPDATE 
  USING (public.get_my_role() IN ('Admin', 'Staff', 'Veterinarian'));

-- ==========================================
-- 3. STORAGE RLS POLICIES
-- ==========================================

-- Policies for 'documents' bucket
-- Assuming bucket 'documents' exists
CREATE POLICY "Public read for documents" ON storage.objects FOR SELECT 
  USING (bucket_id = 'documents');
CREATE POLICY "Authorized upload for documents" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'documents' AND public.get_my_role() IN ('Admin', 'Staff', 'Veterinarian'));

-- Policies for 'signatures' bucket
CREATE POLICY "Internal read for signatures" ON storage.objects FOR SELECT 
  USING (bucket_id = 'signatures' AND auth.role() = 'authenticated');
CREATE POLICY "User can upload own signature" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==========================================
-- 4. CHECK CONSTRAINTS
-- ==========================================

ALTER TABLE public.animals ADD CONSTRAINT check_dob_not_future CHECK (dob <= CURRENT_DATE);
ALTER TABLE public.animals ADD CONSTRAINT check_acquisition_not_future CHECK (acquisition_date <= CURRENT_DATE);
ALTER TABLE public.animals ADD CONSTRAINT check_weights_non_negative CHECK (
  (summer_weight_g IS NULL OR summer_weight_g >= 0) AND
  (winter_weight_g IS NULL OR winter_weight_g >= 0) AND
  (flying_weight_g IS NULL OR flying_weight_g >= 0)
);

ALTER TABLE public.log_entries ADD CONSTRAINT check_log_weight_non_negative CHECK (weight_grams IS NULL OR weight_grams >= 0);

-- ==========================================
-- 5. AUDIT TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log_entries (
    affected_entity_id,
    affected_entity_table,
    action_type,
    description,
    created_by,
    last_modified_by
  ) VALUES (
    NEW.id,
    TG_TABLE_NAME,
    'UPDATE',
    'Record updated by ' || auth.uid(),
    auth.uid(),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_animals_update AFTER UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();
CREATE TRIGGER audit_logs_update AFTER UPDATE ON public.log_entries FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();
CREATE TRIGGER audit_users_update AFTER UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- ==========================================
-- 6. ADMIN BOOTSTRAP
-- ==========================================

-- RUN THIS IN SQL EDITOR:
-- Replace 'YOUR_USER_ID' with the actual UUID from auth.users
/*
INSERT INTO public.users (id, name, initials, role, pin, active, permissions)
VALUES (
  'YOUR_USER_ID', 
  'Initial Admin', 
  'IA', 
  'Admin', 
  '1234', 
  true, 
  '{"dashboard": true, "dailyLog": true, "tasks": true, "medical": true, "movements": true, "safety": true, "maintenance": true, "settings": true, "flightRecords": true, "feedingSchedule": true, "attendance": true, "attendanceManager": true, "holidayApprover": true, "missingRecords": true, "reports": true, "rounds": true, "animalManagement": true, "userManagement": true, "documentManagement": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET role = 'Admin', active = true;
*/
