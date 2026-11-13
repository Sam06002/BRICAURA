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
import { UserPlus, Loader2, MapPin, Tag } from 'lucide-react';
import type { PropertyType, FurnishingPreference, TenantStatus } from '@/types';

interface AddTenantDialogProps {
  onTenantAdded?: () => void;
}

const ALL_PROPERTY_TYPES: PropertyType[] = [
  '1BHK',
  '2BHK',
  '3BHK',
  '4BHK',
  'Shop',
  'Office',
  'Warehouse',
  'Other',
];

const SUGGESTED_LOCALITIES = [
  'Indiranagar',
  'Koramangala',
  'HSR Layout',
  'Whitefield',
  'Bellandur',
  'JP Nagar',
  'Marathahalli',
];

export function AddTenantDialog({ onTenantAdded }: AddTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [preferredLocationsText, setPreferredLocationsText] = useState('Indiranagar, Koramangala');
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(['2BHK', '3BHK']);
  const [selectedStatus, setSelectedStatus] = useState<TenantStatus>('New');
  const [selectedFurnishing, setSelectedFurnishing] = useState<FurnishingPreference>('Semi-furnished');

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
      next_follow_up: '',
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

  const addSuggestedLocality = (loc: string) => {
    const current = preferredLocationsText
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!current.includes(loc)) {
      const updated = [...current, loc].join(', ');
      setPreferredLocationsText(updated);
    }
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
      furnishing_preference: selectedFurnishing,
      status: selectedStatus,
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
      setPreferredLocationsText('Indiranagar, Koramangala');
      setSelectedTypes(['2BHK', '3BHK']);
      setSelectedStatus('New');
      setSelectedFurnishing('Semi-furnished');
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Register Tenant Lead</DialogTitle>
          <DialogDescription>
            Record tenant criteria, budget ranges, pipeline stage, and move-in timeline.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Section: Identity & Stage */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lead Identity & Pipeline Stage
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Tenant Full Name</Label>
                <Input id="tenant-name" placeholder="Priya Sharma" required {...register('name')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-contact">Phone / WhatsApp Number</Label>
                <Input id="tenant-contact" placeholder="+91 9812345678" required {...register('contact')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-status">Initial Pipeline Stage</Label>
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  if (val) {
                    const st = val as TenantStatus;
                    setSelectedStatus(st);
                    setValue('status', st);
                  }
                }}
              >
                <SelectTrigger id="tenant-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New Lead</SelectItem>
                  <SelectItem value="Site Visit Done">Site Visit Done</SelectItem>
                  <SelectItem value="Negotiating">Negotiating</SelectItem>
                  <SelectItem value="Closed">Closed (Deal Won)</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section: Budget Range */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Budget Constraints
            </h3>

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
          </div>

          {/* Section: Preferences */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Property Preferences
            </h3>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Preferred Property Types (Select all that apply)
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ALL_PROPERTY_TYPES.map((t) => {
                  const isSelected = selectedTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
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
              <Label htmlFor="locations" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Target Localities (Comma separated)
              </Label>
              <Input
                id="locations"
                value={preferredLocationsText}
                onChange={(e) => setPreferredLocationsText(e.target.value)}
                placeholder="e.g. Whitefield, HSR Layout, Koramangala"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-400">
                <span className="text-[11px]">Quick Add:</span>
                {SUGGESTED_LOCALITIES.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => addSuggestedLocality(loc)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    + {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="furnishing_pref">Furnishing Preference</Label>
                <Select
                  value={selectedFurnishing}
                  onValueChange={(val) => {
                    if (val) {
                      const f = val as FurnishingPreference;
                      setSelectedFurnishing(f);
                      setValue('furnishing_preference', f);
                    }
                  }}
                >
                  <SelectTrigger id="furnishing_pref">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {(['Any', 'Unfurnished', 'Semi-furnished', 'Fully-furnished'] as FurnishingPreference[]).map((f) => (
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

            <div className="space-y-2">
              <Label htmlFor="next_follow_up">Next Follow-up Date (Optional)</Label>
              <Input
                id="next_follow_up"
                type="date"
                {...register('next_follow_up')}
              />
            </div>
          </div>

          {/* Section: Special Requirements & Notes */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <Label htmlFor="reqs">Special Requirements</Label>
              <Input
                id="reqs"
                placeholder="e.g. Pet-friendly, high floor, gated society, car parking"
                {...register('special_requirements')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Broker Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g. Budget is slightly flexible for 3BHK with club amenities."
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
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
