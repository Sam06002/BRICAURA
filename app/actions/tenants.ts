'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Tenant, TenantInsert } from '@/types';

export async function getTenants() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }

  return (data as Tenant[]) || [];
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Tenant;
}

export async function createTenant(payload: Omit<TenantInsert, 'created_by'>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required' };
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert([
      {
        ...payload,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/tenants');
  revalidatePath('/dashboard');
  revalidatePath('/matching');
  return { data: data as Tenant };
}

export async function updateTenant(id: string, updates: Partial<Tenant>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/tenants');
  revalidatePath(`/tenants/${id}`);
  revalidatePath('/dashboard');
  revalidatePath('/matching');
  return { success: true };
}

export async function deleteTenant(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('tenants').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/tenants');
  revalidatePath(`/tenants/${id}`);
  revalidatePath('/dashboard');
  revalidatePath('/matching');
  return { success: true };
}
