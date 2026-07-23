const Order = require('../models/Order');
const { defaultClient } = require('../utils/supabase');

class SalesController {
  static async getSalesSummary(req, res) {
    try {
      const client = req.supabase || defaultClient;
      const allOrders = await Order.getAll(client);
      const completedOrders = allOrders.filter(o => o.status === 'completed');
      
      const now = new Date();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      // Start of Today (local time)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Start of Week (7 days ago)
      const weekStart = new Date(now.getTime() - 7 * oneDayMs);
      weekStart.setHours(0, 0, 0, 0);

      // Start of Month (30 days ago)
      const monthStart = new Date(now.getTime() - 30 * oneDayMs);
      monthStart.setHours(0, 0, 0, 0);

      // Aggregates
      let todayRevenue = 0;
      let todayCount = 0;
      let todayPaymentMethods = { cash: 0, card: 0 };
      let todayPaymentRevenue = { cash: 0, card: 0 };
      
      let weekRevenue = 0;
      let weekCount = 0;
      
      let monthRevenue = 0;
      let monthCount = 0;
      
      // Top Selling Items tracker
      const itemQuantities = {};

      // Time-series arrays for frontend charts
      // Today: hourly sales (12 slots: 11:00 to 22:00)
      const hourlySales = Array(12).fill(0).map((_, i) => ({ label: `${11 + i}:00`, amount: 0, count: 0 }));
      
      // Weekly: daily sales (last 7 days)
      const dailySales = Array(7).fill(0).map((_, i) => {
        const d = new Date(now.getTime() - (6 - i) * oneDayMs);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return { label: dayNames[d.getDay()], dateStr: d.toDateString(), amount: 0, count: 0 };
      });

      // Monthly: weekly sales (last 4 weeks: 30-22 days ago, 21-15 days ago, 14-8 days ago, last 7 days)
      const weeklySales = [
        { label: 'Week 1 (22-30d)', startMs: 30, endMs: 22, amount: 0, count: 0 },
        { label: 'Week 2 (15-21d)', startMs: 21, endMs: 15, amount: 0, count: 0 },
        { label: 'Week 3 (8-14d)', startMs: 14, endMs: 8, amount: 0, count: 0 },
        { label: 'Week 4 (1-7d)', startMs: 7, endMs: 0, amount: 0, count: 0 }
      ];

      completedOrders.forEach(order => {
        const orderDate = new Date(order.timestamp);
        const total = order.billing.total;

        // Top Selling Items tracking
        order.items.forEach(item => {
          if (!itemQuantities[item.name]) {
            itemQuantities[item.name] = { quantity: 0, revenue: 0 };
          }
          itemQuantities[item.name].quantity += item.quantity;
          itemQuantities[item.name].revenue += (item.price || 0) * item.quantity;
        });

        // 1. Today's Stats
        if (orderDate >= todayStart) {
          todayRevenue += total;
          todayCount++;
          const method = order.billing.paymentMethod ? order.billing.paymentMethod.toLowerCase() : 'cash';
          if (todayPaymentMethods[method] !== undefined) {
            todayPaymentMethods[method]++;
            todayPaymentRevenue[method] += total;
          } else {
            todayPaymentMethods[method] = 1;
            todayPaymentRevenue[method] = total;
          }
          
          // Map to hourly index (11 AM to 10 PM)
          const hour = orderDate.getHours();
          const hourIdx = hour - 11;
          if (hourIdx >= 0 && hourIdx < 12) {
            hourlySales[hourIdx].amount += total;
            hourlySales[hourIdx].count++;
          }
        }

        // 2. Weekly Stats (Last 7 Days)
        if (orderDate >= weekStart) {
          weekRevenue += total;
          weekCount++;
          
          // Map to daily index
          const dateStr = orderDate.toDateString();
          const dayMatch = dailySales.find(d => d.dateStr === dateStr);
          if (dayMatch) {
            dayMatch.amount += total;
            dayMatch.count++;
          }
        }

        // 3. Monthly Stats (Last 30 Days)
        if (orderDate >= monthStart) {
          monthRevenue += total;
          monthCount++;
          
          // Map to weekly index
          const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / oneDayMs);
          weeklySales.forEach(w => {
            if (diffDays >= w.endMs && diffDays <= w.startMs) {
              w.amount += total;
              w.count++;
            }
          });
        }
      });

      // Format decimals
      todayRevenue = parseFloat(todayRevenue.toFixed(2));
      weekRevenue = parseFloat(weekRevenue.toFixed(2));
      monthRevenue = parseFloat(monthRevenue.toFixed(2));

      hourlySales.forEach(h => h.amount = parseFloat(h.amount.toFixed(2)));
      dailySales.forEach(d => d.amount = parseFloat(d.amount.toFixed(2)));
      weeklySales.forEach(w => w.amount = parseFloat(w.amount.toFixed(2)));

      // Extract Top 5 items
      const topItems = Object.entries(itemQuantities)
        .map(([name, stat]) => ({ name, quantity: stat.quantity, revenue: parseFloat(stat.revenue.toFixed(2)) }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            today: { revenue: todayRevenue, count: todayCount, paymentMethods: todayPaymentMethods, paymentRevenue: todayPaymentRevenue },
            week: { revenue: weekRevenue, count: weekCount },
            month: { revenue: monthRevenue, count: monthCount },
            allTimeCompletedCount: completedOrders.length
          },
          charts: {
            today: hourlySales,
            week: dailySales.map(d => ({ label: d.label, amount: d.amount, count: d.count })),
            month: weeklySales.map(w => ({ label: w.label, amount: w.amount, count: w.count }))
          },
          topItems
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = SalesController;
