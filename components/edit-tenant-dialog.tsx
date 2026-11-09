'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { tenantFormSchema, type TenantFormData } from '@/lib/validations/tenant';
import { updateTenant } from '@/app/actions/tenants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Tag } from 'lucide-react';
import type { Tenant, PropertyType, FurnishingPreference, TenantStatus } from '@/types';

interface EditTenantDialogProps {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenantUpdated?: (updated: Tenant) => void;
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

export function EditTenantDialog({
  tenant,
  open,
  onOpenChange,
  onTenantUpdated,
}: EditTenantDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(tenant.preferred_type || ['2BHK']);
  const [locationInput, setLocationInput] = useState(tenant.preferred_locations ? tenant.preferred_locations.join(', ') : '');
  const [selectedStatus, setSelectedStatus] = useState<TenantStatus>(tenant.status || 'New');
  const [selectedFurnishing, setSelectedFurnishing] = useState<FurnishingPreference>(tenant.furnishing_preference || 'Semi-furnished');

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<TenantFormData>({
    defaultValues: {
      name: tenant.name,
      contact: tenant.contact,
      budget_min: Number(tenant.budget_min),
      budget_max: Number(tenant.budget_max),
      preferred_locations: tenant.preferred_locations || [],
      preferred_type: tenant.preferred_type || ['2BHK'],
      furnishing_preference: tenant.furnishing_preference || 'Semi-furnished',
      move_in_date: tenant.move_in_date,
      special_requirements: tenant.special_requirements || '',
      status: tenant.status || 'New',
      notes: tenant.notes || '',
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
    const current = locationInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!current.includes(loc)) {
      const updated = [...current, loc].join(', ');
      setLocationInput(updated);
    }
  };

  const onSubmit = async (rawData: Record<string, unknown>) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const locations = locationInput
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

    const updates = {
      ...parsed.data,
      special_requirements: parsed.data.special_requirements || null,
      notes: parsed.data.notes || null,
    };

    const res = await updateTenant(tenant.id, updates);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      onOpenChange(false);
      if (onTenantUpdated) {
        onTenantUpdated({
          ...tenant,
          ...updates,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Tenant Lead</DialogTitle>
          <DialogDescription>
            Update tenant criteria, budget ranges, pipeline status, and contact details.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Section: Contact Details & Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lead Identity & Pipeline Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tenant-name">Tenant Name</Label>
                <Input id="edit-tenant-name" required {...register('name')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tenant-contact">Phone / WhatsApp Number</Label>
                <Input id="edit-tenant-contact" required {...register('contact')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tenant-status">Pipeline Stage</Label>
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
                <SelectTrigger id="edit-tenant-status">
                  <SelectValue placeholder="Select pipeline stage" />
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
                <Label htmlFor="edit-budget-min">Min Budget (₹)</Label>
                <Input
                  id="edit-budget-min"
                  type="number"
                  required
                  {...register('budget_min', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-budget-max">Max Budget (₹)</Label>
                <Input
                  id="edit-budget-max"
                  type="number"
                  required
                  {...register('budget_max', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Section: Property Requirements */}
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
                {ALL_PROPERTY_TYPES.map((type) => {
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-transparent hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-locations" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Target Localities (Comma separated)
              </Label>
              <Input
                id="edit-locations"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g. Indiranagar, HSR Layout, Koramangala"
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
                <Label htmlFor="edit-furnishing-pref">Furnishing Preference</Label>
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
                  <SelectTrigger id="edit-furnishing-pref">
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
                <Label htmlFor="edit-move-in-date">Target Move-in Date</Label>
                <Input
                  id="edit-move-in-date"
                  type="date"
                  required
                  {...register('move_in_date')}
                />
              </div>
            </div>
          </div>

          {/* Section: Special Requirements & Notes */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <Label htmlFor="edit-special-reqs">Special Requirements</Label>
              <Input
                id="edit-special-reqs"
                placeholder="e.g. Pet-friendly, 2 car parking, bachelor-friendly, vegetarian"
                {...register('special_requirements')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tenant-notes">Broker Notes (Optional)</Label>
              <Textarea
                id="edit-tenant-notes"
                placeholder="e.g. Client works at Tech Park, looking for quick move-in by weekend."
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

