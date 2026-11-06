'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { tenantFormSchema, type TenantFormData } from '@/lib/validations/tenant';
import { createTenant } from '@/app/actions/tenants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import type { PropertyType, FurnishingPreference, TenantStatus } from '@/types';

interface AddTenantDialogProps {
  onTenantAdded?: () => void;
}

export function AddTenantDialog({ onTenantAdded }: AddTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [preferredLocationsText, setPreferredLocationsText] = useState('Indiranagar, Koramangala');
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(['2BHK', '3BHK']);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
  } = useForm<TenantFormData>({
    defaultValues: {
      name: '',
      contact: '',
      budget_min: 20000,
      budget_max: 35000,
      preferred_locations: ['Indiranagar', 'Koramangala'],
      preferred_type: ['2BHK', '3BHK'],
      furnishing_preference: 'Semi-furnished',
      move_in_date: new Date().toISOString().split('T')[0],
      special_requirements: '',
      status: 'New',
      notes: '',
    },
  });

  const toggleType = (t: PropertyType) => {
    let updated: PropertyType[];
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        updated = selectedTypes.filter((item) => item !== t);
      } else {
        updated = selectedTypes;
      }
    } else {
      updated = [...selectedTypes, t];
    }
    setSelectedTypes(updated);
    setValue('preferred_type', updated);
  };

  const onSubmit = async (rawData: Record<string, unknown>) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const locations = preferredLocationsText
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed = tenantFormSchema.safeParse({
      ...rawData,
      budget_min: Number(rawData.budget_min),
      budget_max: Number(rawData.budget_max),
      preferred_locations: locations.length > 0 ? locations : ['Any'],
      preferred_type: selectedTypes,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Validation error');
      setIsSubmitting(false);
      return;
    }

    const res = await createTenant({
      ...parsed.data,
      special_requirements: parsed.data.special_requirements || null,
      notes: parsed.data.notes || null,
    });

    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      reset();
      setOpen(false);
      if (onTenantAdded) onTenantAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <UserPlus className="w-4 h-4" />
            Add Tenant
          </Button>
        }
      />
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Tenant Lead</DialogTitle>
          <DialogDescription>
            Record tenant preferences, budget constraints, and target move-in schedule.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Tenant Name</Label>
              <Input id="tenant-name" placeholder="Priya Sharma" required {...register('name')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-contact">Contact (Phone/Email)</Label>
              <Input id="tenant-contact" placeholder="+91 9812345678" required {...register('contact')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_min">Min Budget (₹)</Label>
              <Input id="budget_min" type="number" required {...register('budget_min', { valueAsNumber: true })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_max">Max Budget (₹)</Label>
              <Input id="budget_max" type="number" required {...register('budget_max', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Property Types</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {(['1BHK', '2BHK', '3BHK', '4BHK', 'Shop', 'Office', 'Warehouse', 'Other'] as PropertyType[]).map((t) => {
                const isSelected = selectedTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locations">Preferred Locations (Comma separated)</Label>
            <Input
              id="locations"
              value={preferredLocationsText}
              onChange={(e) => setPreferredLocationsText(e.target.value)}
              placeholder="e.g. Whitefield, HSR Layout, Koramangala"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="furnishing_pref">Furnishing Preference</Label>
              <Select defaultValue="Semi-furnished" onValueChange={(val) => { if (val) setValue('furnishing_preference', val as FurnishingPreference); }}>
                <SelectTrigger id="furnishing_pref">
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  {['Unfurnished', 'Semi-furnished', 'Fully-furnished', 'Any'].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="move_in">Expected Move-in Date</Label>
              <Input id="move_in" type="date" required {...register('move_in_date')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Lead Status</Label>
              <Select defaultValue="New" onValueChange={(val) => { if (val) setValue('status', val as TenantStatus); }}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {['New', 'Site Visit Done', 'Negotiating', 'Closed', 'Lost'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reqs">Special Requirements</Label>
              <Input id="reqs" placeholder="e.g. Pet-friendly, high floor" {...register('special_requirements')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Agent Notes (Optional)</Label>
            <Textarea id="notes" placeholder="e.g. Prefers gated communities with gym." {...register('notes')} />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Tenant'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
