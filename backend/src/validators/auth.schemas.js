const { z } = require('zod');

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128)
});

const adminSignupSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
});

const staffLoginSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required').max(50),
  password: z.string().min(1, 'Password is required').max(128),
  restaurantSlug: z.string().max(100).optional().nullable().or(z.literal('')),
  adminEmail: z.string().email('Invalid email format').optional().nullable().or(z.literal(''))
}).refine(data => data.restaurantSlug || data.adminEmail, {
  message: 'Either restaurantSlug or adminEmail is required'
});

const staffRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase()
});

module.exports = {
  adminLoginSchema,
  adminSignupSchema,
  staffLoginSchema,
  staffRefreshSchema,
  forgotPasswordSchema
};
