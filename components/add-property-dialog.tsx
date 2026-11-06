'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { propertyFormSchema, type PropertyFormData } from '@/lib/validations/property';
import { createProperty } from '@/app/actions/properties';
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
import { PlusCircle, Loader2, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import type { PropertyType, FurnishingType, PropertyStatus, PhotoSourceType } from '@/types';

interface AddPropertyDialogProps {
  onPropertyAdded?: () => void;
}

const COMMON_AMENITIES = ['Lift', 'Car Parking', 'Power Backup', '24x7 Security', 'Gym', 'Balcony', 'Gated Community'];

export function AddPropertyDialog({ onPropertyAdded }: AddPropertyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<PhotoSourceType>('None');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['Lift', 'Car Parking']);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
  } = useForm<PropertyFormData>({
    defaultValues: {
      location: '',
      type: '2BHK',
      rent: 25000,
      deposit: 50000,
      furnishing: 'Semi-furnished',
      amenities: ['Lift', 'Car Parking'],
      available_from: new Date().toISOString().split('T')[0],
      is_immediate: true,
      owner_name: '',
      owner_contact: '',
      photos: [],
      photo_source_type: 'None',
      photo_link: '',
      status: 'Available',
      notes: '',
    },
  });

  const toggleAmenity = (amenity: string) => {
    const updated = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((a) => a !== amenity)
      : [...selectedAmenities, amenity];
    setSelectedAmenities(updated);
    setValue('amenities', updated);
  };

  const getPlaceholder = (source: PhotoSourceType) => {
    switch (source) {
      case 'Facebook':
        return 'e.g. https://facebook.com/marketplace/item/123456...';
      case 'WhatsApp':
        return 'e.g. Ask owner on WhatsApp / catalog link';
      case 'Google Drive':
        return 'e.g. https://drive.google.com/drive/folders/...';
      case 'Website':
        return 'e.g. https://myagency.com/properties/flat-102';
      case 'Other':
        return 'e.g. Dropbox / Telegram album link';
      default:
        return 'Link or note where photos are saved (optional)';
    }
  };

  const onSubmit = async (rawData: Record<string, unknown>) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const parsed = propertyFormSchema.safeParse({
      ...rawData,
      rent: Number(rawData.rent),
      deposit: Number(rawData.deposit),
      amenities: selectedAmenities,
      photo_source_type: selectedSource,
      photo_link: (rawData.photo_link as string)?.trim() || null,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Validation error');
      setIsSubmitting(false);
      return;
    }

    const res = await createProperty({
      ...parsed.data,
      notes: parsed.data.notes || null,
      photo_link: parsed.data.photo_link || null,
    });

    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      reset();
      setSelectedSource('None');
      setSelectedAmenities(['Lift', 'Car Parking']);
      setOpen(false);
      if (onPropertyAdded) onPropertyAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <PlusCircle className="w-4 h-4" />
            Add Property
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Property Listing</DialogTitle>
          <DialogDescription>
            Record listing details, pricing, owner contact, and external photo references.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Property Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Property Type</Label>
                <Select defaultValue="2BHK" onValueChange={(val) => { if (val) setValue('type', val as PropertyType); }}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {['1BHK', '2BHK', '3BHK', '4BHK', 'Shop', 'Office', 'Warehouse', 'Other'].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="furnishing">Furnishing</Label>
                <Select defaultValue="Semi-furnished" onValueChange={(val) => { if (val) setValue('furnishing', val as FurnishingType); }}>
                  <SelectTrigger id="furnishing">
                    <SelectValue placeholder="Select furnishing" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Unfurnished', 'Semi-furnished', 'Fully-furnished'].map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Address</Label>
              <Input
                id="location"
                placeholder="e.g. 4th Block, Indiranagar, Bengaluru"
                required
                {...register('location')}
              />
            </div>
          </div>

          {/* Section: Pricing & Availability */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pricing & Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent">Monthly Rent (₹)</Label>
                <Input id="rent" type="number" required {...register('rent', { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit">Security Deposit (₹)</Label>
                <Input id="deposit" type="number" required {...register('deposit', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="available_from">Available From</Label>
                <Input id="available_from" type="date" required {...register('available_from')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Listing Status</Label>
                <Select defaultValue="Available" onValueChange={(val) => { if (val) setValue('status', val as PropertyStatus); }}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Available', 'Rented', 'Under Discussion'].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Amenities */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_AMENITIES.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Photo Reference (Lightweight External Link) */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Photo Reference
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Link where property photos are hosted (Facebook Marketplace, WhatsApp, Google Drive, or agency website).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photo_source_type">Photo Source</Label>
                <Select
                  value={selectedSource}
                  onValueChange={(val) => {
                    if (val) {
                      const src = val as PhotoSourceType;
                      setSelectedSource(src);
                      setValue('photo_source_type', src);
                    }
                  }}
                >
                  <SelectTrigger id="photo_source_type">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {(['None', 'Facebook', 'WhatsApp', 'Google Drive', 'Website', 'Other'] as PhotoSourceType[]).map((src) => (
                      <SelectItem key={src} value={src}>
                        {src}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo_link" className="flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  Photo Link / Reference
                </Label>
                <Input
                  id="photo_link"
                  placeholder={getPlaceholder(selectedSource)}
                  {...register('photo_link')}
                />
              </div>
            </div>
          </div>

          {/* Section: Owner Information */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Owner Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input id="owner_name" placeholder="Rajesh Kumar" required {...register('owner_name')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_contact">Owner Contact (Phone / WhatsApp)</Label>
                <Input id="owner_contact" placeholder="+91 9876543210" required {...register('owner_contact')} />
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Label htmlFor="notes">Broker Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g. East facing, modular kitchen, keys with security guard, negotiable deposit."
              {...register('notes')}
            />
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
                'Save Property'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
