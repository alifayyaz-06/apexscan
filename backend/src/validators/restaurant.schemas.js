const { z } = require('zod');

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  logo_url: z.string().url().or(z.literal('')).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  service_charge: z.number().min(0).max(100).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one setting must be provided'
});

module.exports = {
  updateSettingsSchema
};
