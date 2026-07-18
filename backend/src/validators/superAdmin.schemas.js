const { z } = require('zod');

const createRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(200),
  slug: z.string().min(2).max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  ownerEmail: z.string().email('Invalid owner email'),
  plan: z.enum(['trial', 'basic', 'pro', 'enterprise']).optional().default('trial'),
  subscriptionType: z.enum(['unlimited', 'limited']).optional().default('limited'),
  subscriptionDays: z.number().int().min(1).max(365).optional()
});

const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(2).max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  isActive: z.boolean().optional(),
  plan: z.enum(['trial', 'basic', 'pro', 'enterprise']).optional(),
  subscriptionType: z.enum(['unlimited', 'limited']).optional(),
  subscriptionDays: z.number().int().min(1).max(365).optional(),
  subscriptionStatus: z.enum(['active', 'unlimited', 'expired', 'past_due', 'cancelled', 'trialing']).optional(),
  expiresAt: z.string().datetime().nullable().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

module.exports = {
  createRestaurantSchema,
  updateRestaurantSchema
};
