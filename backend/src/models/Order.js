const { defaultClient } = require('../utils/supabase');
const Menu = require('./Menu');

function generateOrderId() {
  return 'ORD-' + Math.floor(1000 + Math.random() * 9000);
}

let localOrdersFallback = [];

class Order {
  static async getAll(supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'orders',
        operation: 'SELECT_ALL'
      });
      
      if (error) throw error;
      return (data || []).map(o => {
        if (o && o.billing) {
          o.order_source = o.billing.order_source || 'qr';
          o.order_type = o.billing.order_type || 'dine_in';
        } else if (o) {
          o.order_source = 'qr';
          o.order_type = 'dine_in';
        }
        return o;
      });
    } catch (err) {
      console.error('Error fetching orders from Supabase:', err.message);
      return localOrdersFallback;
    }
  }
  
  static async getActive(supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'orders',
        operation: 'SELECT_ACTIVE'
      });
      
      if (error) throw error;
      return (data || []).map(o => {
        if (o && o.billing) {
          o.order_source = o.billing.order_source || 'qr';
          o.order_type = o.billing.order_type || 'dine_in';
        } else if (o) {
          o.order_source = 'qr';
          o.order_type = 'dine_in';
        }
        return o;
      });
    } catch (err) {
      console.error('Error fetching active orders from Supabase:', err.message);
      return localOrdersFallback.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    }
  }

  static async getById(id, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'orders',
        operation: 'SELECT_BY_ID',
        query_id: id
      });
      
      if (error) throw error;
      if (data && data.billing) {
        data.order_source = data.billing.order_source || 'qr';
        data.order_type = data.billing.order_type || 'dine_in';
      } else if (data) {
        data.order_source = 'qr';
        data.order_type = 'dine_in';
      }
      return data;
    } catch (err) {
      console.error(`Error fetching order ${id} from Supabase:`, err.message);
      return localOrdersFallback.find(o => o.id === id);
    }
  }

  static async create(table, items, supabaseClient = defaultClient, customBilling = null) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const menuItems = await Menu.getAll(supabaseClient);
      const orderItems = [];
      let subtotal = 0;

      for (const orderItem of items) {
        const menuItem = menuItems.find(m => m.id === orderItem.id);
        if (!menuItem) continue;

        orderItems.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: orderItem.quantity
        });
        subtotal += menuItem.price * orderItem.quantity;
      }

      // Fetch dynamic tax rate and service charge from global settings
      let taxRatePercent = 8.00;
      let serviceChargePercent = 5.00;
      try {
        const { data: restaurant } = await defaultClient
          .from('restaurants')
          .select('tax_rate, service_charge')
          .eq('slug', slug)
          .maybeSingle();

        if (restaurant) {
          if (restaurant.tax_rate !== null && restaurant.tax_rate !== undefined) {
            taxRatePercent = parseFloat(restaurant.tax_rate);
          }
          if (restaurant.service_charge !== null && restaurant.service_charge !== undefined) {
            serviceChargePercent = parseFloat(restaurant.service_charge);
          }
        }
      } catch (dbErr) {
        console.error('Error fetching restaurant tax rates, using defaults:', dbErr.message);
      }

      const tax = parseFloat((subtotal * (taxRatePercent / 100)).toFixed(2));
      const serviceCharge = parseFloat((subtotal * (serviceChargePercent / 100)).toFixed(2));
      
      const subtotalAfterDiscount = subtotal - (customBilling?.discount || 0);
      const calculatedTotal = parseFloat((subtotalAfterDiscount + tax + serviceCharge).toFixed(2));

      const mergedBilling = {
        subtotal: subtotal,
        tax: customBilling?.tax !== undefined ? parseFloat(customBilling.tax) : tax,
        serviceCharge: customBilling?.serviceCharge !== undefined ? parseFloat(customBilling.serviceCharge) : serviceCharge,
        discount: customBilling?.discount !== undefined ? parseFloat(customBilling.discount) : 0,
        total: customBilling?.total !== undefined ? parseFloat(customBilling.total) : calculatedTotal,
        paymentMethod: customBilling?.paymentMethod || 'unpaid',
        paymentStatus: customBilling?.paymentStatus || 'paid',
        pendingAmount: customBilling?.pendingAmount !== undefined ? parseFloat(customBilling.pendingAmount) : 0,
        paymentTimestamp: customBilling?.paymentTimestamp || null,
        confirmedBy: customBilling?.confirmedBy || null,
        
        order_source: customBilling?.order_source || 'qr',
        order_type: customBilling?.order_type || 'dine_in',
        
        customerName: customBilling?.customerName || null,
        customerPhone: customBilling?.customerPhone || null,
        notes: customBilling?.notes || null,
        guests: customBilling?.guests || null,
        pickupTime: customBilling?.pickupTime || null,
        deliveryAddress: customBilling?.deliveryAddress || null,
        deliveryArea: customBilling?.deliveryArea || null,
        deliveryCity: customBilling?.deliveryCity || null,
        deliveryInstructions: customBilling?.deliveryInstructions || null,
        rider: customBilling?.rider || null
      };

      const newOrder = {
        table_name: table.toString(),
        items: orderItems,
        status: customBilling?.order_source === 'manual' ? 'confirmed' : (customBilling?.status || 'pending'),
        billing: mergedBilling
      };

      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'orders',
        operation: 'INSERT',
        payload: newOrder
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating order in Supabase:', err.message);
      const fallbackOrder = {
        id: generateOrderId(),
        table_name: table.toString(),
        items: items.map(i => ({ id: i.id, name: 'Item', price: 10, quantity: i.quantity })),
        status: 'pending',
        timestamp: new Date().toISOString(),
        billing: { subtotal: 10, tax: 0.8, serviceCharge: 0.5, total: 11.3, paymentMethod: 'unpaid', paymentTimestamp: null }
      };
      localOrdersFallback.unshift(fallbackOrder);
      return fallbackOrder;
    }
  }

  static async updateStatus(id, newStatus, confirmedBy = null, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      
      const payload = { status: newStatus };
      
      if (confirmedBy) {
        // Fetch order details first to get the existing billing object
        const order = await this.getById(id, supabaseClient);
        if (order && order.billing) {
          order.billing.confirmedBy = confirmedBy;
          payload.billing = order.billing;
        }
      }

      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'orders',
        operation: 'UPDATE',
        query_id: id,
        payload: payload
      });
      
      if (error) throw error;
      if (data) {
        if (data.billing) {
          data.order_source = data.billing.order_source || 'qr';
          data.order_type = data.billing.order_type || 'dine_in';
        } else {
          data.order_source = 'qr';
          data.order_type = 'dine_in';
        }
      }
      return data;
    } catch (err) {
      console.error(`Error updating status for order ${id} in Supabase:`, err.message);
      const fallback = localOrdersFallback.find(o => o.id === id);
      if (fallback) {
        fallback.status = newStatus;
        if (confirmedBy) {
          fallback.billing = fallback.billing || {};
          fallback.billing.confirmedBy = confirmedBy;
        }
      }
      return fallback;
    }
  }

  static async completeAndPay(id, paymentMethod, confirmedBy = null, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const order = await this.getById(id, supabaseClient);
      if (!order) return null;

      order.status = 'completed';
      order.billing.paymentMethod = paymentMethod;
      order.billing.paymentTimestamp = new Date().toISOString();
      if (confirmedBy) {
        order.billing.confirmedBy = confirmedBy;
      }

      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'orders',
        operation: 'UPDATE',
        query_id: id,
        payload: {
          status: 'completed',
          billing: order.billing
        }
      });
      
      if (error) throw error;
      if (data) {
        if (data.billing) {
          data.order_source = data.billing.order_source || 'qr';
          data.order_type = data.billing.order_type || 'dine_in';
        } else {
          data.order_source = 'qr';
          data.order_type = 'dine_in';
        }
      }
      return data;
    } catch (err) {
      console.error(`Error completing payment for order ${id} in Supabase:`, err.message);
      const fallback = localOrdersFallback.find(o => o.id === id);
      if (fallback) {
        fallback.status = 'completed';
        fallback.billing.paymentMethod = paymentMethod;
        fallback.billing.paymentTimestamp = new Date().toISOString();
      }
      return fallback;
    }
  }

  static async updateItems(id, newItems, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const menuItems = await Menu.getAll(supabaseClient);
      const updatedItems = [];
      let subtotal = 0;

      for (const item of newItems) {
        const menuItem = menuItems.find(m => m.id === item.id);
        if (!menuItem) continue;

        updatedItems.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity
        });
        subtotal += menuItem.price * item.quantity;
      }

      const tax = parseFloat((subtotal * 0.08).toFixed(2));
      const serviceCharge = parseFloat((subtotal * 0.05).toFixed(2));
      const billing = {
        subtotal,
        tax,
        serviceCharge,
        total: parseFloat((subtotal + tax + serviceCharge).toFixed(2)),
        paymentMethod: 'unpaid',
        paymentTimestamp: null
      };

      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'orders',
        operation: 'UPDATE',
        query_id: id,
        payload: {
          items: updatedItems,
          billing: billing
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Error modifying items for order ${id} in Supabase:`, err.message);
      const fallback = localOrdersFallback.find(o => o.id === id);
      return fallback;
    }
  }

  static async seedMockOrdersInDb(supabaseClient = defaultClient) {
    // Deprecated / disabled to ensure brand-new restaurants start with 0 orders.
    return [];
  }
}

module.exports = Order;
