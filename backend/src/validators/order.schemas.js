const { z } = require('zod');

const orderItemSchema = z.object({
  id: z.string().optional(),
  menu_item_id: z.string().optional(),
  name: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().int().positive().max(99, 'Max 99 per item')
}).passthrough();

const createOrderSchema = z.object({
  table: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  tableNumber: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  sessionId: z.string().optional(),
  t: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required').max(100),
  restaurant_id: z.string().max(100).optional(),
  restaurantSlug: z.string().max(100).optional(),
  order_source: z.enum(['qr', 'waiter', 'seller', 'takeaway', 'delivery']).optional().default('qr'),
  waiter_id: z.string().optional(),
  session_id: z.string().optional(),
  total_amount: z.number().optional(),
  billing: z.any().optional()
}).passthrough();

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
