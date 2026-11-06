import { z } from 'zod';

export const propertyTypeSchema = z.enum([
  '1BHK',
  '2BHK',
  '3BHK',
  '4BHK',
  'Shop',
  'Office',
  'Warehouse',
  'Other',
]);

export const furnishingSchema = z.enum([
  'Unfurnished',
  'Semi-furnished',
  'Fully-furnished',
]);

export const propertyStatusSchema = z.enum([
  'Available',
  'Rented',
  'Under Discussion',
]);

export const photoSourceTypeSchema = z.enum([
  'Facebook',
  'WhatsApp',
  'Website',
  'Google Drive',
  'Other',
  'None',
]);

export const propertyFormSchema = z.object({
  location: z.string().min(2, 'Location is required'),
  type: propertyTypeSchema,
  rent: z.number().positive('Rent must be greater than 0'),
  deposit: z.number().min(0, 'Deposit must be 0 or positive'),
  furnishing: furnishingSchema,
  amenities: z.array(z.string()).default([]),
  available_from: z.string().min(1, 'Available date is required'),
  is_immediate: z.boolean().default(false),
  owner_name: z.string().min(2, 'Owner name is required'),
  owner_contact: z.string().min(10, 'Valid contact number is required'),
  photos: z.array(z.string()).default([]),
  photo_source_type: photoSourceTypeSchema.default('None'),
  photo_link: z.string().nullable().optional(),
  status: propertyStatusSchema.default('Available'),
  notes: z.string().nullable().optional(),
});

export type PropertyFormData = z.infer<typeof propertyFormSchema>;
