const { z } = require('zod');

const orderItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().positive().max(99, 'Max 99 per item')
});

const createOrderSchema = z.object({
  table: z.union([z.string(), z.number()]).transform(val => String(val)),
  items: z.array(orderItemSchema).min(1, 'At least one item is required').max(100),
  restaurant_id: z.string().max(100).optional(),
  restaurantSlug: z.string().max(100).optional(),
  billing: z.any().optional()
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cooking', 'preparing', 'ready', 'served', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' })
  })
});

const completePaySchema = z.object({
  paymentMethod: z.enum(['cash', 'card'], {
    errorMap: () => ({ message: 'Payment method must be cash or card' })
  })
});

const updateOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required').max(100)
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  completePaySchema,
  updateOrderItemsSchema
};
