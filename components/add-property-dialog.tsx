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
import { PlusCircle, Loader2 } from 'lucide-react';
import type { PropertyType, FurnishingType, PropertyStatus } from '@/types';

interface AddPropertyDialogProps {
  onPropertyAdded?: () => void;
}

export function AddPropertyDialog({ onPropertyAdded }: AddPropertyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      amenities: [],
      available_from: new Date().toISOString().split('T')[0],
      is_immediate: true,
      owner_name: '',
      owner_contact: '',
      photos: [],
      status: 'Available',
      notes: '',
    },
  });

  const onSubmit = async (rawData: Record<string, unknown>) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const parsed = propertyFormSchema.safeParse({
      ...rawData,
      rent: Number(rawData.rent),
      deposit: Number(rawData.deposit),
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Validation error');
      setIsSubmitting(false);
      return;
    }

    const res = await createProperty({
      ...parsed.data,
      notes: parsed.data.notes || null,
    });

    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      reset();
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property Listing</DialogTitle>
          <DialogDescription>
            Enter the property details, rent, location, and owner contact information.
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
            <Label htmlFor="location">Location / Area</Label>
            <Input id="location" placeholder="e.g. Indiranagar, Bengaluru" required {...register('location')} />
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input id="owner_name" placeholder="John Smith" required {...register('owner_name')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_contact">Owner Contact</Label>
              <Input id="owner_contact" placeholder="+91 9876543210" required {...register('owner_contact')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes & Key Details (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g. 3rd floor with balcony, modular kitchen, parking for 1 car."
              {...register('notes')}
            />
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
                'Save Property'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
