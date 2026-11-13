import { z } from 'zod';
import { propertyTypeSchema } from './property';

export const tenantStatusSchema = z.enum([
  'New',
  'Site Visit Done',
  'Negotiating',
  'Closed',
  'Lost',
]);

export const furnishingPreferenceSchema = z.enum([
  'Unfurnished',
  'Semi-furnished',
  'Fully-furnished',
  'Any',
]);

export const tenantFormSchema = z.object({
  name: z.string().min(2, 'Tenant name is required'),
  contact: z.string().min(10, 'Valid contact number is required'),
  budget_min: z.number().min(0, 'Minimum budget must be positive'),
  budget_max: z.number().min(0, 'Maximum budget must be positive'),
  preferred_locations: z.array(z.string()).min(1, 'At least one preferred location is required'),
  preferred_type: z.array(propertyTypeSchema).min(1, 'At least one property type is required'),
  furnishing_preference: furnishingPreferenceSchema.default('Any'),
  move_in_date: z.string().min(1, 'Target move-in date is required'),
  next_follow_up: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val === '' || /^\d{4}-\d{2}-\d{2}$/.test(val),
      'Follow-up date must be in YYYY-MM-DD format'
    )
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
  special_requirements: z.string().nullable().optional(),
  status: tenantStatusSchema.default('New'),
  notes: z.string().nullable().optional(),
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;
