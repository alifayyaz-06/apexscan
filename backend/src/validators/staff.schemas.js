const { z } = require('zod');

const createStaffSchema = z.object({
  employeeCode: z.string().min(2, 'Employee code must be at least 2 characters').max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Employee code must be alphanumeric'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: z.enum(['kitchen_staff', 'sales_staff', 'waiter', 'rider'], {
    errorMap: () => ({ message: 'Role must be kitchen_staff, sales_staff, waiter, or rider' })
  }),
  displayName: z.string().max(100).optional().default('')
});

const updateStaffSchema = z.object({
  password: z.string().min(6).max(128).optional(),
  displayName: z.string().max(100).optional(),
  isActive: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

module.exports = {
  createStaffSchema,
  updateStaffSchema
};
