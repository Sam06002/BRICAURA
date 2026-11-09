-- Phase C: persist tenant-property match activity.
CREATE TABLE IF NOT EXISTS public.match_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'Contacted', 'Site Visit Scheduled')),
  site_visit_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT match_interactions_tenant_property_unique UNIQUE (tenant_id, property_id)
);

CREATE INDEX IF NOT EXISTS match_interactions_created_by_idx
  ON public.match_interactions(created_by);
CREATE INDEX IF NOT EXISTS match_interactions_tenant_idx
  ON public.match_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS match_interactions_property_idx
  ON public.match_interactions(property_id);

ALTER TABLE public.match_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own match interactions"
  ON public.match_interactions FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own match interactions"
  ON public.match_interactions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.created_by = auth.uid())
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.created_by = auth.uid())
  );

CREATE POLICY "Users can update their own match interactions"
  ON public.match_interactions FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.created_by = auth.uid())
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.created_by = auth.uid())
  );

CREATE POLICY "Users can delete their own match interactions"
  ON public.match_interactions FOR DELETE
  USING (auth.uid() = created_by);

DROP TRIGGER IF EXISTS handle_match_interactions_updated_at ON public.match_interactions;
CREATE TRIGGER handle_match_interactions_updated_at
  BEFORE UPDATE ON public.match_interactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
