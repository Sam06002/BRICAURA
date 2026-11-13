'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Property, PropertyInsert } from '@/types';

export async function getProperties() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching properties:', error);
    return [];
  }

  return (data as Property[]) || [];
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Property;
}

export async function createProperty(payload: Omit<PropertyInsert, 'created_by'>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required' };
  }

  const { data, error } = await supabase
    .from('properties')
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

  revalidatePath('/properties');
  revalidatePath('/dashboard');
  revalidatePath('/matching');
  return { data: data as Property };
}

export async function updateProperty(id: string, updates: Partial<Property>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/properties');
  revalidatePath('/dashboard');
  revalidatePath('/matching');
  return { success: true };
}

export async function deleteProperty(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/properties');
  revalidatePath('/dashboard');
  revalidatePath('/matching');
  return { success: true };
}
