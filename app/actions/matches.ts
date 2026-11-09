'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type MatchStatus = 'New' | 'Contacted' | 'Site Visit Scheduled';

export interface MatchInteraction {
  id: string;
  tenant_id: string;
  property_id: string;
  status: MatchStatus;
  site_visit_at: string | null;
  notes: string | null;
}

export async function getMatchInteractions(): Promise<MatchInteraction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('match_interactions')
    .select('id, tenant_id, property_id, status, site_visit_at, notes');

  if (error) {
    // The migration may not have been applied yet; keep matching read-only in that case.
    console.error('Error fetching match interactions:', error);
    return [];
  }

  return (data ?? []) as MatchInteraction[];
}

export async function updateMatchInteraction(
  tenantId: string,
  propertyId: string,
  status: MatchStatus,
  siteVisitAt?: string | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required' };

  const { error } = await supabase
    .from('match_interactions')
    .upsert({
      tenant_id: tenantId,
      property_id: propertyId,
      status,
      site_visit_at: status === 'Site Visit Scheduled' ? siteVisitAt ?? null : null,
      created_by: user.id,
    }, { onConflict: 'tenant_id,property_id' });

  if (error) return { error: error.message };

  revalidatePath('/matching');
  return { success: true };
}
