const { z } = require('zod');

const createMenuItemSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'ID must be alphanumeric with dashes/underscores'),
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().min(1, 'Category is required').max(50),
  price: z.number().positive('Price must be positive').max(99999),
  description: z.string().max(2000).optional().default(''),
  image: z.string().url().or(z.literal('')).optional().default('')
});

const updateMenuItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(50).optional(),
  price: z.number().positive().max(99999).optional(),
  description: z.string().max(2000).optional(),
  image: z.string().url().or(z.literal('')).optional(),
  is_available: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

module.exports = {
  createMenuItemSchema,
  updateMenuItemSchema
};
