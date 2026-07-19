import React, { useState, useEffect } from 'react';
import { realTimeSync } from '../utils/socket';
import { Edit2, Trash2, Printer, CheckCircle, Clock, AlertTriangle, XCircle, CreditCard, DollarSign, Plus, QrCode, Hand, UtensilsCrossed, ShoppingBag, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

import { API_URL } from '../utils/config';

const BACKEND_URL = API_URL;



export default function WaiterView() {
  const { user, logout, authHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'bills' | 'history'
  const [liveOrders, setLiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [menuItemsList, setMenuItemsList] = useState([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  
  // Manual order & filter state
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'qr' | 'manual' | 'dine_in' | 'takeaway' | 'delivery'

  // Modals state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingOrder, setBillingOrder] = useState(null);
  const [billingPaymentMethod, setBillingPaymentMethod] = useState(null); // 'cash' | 'card'
  const [isHistoryViewOnly, setIsHistoryViewOnly] = useState(false); // read-only receipt mode

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [editTempItems, setEditTempItems] = useState([]); // [{ id, name, price, quantity }]
  const [selectedEditAddId, setSelectedEditAddId] = useState('');

  // POS States
  const [cart, setCart] = useState([]);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualCategory, setManualCategory] = useState('all');
  const [manualOrderType, setManualOrderType] = useState('dine_in');
  const [manualTable, setManualTable] = useState('Table 1');
  const [manualGuests, setManualGuests] = useState(1);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualPickupTime, setManualPickupTime] = useState('');
  const [manualDeliveryAddress, setManualDeliveryAddress] = useState('');
  const [manualDeliveryArea, setManualDeliveryArea] = useState('');
  const [manualDeliveryCity, setManualDeliveryCity] = useState('');
  const [manualDeliveryInstructions, setManualDeliveryInstructions] = useState('');
  const [manualRiderId, setManualRiderId] = useState('');
  const [manualOrderNotes, setManualOrderNotes] = useState('');
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualPaymentStatus, setManualPaymentStatus] = useState('paid');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('cash');
  const [settings, setSettings] = useState(null);
  const [posLoading, setPosLoading] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const [ridersList, setRidersList] = useState([]);
  // Ref to track whether audio has been unlocked by user interaction
  const audioUnlocked = React.useRef(false);

  useEffect(() => {
    if (user?.restaurantSlug) {
      realTimeSync.registerRestaurant(user.restaurantSlug, user.role);
    } else if (user?.restaurantId) {
      realTimeSync.registerRestaurant(user.restaurantId, user.role);
    }
    loadLiveOrders();
    loadMenuItemsList();
    loadSettings();
    loadRidersList();

    // WS Sync setup
    const onCreated = realTimeSync.on('ORDER_CREATED', (payload) => {
      // Only process orders of this restaurant (match UUID or slug)
      const myId = user?.restaurantId;
      const mySlug = user?.restaurantSlug;
      const matchesId = myId && payload.restaurantId && payload.restaurantId === myId;
      const matchesSlug = mySlug && payload.restaurantSlug && payload.restaurantSlug === mySlug;
      if (!matchesId && !matchesSlug) return;

      playAlertSound();
      
      const order = payload.order;
      const isManual = order.billing?.order_source === 'manual';
      if (!isManual) {
        setActiveNotification(order);
        // Also fire a sonner toast for immediate visibility
        const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
        toast.success(
          `🔔 New order from Table ${order.table_name || order.table} — ${itemCount} item${itemCount !== 1 ? 's' : ''}`,
          { duration: 6000 }
        );
        setTimeout(() => {
          setActiveNotification(prev => prev && prev.id === order.id ? null : prev);
        }, 10000);
      }

      setLiveOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        return [order, ...prev];
      });
    });

    const onUpdated = realTimeSync.on('ORDER_UPDATED', (payload) => {
      const myId = user?.restaurantId;
      const mySlug = user?.restaurantSlug;
      const matchesId = myId && payload.restaurantId && payload.restaurantId === myId;
      const matchesSlug = mySlug && payload.restaurantSlug && payload.restaurantSlug === mySlug;
      if (!matchesId && !matchesSlug) return;

      const updatedOrder = payload.order;
      
      // If completed or cancelled, remove from live queue
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
        setLiveOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
      } else {
        setLiveOrders(prev => {
          const idx = prev.findIndex(o => o.id === updatedOrder.id);
          if (idx !== -1) {
            const cloned = [...prev];
            cloned[idx] = updatedOrder;
            return cloned;
          } else {
            return [updatedOrder, ...prev];
          }
        });
      }
    });

    return () => {
      realTimeSync.off('ORDER_CREATED', onCreated);
      realTimeSync.off('ORDER_UPDATED', onUpdated);
    };
  }, []);

  const loadLiveOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/active`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) {
        setLiveOrders(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMenuItemsList = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/menu`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) {
        setMenuItemsList(result.data);
        if (result.data.length > 0) {
          setSelectedEditAddId(result.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/restaurants/settings`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) {
        setSettings(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadRidersList = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/staff`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) {
        const riders = result.data.filter(s => s.role === 'rider' && s.is_active && !s.deleted_at);
        setRidersList(riders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (item) => {
    if (!item.is_available) {
      toast.error(`${item.name} is currently unavailable.`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const updateCartQty = (itemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const printReceipt = (order, type = 'customer') => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    
    const restaurantName = user?.restaurantName || settings?.name || 'Smart POS';
    const restaurantLogo = user?.restaurantLogo || settings?.logo_url;
    
    let html = '';
    if (type === 'kot') {
      html = `
        <html>
          <head>
            <title>KOT - ${order.id}</title>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; color: black; background: white; }
              .text-center { text-align: center; }
              .border-b { border-bottom: 1px dashed black; }
              .pb-2 { padding-bottom: 5px; }
              .mb-2 { margin-bottom: 10px; }
              .font-bold { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 4px 0; text-align: left; }
              .text-right { text-align: right; }
              .item-row { border-bottom: 1px dashed #ddd; }
              .notes-box { border-top: 1px solid black; padding-top: 5px; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="text-center border-b pb-2 mb-2">
              <div style="font-size: 16px; font-weight: bold; text-transform: uppercase;">KOT (Kitchen Order Ticket)</div>
              <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">Order ID: #${order.order_number || order.id.slice(0, 8)}</div>
              <div style="font-size: 11px;">Date: ${new Date(order.timestamp).toLocaleString()}</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 5px; text-transform: uppercase;">
                Type: ${order.billing?.order_type?.replace('_', ' ') || 'dine in'}
              </div>
              ${order.table_name || order.table ? `
                <div style="font-size: 14px; font-weight: bold;">
                  ${['Take Away', 'Delivery'].includes(order.table_name || order.table)
                    ? (order.table_name || order.table)
                    : `Table: ${order.table_name || order.table}`}
                </div>
              ` : ''}
            </div>
            <table>
              <thead>
                <tr style="border-bottom: 1px solid black; font-size: 11px;">
                  <th>Item</th>
                  <th class="text-right" style="width: 50px;">Qty</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr class="item-row">
                    <td style="font-size: 12px;">${item.name}</td>
                    <td class="text-right" style="font-size: 12px; font-weight: bold;">x${item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${order.billing?.notes ? `
              <div class="notes-box">
                <strong>Kitchen Instructions / Notes:</strong>
                <div style="font-style: italic; margin-top: 3px; font-size: 11px; white-space: pre-wrap;">${order.billing.notes}</div>
              </div>
            ` : ''}
          </body>
        </html>
      `;
    } else {
      // Customer Receipt
      html = `
        <html>
          <head>
            <title>Receipt - #${order.order_number || order.id.slice(0, 8)}</title>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; color: black; background: white; }
              .text-center { text-align: center; }
              .border-b { border-bottom: 1px dashed black; }
              .pb-2 { padding-bottom: 5px; }
              .mb-2 { margin-bottom: 10px; }
              .font-bold { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 3px 0; text-align: left; }
              .text-right { text-align: right; }
              .text-center-align { text-align: center; }
              .totals-box { border-top: 1px dashed black; padding-top: 4px; font-size: 11px; line-height: 1.3; }
              .flex-row { display: flex; justify-content: space-between; }
              .grand-total { font-size: 13px; font-weight: bold; border-top: 1px solid black; padding-top: 4px; margin-top: 4px; }
              .delivery-box { border-top: 1px solid black; margin-top: 8px; padding-top: 4px; font-size: 10px; line-height: 1.2; }
            </style>
          </head>
          <body>
            <div class="text-center border-b pb-2 mb-2">
              ${restaurantLogo ? `<img src="${restaurantLogo}" style="max-height: 40px; margin-bottom: 5px; display: inline-block;" />` : ''}
              <div style="font-size: 15px; font-weight: bold;">${restaurantName}</div>
              ${settings?.address ? `<div style="font-size: 10px; margin-top: 2px;">${settings.address}</div>` : ''}
              ${settings?.phone ? `<div style="font-size: 10px;">Tel: ${settings.phone}</div>` : ''}
              <div style="font-size: 12px; font-weight: bold; margin-top: 5px; border: 1px solid black; display: inline-block; padding: 2px 6px; text-transform: uppercase;">
                ${order.billing?.order_type?.replace('_', ' ') || 'dine in'} Bill
              </div>
              <div style="margin-top: 5px; font-size: 11px; font-weight: bold;">Order: #${order.order_number || order.id.slice(0, 8)}</div>
              <div style="font-size: 11px;">Date: ${new Date(order.timestamp).toLocaleString()}</div>
              ${order.billing?.confirmedBy ? `<div style="font-size: 11px;">Staff: ${order.billing.confirmedBy}</div>` : ''}
              ${order.table_name || order.table ? `
                <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">
                  ${['Take Away', 'Delivery'].includes(order.table_name || order.table)
                    ? (order.table_name || order.table)
                    : `Table: ${order.table_name || order.table}`}
                </div>
              ` : ''}
            </div>
            
            <table style="margin-bottom: 8px;">
              <thead>
                <tr style="border-bottom: 1px solid black; font-size: 11px;">
                  <th>Item</th>
                  <th class="text-center-align" style="width: 35px;">Qty</th>
                  <th class="text-right" style="width: 65px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td style="font-size: 11px;">${item.name}</td>
                    <td class="text-center-align" style="font-size: 11px;">${item.quantity}</td>
                    <td class="text-right" style="font-size: 11px;">Rs ${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-box">
              <div class="flex-row">
                <span>Subtotal:</span>
                <span>Rs ${order.billing.subtotal.toFixed(2)}</span>
              </div>
              <div class="flex-row">
                <span>Taxes (8%):</span>
                <span>Rs ${order.billing.tax.toFixed(2)}</span>
              </div>
              <div class="flex-row">
                <span>Service Charge (5%):</span>
                <span>Rs ${order.billing.serviceCharge.toFixed(2)}</span>
              </div>
              ${order.billing.discount > 0 ? `
                <div class="flex-row" style="color: red;">
                  <span>Discount:</span>
                  <span>- Rs ${order.billing.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="flex-row grand-total">
                <span>GRAND TOTAL:</span>
                <span>Rs ${order.billing.total.toFixed(2)}</span>
              </div>
              ${order.billing.paymentStatus === 'pending' ? `
                <div class="flex-row" style="font-weight: bold; color: #d97706; border-top: 1px dashed black; padding-top: 2px; margin-top: 2px;">
                  <span>PENDING AMOUNT:</span>
                  <span>Rs ${order.billing.pendingAmount.toFixed(2)}</span>
                </div>
              ` : ''}
            </div>

            ${order.order_type === 'delivery' ? `
              <div class="delivery-box">
                <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">Delivery Address</div>
                <div>Name: ${order.billing.customerName}</div>
                <div>Phone: ${order.billing.customerPhone}</div>
                <div>Address: ${order.billing.deliveryAddress}, ${order.billing.deliveryArea}, ${order.billing.deliveryCity}</div>
                ${order.billing.deliveryInstructions ? `<div>Instructions: ${order.billing.deliveryInstructions}</div>` : ''}
                ${order.billing.rider ? `<div>Rider: ${order.billing.rider.name || order.billing.rider.display_name}</div>` : ''}
              </div>
            ` : ''}

            <div class="text-center" style="border-top: 1px dashed black; margin-top: 8px; padding-top: 4px; font-size: 10px;">
              Thank you for dining with us!
            </div>
          </body>
        </html>
      `;
    }
    
    doc.write(html);
    doc.close();

    printFrame.onload = () => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    };
  };

  const handleManualCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Cart is empty. Please add items first.');
      return;
    }

    setPosLoading(true);
    try {
      const taxRate = settings && settings.tax_rate !== null ? parseFloat(settings.tax_rate) : 8.00;
      const serviceChargeRate = settings && settings.service_charge !== null ? parseFloat(settings.service_charge) : 5.00;
      
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
      const serviceChargeVal = parseFloat((subtotal * (serviceChargeRate / 100)).toFixed(2));
      const grandTotal = parseFloat((subtotal + tax + serviceChargeVal - parseFloat(manualDiscount || 0)).toFixed(2));

      const payload = {
        restaurant_id: user?.restaurantSlug || user?.restaurantId,
        table: manualOrderType === 'dine_in' ? manualTable : (manualOrderType === 'takeaway' ? 'Take Away' : 'Delivery'),
        items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
        billing: {
          subtotal: subtotal,
          tax: tax,
          serviceCharge: serviceChargeVal,
          discount: parseFloat(manualDiscount || 0),
          total: grandTotal,
          paymentMethod: manualOrderType === 'dine_in' ? 'cash' : manualPaymentMethod,
          paymentStatus: manualOrderType === 'dine_in' ? 'pending' : manualPaymentStatus,
          pendingAmount: (manualOrderType === 'dine_in' || manualPaymentStatus === 'pending') ? grandTotal : 0,
          paymentTimestamp: (manualOrderType !== 'dine_in' && manualPaymentStatus === 'paid') ? new Date().toISOString() : null,
          confirmedBy: user?.displayName || 'Sales Rep',
          
          order_source: 'manual',
          order_type: manualOrderType,
          
          customerName: manualOrderType !== 'dine_in' ? manualCustomerName : null,
          customerPhone: manualOrderType !== 'dine_in' ? manualCustomerPhone : null,
          notes: manualOrderNotes,
          
          guests: manualOrderType === 'dine_in' ? parseInt(manualGuests || 1, 10) : null,
          pickupTime: manualOrderType === 'takeaway' ? manualPickupTime : null,
          deliveryAddress: manualOrderType === 'delivery' ? manualDeliveryAddress : null,
          deliveryArea: manualOrderType === 'delivery' ? manualDeliveryArea : null,
          deliveryCity: manualOrderType === 'delivery' ? manualDeliveryCity : null,
          deliveryInstructions: manualOrderType === 'delivery' ? manualDeliveryInstructions : null,
          rider: manualOrderType === 'delivery' && manualRiderId ? ridersList.find(r => r.id === manualRiderId) : null
        }
      };

      const res = await fetch(`${BACKEND_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        const createdOrder = result.data;
        
        // Print Customer Receipt (for delivery immediately)
        if (manualOrderType === 'delivery') {
          printReceipt(createdOrder, 'customer');
        }

        if (manualOrderType === 'delivery') {
          toast.success('Delivery order created successfully!');
        } else {
          toast.success('Order successfully sent to the kitchen.');
        }

        setCart([]);
        setManualDiscount(0);
        setManualOrderNotes('');
        setManualCustomerName('');
        setManualCustomerPhone('');
        setManualDeliveryAddress('');
        setManualDeliveryArea('');
        setManualDeliveryCity('');
        setManualDeliveryInstructions('');
        setManualRiderId('');
        setManualTable('Table 1');
        setManualGuests(1);
        setManualPickupTime('');
        setManualOrderType('dine_in');
        setManualPaymentStatus('paid');
        setManualPaymentMethod('cash');
        setIsManualOrderOpen(false);
        loadLiveOrders();
      } else {
        toast.error(result.message || 'Failed to create order.');
      }
    } catch (err) {
      toast.error('Network error. Failed to create order.');
      console.error(err);
    }
    setPosLoading(false);
  };

  const loadHistoryOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) {
        setHistoryOrders(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const playAlertSound = () => {
    try {
      const src = "https://assets.mixkit.co/active_storage/sfx/911/911-84.wav";
      const audio = new Audio(src);
      audio.play().catch(() => {});
      // Play a second ring 800ms later for better audibility
      setTimeout(() => {
        const audio2 = new Audio(src);
        audio2.play().catch(() => {});
      }, 800);
    } catch (e) {}
  };

  // Mutate order state APIs
  const handleConfirmOrder = async (orderId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ status: 'confirmed' })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Order confirmed and sent to kitchen.');
        loadLiveOrders();
      } else {
        toast.error(result.message || 'Failed to confirm order.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error. Failed to confirm order.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm("Are you sure you want to reject/cancel this order?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      const result = await res.json();
      if (result.success) {
        loadLiveOrders();
        setIsBillingModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkServed = async (orderId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ status: 'served' })
      });
      const result = await res.json();
      if (result.success) loadLiveOrders();
    } catch (err) {
      console.error(err);
    }
  };

  // Billing Modal
  const openBillingModal = (order, isHistory = false) => {
    setBillingOrder(order);
    setBillingPaymentMethod(null);
    setIsHistoryViewOnly(isHistory);
    setIsBillingModalOpen(true);
  };

  const handleSettlePayment = async () => {
    if (!billingOrder) return;
    if (!billingPaymentMethod) {
      toast.warning("Please select payment method (Cash or Card) first.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${billingOrder.id}/pay`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ paymentMethod: billingPaymentMethod })
      });
      const result = await res.json();
      if (result.success) {
        setIsBillingModalOpen(false);
        loadLiveOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Modal Actions
  const openEditModal = (order) => {
    setEditOrder(order);
    setEditTempItems(order.items.map(i => ({ ...i })));
    setIsEditModalOpen(true);
  };

  const handleEditChangeQty = (itemId, delta) => {
    setEditTempItems(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleEditRemoveItem = (itemId) => {
    setEditTempItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleEditAddItem = () => {
    const menuItem = menuItemsList.find(m => m.id === selectedEditAddId);
    if (!menuItem) return;

    setEditTempItems(prev => {
      const existing = prev.find(i => i.id === selectedEditAddId);
      if (existing) {
        return prev.map(i => i.id === selectedEditAddId ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, { id: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: 1 }];
      }
    });
  };

  const handleSaveEdits = async () => {
    if (editTempItems.length === 0) {
      toast.warning("Please add at least one item to save changes.");
      return;
    }

    try {
      const payload = editTempItems.map(i => ({ id: i.id, quantity: i.quantity }));
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${editOrder.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ items: payload })
      });
      const result = await res.json();
      if (result.success) {
        setIsEditModalOpen(false);
        loadLiveOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter orders by source/type
  const filterOrders = (orders) => {
    if (orderFilter === 'all') return orders;
    if (orderFilter === 'qr') return orders.filter(o => !o.order_source || o.order_source === 'qr');
    if (orderFilter === 'manual') return orders.filter(o => o.order_source === 'manual');
    if (orderFilter === 'dine_in') return orders.filter(o => o.order_type === 'dine_in');
    if (orderFilter === 'takeaway') return orders.filter(o => o.order_type === 'takeaway');
    if (orderFilter === 'delivery') return orders.filter(o => o.order_type === 'delivery');
    return orders;
  };

  // Get active riders who have 0 pending delivery orders
  const getAvailableRiders = () => {
    const busyRiderIds = new Set();
    liveOrders.forEach(order => {
      const isDelivery = order.order_type === 'delivery' || order.billing?.order_type === 'delivery';
      const isPendingPay = order.billing?.paymentStatus === 'pending';
      const rider = order.billing?.rider;
      if (isDelivery && isPendingPay && rider && rider.id) {
        busyRiderIds.add(rider.id);
      }
    });
    return ridersList.filter(r => !busyRiderIds.has(r.id));
  };

  // Helper to determine currently occupied tables from active orders
  const getOccupiedTables = () => {
    const occupied = new Set();
    liveOrders.forEach(order => {
      if (order.status !== 'completed' && order.status !== 'cancelled') {
        const tableVal = order.table_name || order.table;
        if (tableVal && tableVal !== 'Take Away' && tableVal !== 'Delivery') {
          const cleanTable = tableVal.startsWith('Table ') ? tableVal : `Table ${tableVal}`;
          occupied.add(cleanTable);
        }
      }
    });
    return occupied;
  };

  // Calculate rider pending balances from live orders (any order with status !== 'completed' && status !== 'cancelled' and order_type === 'delivery' and paymentStatus === 'pending')
  const getRiderPendingBalances = () => {
    const balances = {};
    liveOrders.forEach(order => {
      const isDelivery = order.order_type === 'delivery' || order.billing?.order_type === 'delivery';
      const isPendingPay = order.billing?.paymentStatus === 'pending';
      const rider = order.billing?.rider;
      if (isDelivery && isPendingPay && rider) {
        const rName = rider.display_name || rider.name;
        if (rName) {
          balances[rName] = (balances[rName] || 0) + (order.billing?.total || 0);
        }
      }
    });
    return balances;
  };

  const getOrderBadges = (order) => {
    const badges = [];
    if (order.order_source === 'manual') {
      badges.push({ label: 'Manual Order', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold uppercase tracking-wider text-[0.6rem]' });
    } else {
      badges.push({ label: 'QR Order', className: 'bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase tracking-wider text-[0.6rem]' });
    }

    if (order.order_type === 'delivery') {
      badges.push({ label: 'Delivery', className: 'bg-orange-100 text-orange-800 border-orange-300 font-black uppercase tracking-wider text-[0.7rem] px-2 py-0.5 border-2 shadow-sm' });
    } else if (order.order_type === 'takeaway') {
      badges.push({ label: 'Take Away', className: 'bg-purple-100 text-purple-800 border-purple-300 font-black uppercase tracking-wider text-[0.7rem] px-2 py-0.5 border-2 shadow-sm' });
    } else {
      badges.push({ label: 'Dine In', className: 'bg-zinc-100 text-zinc-800 border-zinc-300 font-black uppercase tracking-wider text-[0.7rem] px-2 py-0.5 border-2 shadow-sm' });
    }
    return badges;
  };

  // Group columns
  const pendingOrders = filterOrders(liveOrders.filter(o => o.status === 'pending'));
  const preparingOrders = filterOrders(liveOrders.filter(o => o.status === 'confirmed' || o.status === 'cooking'));
  const readyOrders = filterOrders(liveOrders.filter(o => o.status === 'ready'));
  const servedOrders = filterOrders(liveOrders.filter(o => o.status === 'served' && o.order_type !== 'delivery'));

  const filteredHistory = historyOrders.filter(o => {
    const term = searchHistoryQuery.toLowerCase();
    return o.id.toLowerCase().includes(term) || o.table.toLowerCase().includes(term);
  }).filter(o => o.status === 'completed' || o.status === 'cancelled');

  const filteredMenuItems = menuItemsList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(manualSearchQuery.toLowerCase());
    const matchesCategory = manualCategory === 'all' || item.category === manualCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(menuItemsList.map(item => item.category).filter(Boolean))];

  if (isManualOrderOpen) {
    const taxRate = settings && settings.tax_rate !== null ? parseFloat(settings.tax_rate) : 8.00;
    const serviceChargeRate = settings && settings.service_charge !== null ? parseFloat(settings.service_charge) : 5.00;
    
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
    const serviceChargeVal = parseFloat((subtotal * (serviceChargeRate / 100)).toFixed(2));
    const grandTotal = parseFloat(Math.max(0, subtotal + tax + serviceChargeVal - parseFloat(manualDiscount || 0)).toFixed(2));

    return (
      <div className="fixed inset-0 bg-[#F8F9FA] z-50 flex flex-col text-[#2B2D42] font-sans">
        {activeNotification && (
          <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full bg-black text-white border border-zinc-800 rounded-2xl shadow-2xl p-4 cursor-pointer flex justify-between items-start animate-fade-in"
            onClick={() => {
              openBillingModal(activeNotification, true);
              setActiveNotification(null);
            }}
          >
            <div className="flex gap-3">
              <span className="text-xl">🔔</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black uppercase tracking-wider text-[#E63946]">New QR Order Received</span>
                <span className="text-sm font-bold mt-1 text-white">Table {activeNotification.table_name || activeNotification.table}</span>
                <span className="text-xs text-zinc-400 mt-0.5">Order #{activeNotification.order_number || activeNotification.id.slice(0, 4)}</span>
                <span className="text-xs text-zinc-400 mt-0.5 font-semibold">
                  {activeNotification.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} Items • Rs {activeNotification.billing?.total.toFixed(2)}
                </span>
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveNotification(null);
              }}
              className="text-zinc-500 hover:text-white text-sm p-1"
            >
              ✕
            </button>
          </div>
        )}
        {/* POS Header */}
        <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setIsManualOrderOpen(false)}
              className="flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-black transition-colors"
            >
              ← Back to Sales Screen
            </button>
            <div className="h-6 w-px bg-zinc-200" />
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>{user?.restaurantName || 'Gourmet Bistro'}</span>
              <span className="text-[10px] uppercase font-bold bg-black text-white px-2 py-0.5 rounded-md">POS Terminal</span>
            </h1>
          </div>
          <div className="text-sm font-bold text-zinc-500">
            Sales Rep: <span className="text-black font-extrabold">{user?.displayName || 'Sales Rep'}</span>
          </div>
        </header>

        {/* POS Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT SIDE - MENU */}
          <div className={`${cart.length > 0 ? 'w-[60%] border-r border-zinc-200' : 'w-full'} flex flex-col p-6 overflow-hidden transition-all duration-300`}>
            {/* Search and Filters */}
            <div className="flex flex-col gap-4 mb-6 shrink-0">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search menu products..."
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:border-black outline-none transition-colors text-black"
                />
                <span className="absolute left-3.5 top-3.5 text-zinc-400">🔍</span>
              </div>
              
              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setManualCategory(cat)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border capitalize shrink-0 transition-all ${
                      manualCategory === cat
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 italic text-sm">No items found matching the filters.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredMenuItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addToCart(item)}
                      disabled={!item.is_available}
                      className={`text-left bg-white border rounded-2xl p-3 flex flex-col justify-between transition-all hover:shadow-md border-zinc-200 hover:border-zinc-350 relative overflow-hidden group ${
                        !item.is_available ? 'opacity-50 cursor-not-allowed bg-zinc-50' : ''
                      }`}
                    >
                      <div>
                        {/* Product Image */}
                        <div className="w-full aspect-video rounded-xl bg-zinc-100 border border-zinc-150 overflow-hidden mb-3 relative flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.name} />
                          ) : (
                            <span className="text-3xl">🍲</span>
                          )}
                          {!item.is_available && (
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs font-black text-white uppercase tracking-wider">Out of Stock</span>
                          )}
                        </div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1 block">{item.category}</span>
                        <h4 className="font-bold text-xs text-[#2B2D42] mb-1 line-clamp-2 leading-tight">{item.name}</h4>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-50">
                        <span className="font-extrabold text-sm text-black">Rs {item.price.toFixed(2)}</span>
                        {item.is_available && (
                          <span className="h-6 w-6 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-xs font-bold group-hover:bg-black group-hover:text-white transition-colors">+</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE - ORDER CART (40% width) */}
          {cart.length > 0 && (
            <form onSubmit={handleManualCheckout} className="w-[40%] flex flex-col bg-white overflow-hidden animate-fade-in border-l border-zinc-200">
              {/* Order Title */}
              <div className="px-6 py-4 border-b border-zinc-200 shrink-0 flex justify-between items-center bg-zinc-50/50">
                <span className="font-black text-sm uppercase text-zinc-700 tracking-wider">Current Cart</span>
                <span className="font-bold text-xs bg-zinc-200 px-2 py-0.5 rounded-full text-black">{cart.reduce((sum, i) => sum + i.quantity, 0)} Items</span>
              </div>

              {/* Cart Items List - Independent Scroll Area */}
              <div className="max-h-[30%] overflow-y-auto p-6 flex flex-col gap-3 border-b border-zinc-150 shrink-0 bg-white">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white border border-zinc-200 p-3 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-150 overflow-hidden flex items-center justify-center border border-zinc-200">
                        {item.image ? (
                          <img src={item.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xl">🍲</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-black leading-tight">{item.name}</span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">Rs {item.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg">
                        <button type="button" onClick={() => updateCartQty(item.id, -1)} className="text-zinc-600 font-bold text-xs hover:bg-zinc-200 px-1.5 rounded transition-colors">−</button>
                        <span className="font-bold text-xs text-black min-w-[12px] text-center font-mono">{item.quantity}</span>
                        <button type="button" onClick={() => updateCartQty(item.id, 1)} className="text-zinc-600 font-bold text-xs hover:bg-zinc-200 px-1.5 rounded transition-colors">+</button>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFromCart(item.id)}
                        className="text-zinc-400 hover:text-rose-600 p-1 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrollable Configuration Panel */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-zinc-50/15">
                
                {/* Calculations Box */}
                <div className="flex flex-col gap-2.5 text-xs text-zinc-600 border border-zinc-200 bg-white p-4 rounded-2xl shadow-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Subtotal:</span>
                    <span className="font-bold text-black">Rs {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Taxes ({taxRate}%):</span>
                    <span className="font-bold text-black">Rs {tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Service Charge ({serviceChargeRate}%):</span>
                    <span className="font-bold text-black">Rs {serviceChargeVal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Discount Amount:</span>
                    <input 
                      type="number" 
                      min="0"
                      max={subtotal}
                      value={manualDiscount || ''}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="Rs 0.00"
                      className="w-28 py-1 px-3 text-right bg-white border border-zinc-200 rounded-lg outline-none text-xs font-extrabold focus:border-black text-black"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-black border-t border-zinc-100 pt-2.5 mt-1 text-black">
                    <span>GRAND TOTAL:</span>
                    <span>Rs {grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Order Type & Details Selector */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Order Type Details</label>
                  
                  {/* Type Switches */}
                  <div className="flex border border-zinc-200 rounded-xl overflow-hidden p-0.5 bg-zinc-50 shrink-0">
                    {[
                      { key: 'dine_in', label: 'Dine In', icon: UtensilsCrossed },
                      { key: 'takeaway', label: 'Take Away', icon: ShoppingBag },
                      { key: 'delivery', label: 'Delivery', icon: Truck }
                    ].map(type => (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => {
                          setManualOrderType(type.key);
                          if (type.key !== 'delivery') {
                            setManualPaymentStatus('paid');
                          }
                        }}
                        className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 rounded-lg ${
                          manualOrderType === type.key
                            ? 'bg-white text-black shadow-sm'
                            : 'text-zinc-400 hover:text-black'
                        }`}
                      >
                        <type.icon size={12} />
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Fields Container */}
                  <div className="flex flex-col gap-3">
                    {/* DINE IN FIELDS */}
                    {manualOrderType === 'dine_in' && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Select Table</label>
                          <select
                            value={manualTable}
                            onChange={(e) => setManualTable(e.target.value)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                          >
                            {Array.from({ length: 12 }, (_, i) => `Table ${i + 1}`).map(t => {
                              const isOccupied = getOccupiedTables().has(t);
                              return (
                                <option key={t} value={t} disabled={isOccupied}>
                                  {t} {isOccupied ? ' (Occupied)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="flex-grow">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Number of Guests</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={manualGuests}
                            onChange={(e) => setManualGuests(parseInt(e.target.value, 10) || 1)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                          />
                        </div>
                      </div>
                    )}

                    {/* TAKE AWAY FIELDS */}
                    {manualOrderType === 'takeaway' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Customer Name</label>
                            <input
                              type="text"
                              required
                              value={manualCustomerName}
                              onChange={(e) => setManualCustomerName(e.target.value)}
                              placeholder="e.g. Ali"
                              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Phone Number</label>
                            <input
                              type="tel"
                              required
                              value={manualCustomerPhone}
                              onChange={(e) => setManualCustomerPhone(e.target.value)}
                              placeholder="e.g. 03001234567"
                              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Estimated Pickup Time</label>
                          <input
                            type="time"
                            value={manualPickupTime}
                            onChange={(e) => setManualPickupTime(e.target.value)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                          />
                        </div>
                      </div>
                    )}

                    {/* DELIVERY FIELDS */}
                    {manualOrderType === 'delivery' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Customer Name</label>
                            <input
                              type="text"
                              required
                              value={manualCustomerName}
                              onChange={(e) => setManualCustomerName(e.target.value)}
                              placeholder="Name"
                              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Phone Number</label>
                            <input
                              type="tel"
                              required
                              value={manualCustomerPhone}
                              onChange={(e) => setManualCustomerPhone(e.target.value)}
                              placeholder="Phone"
                              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Complete Delivery Address</label>
                          <input
                            type="text"
                            required
                            value={manualDeliveryAddress}
                            onChange={(e) => setManualDeliveryAddress(e.target.value)}
                            placeholder="Street address, house number..."
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Area</label>
                            <input
                              type="text"
                              required
                              value={manualDeliveryArea}
                              onChange={(e) => setManualDeliveryArea(e.target.value)}
                              placeholder="e.g. Johar Town"
                              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">City</label>
                            <input
                              type="text"
                              required
                              value={manualDeliveryCity}
                              onChange={(e) => setManualDeliveryCity(e.target.value)}
                              placeholder="e.g. Lahore"
                              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Delivery Instructions</label>
                          <input
                            type="text"
                            value={manualDeliveryInstructions}
                            onChange={(e) => setManualDeliveryInstructions(e.target.value)}
                            placeholder="Leave at gate, ring bell..."
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                          />
                        </div>
                        
                        {/* Rider Assignment */}
                        <div className="flex flex-col sm:flex-row gap-3 border-t border-zinc-200 pt-3">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Assign Rider</label>
                            <select
                              value={manualRiderId}
                              onChange={(e) => setManualRiderId(e.target.value)}
                              className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black text-black"
                            >
                              <option value="">Choose Rider...</option>
                              {getAvailableRiders().map(r => (
                                <option key={r.id} value={r.id}>{r.display_name} ({r.employee_code})</option>
                              ))}
                            </select>
                          </div>
                          {manualRiderId && (
                            <div className="text-[10px] text-zinc-500 self-end mb-2">
                              Status: <span className="font-bold text-emerald-600">Active</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Notes Textarea */}
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Order Notes</label>
                  <textarea
                    rows="2"
                    value={manualOrderNotes}
                    onChange={(e) => setManualOrderNotes(e.target.value)}
                    placeholder="Kitchen instructions or notes..."
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-black resize-none text-black"
                  />
                </div>

                {/* Payment Settle Options */}
                {manualOrderType !== 'dine_in' && (
                  <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-600">Payment Status:</span>
                      <div className="flex gap-2">
                        {['paid', 'pending'].map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setManualPaymentStatus(st)}
                            className={`px-3 py-1 text-[10px] font-bold border rounded-lg uppercase tracking-wider ${
                              manualPaymentStatus === st
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-zinc-400 border-zinc-200 hover:text-black'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {manualPaymentStatus === 'paid' ? (
                      <div className="flex gap-2">
                        {[
                          { key: 'cash', label: 'Cash', icon: DollarSign },
                          { key: 'card', label: 'Card', icon: CreditCard },
                          { key: 'online', label: 'Online', icon: Clock }
                        ].map(pm => (
                          <button
                            key={pm.key}
                            type="button"
                            onClick={() => setManualPaymentMethod(pm.key)}
                            className={`flex-grow py-2 border font-bold text-xs transition-all flex items-center justify-center gap-1.5 rounded-xl ${
                              manualPaymentMethod === pm.key
                                ? 'bg-black text-white border-black hover:bg-zinc-800'
                                : 'bg-white text-black border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            <pm.icon size={12} />
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 font-bold bg-amber-50 border border-amber-200 text-amber-700 p-2.5 rounded-xl">
                        ⚠️ Settle unpaid balance of <span className="font-extrabold text-black">Rs {grandTotal.toFixed(2)}</span> later during settlement.
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t border-zinc-200 shrink-0 flex gap-4 bg-white">
                <button
                  type="button"
                  onClick={clearCart}
                  className="flex-1 py-3 border border-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-600 font-bold text-xs rounded-xl transition-all"
                >
                  Clear Cart
                </button>
                <button
                  type="submit"
                  disabled={posLoading || cart.length === 0}
                  className="flex-[2] py-3 bg-black text-white hover:bg-zinc-800 font-bold text-xs rounded-xl transition-all shadow-md shadow-black/15 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
                >
                  {posLoading ? 'Processing...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6">
      {activeNotification && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full bg-black text-white border border-zinc-800 rounded-2xl shadow-2xl p-4 cursor-pointer flex justify-between items-start animate-fade-in"
          onClick={() => {
            openBillingModal(activeNotification, true);
            setActiveNotification(null);
          }}
        >
          <div className="flex gap-3">
            <span className="text-xl">🔔</span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black uppercase tracking-wider text-[#E63946]">New QR Order Received</span>
              <span className="text-sm font-bold mt-1 text-white">Table {activeNotification.table_name || activeNotification.table}</span>
              <span className="text-xs text-zinc-400 mt-0.5">Order #{activeNotification.order_number || activeNotification.id.slice(0, 4)}</span>
              <span className="text-xs text-zinc-400 mt-0.5 font-semibold">
                {activeNotification.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} Items • Rs {activeNotification.billing?.total.toFixed(2)}
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveNotification(null);
            }}
            className="text-zinc-500 hover:text-white text-sm p-1"
          >
            ✕
          </button>
        </div>
      )}
      <div className="max-w-[1400px] mx-auto print:max-w-full">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center bg-white border border-zinc-200 rounded-2xl p-6 mb-8 print:hidden gap-4">
          <div className="flex items-center gap-4">
            {user?.restaurantLogo ? (
              <img src={user.restaurantLogo} className="h-11 w-auto object-contain border border-zinc-200 p-1 bg-white rounded-xl" alt={user.restaurantName} />
            ) : (
              <span className="text-xl font-bold uppercase">Logo</span>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-black leading-none flex items-center gap-2">
                <span className="font-extrabold text-black font-playwrite">{user?.restaurantName || 'Apex Scan'}</span>
                <span className="text-xs font-bold uppercase tracking-wider border border-zinc-200 px-2.5 py-1 rounded-lg bg-black text-white">Sales Terminal</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-black text-xs font-medium">Verify reviews, modify orders, and settle tables</p>
                <span className="text-xs font-semibold border border-zinc-200 px-2.5 py-1 rounded-lg bg-zinc-50 text-zinc-700">
                  {user?.displayName || 'Sales Agent'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => {
                loadRidersList();
                // Determine first available table
                const occupied = new Set();
                liveOrders.forEach(order => {
                  if (order.status !== 'completed' && order.status !== 'cancelled') {
                    const tableVal = order.table_name || order.table;
                    if (tableVal && tableVal !== 'Take Away' && tableVal !== 'Delivery') {
                      const cleanTable = tableVal.startsWith('Table ') ? tableVal : `Table ${tableVal}`;
                      occupied.add(cleanTable);
                    }
                  }
                });
                let firstAvailable = 'Table 1';
                for (let i = 1; i <= 12; i++) {
                  const t = `Table ${i}`;
                  if (!occupied.has(t)) {
                    firstAvailable = t;
                    break;
                  }
                }
                setManualTable(firstAvailable);
                setIsManualOrderOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-zinc-800 text-xs font-bold rounded-xl transition-colors"
            >
              <Plus size={14} strokeWidth={3} />
              New Manual Order
            </button>
            <nav className="flex bg-zinc-50 border border-zinc-200 rounded-xl p-1 gap-1">
              <button
                onClick={() => setActiveTab('live')}
                className={`px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'live'
                    ? 'bg-white text-black shadow-sm rounded-lg'
                    : 'text-zinc-400 hover:text-black'
                }`}
              >
                Live ({liveOrders.filter(o => o.status !== 'served').length})
              </button>
              <button
                onClick={() => setActiveTab('bills')}
                className={`px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'bills'
                    ? 'bg-white text-black shadow-sm rounded-lg'
                    : 'text-zinc-400 hover:text-black'
                }`}
              >
                Served/Bills ({servedOrders.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  loadHistoryOrders();
                }}
                className={`px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-black shadow-sm rounded-lg'
                    : 'text-zinc-400 hover:text-black'
                }`}
              >
                History
              </button>
            </nav>
            <button
              onClick={logout}
              className="px-4 py-2 bg-white text-black border border-zinc-200 hover:bg-zinc-50 text-xs font-bold rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>



        {/* Tab 1: Live Orders */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* Column 1: Pending */}
            <div className="bg-white border border-zinc-200 p-5 min-h-[600px] flex flex-col rounded-2xl shadow-sm">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5">
                <h3 className="text-base font-bold text-black">Pending Review</h3>
                <span className="border border-zinc-200 font-bold text-xs px-2.5 py-1 rounded-lg bg-zinc-50 text-black">{pendingOrders.length}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[700px]">
                {pendingOrders.length === 0 ? (
                  <p className="text-zinc-500 text-center py-12 text-sm italic">No pending orders to review.</p>
                ) : (
                  pendingOrders.map(order => (
                    <div key={order.id} className="bg-white border border-zinc-200 p-5 flex flex-col justify-between rounded-2xl shadow-sm">
                      <div>
                        <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5 mb-3">
                          <span className="text-black font-bold text-sm">{['Take Away', 'Delivery'].includes(order.table_name || order.table) ? (order.table_name || order.table) : `Table ${order.table_name || order.table}`}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            {getOrderBadges(order).map((b, idx) => (
                              <span key={idx} className={`text-[0.65rem] px-2 py-0.5 font-bold border rounded-lg ${b.className}`}>
                                {b.label}
                              </span>
                            ))}
                            <span className="text-zinc-400 text-xs ml-auto">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <ul className="flex flex-col gap-1.5 mb-4">
                          {order.items.map((i, idx) => (
                            <li key={idx} className="flex justify-between text-xs text-black">
                              <span>{i.name}</span>
                              <span className="font-bold text-black">x{i.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-t border-zinc-100 pt-3 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs text-black">
                          <span>Tax: Rs {order.billing.tax ? order.billing.tax.toFixed(2) : '0.00'}</span>
                          <span className="font-bold text-sm">Total: Rs {order.billing.total.toFixed(2)}</span>
                        </div>
                        {order.billing?.confirmedBy && (
                          <div className="text-[10px] text-zinc-500 -mt-2">Sales Rep: {order.billing.confirmedBy}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="flex-1 py-2 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-xs rounded-xl transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => openEditModal(order)}
                            className="py-2 px-3 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-xs rounded-xl transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleConfirmOrder(order.id)}
                            className="flex-[1.5] py-2 bg-black text-white hover:bg-zinc-800 font-bold text-xs rounded-xl transition-colors"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Preparing */}
            <div className="bg-white border border-zinc-200 p-5 min-h-[600px] flex flex-col rounded-2xl shadow-sm">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5">
                <h3 className="text-base font-bold text-black">In Preparation</h3>
                <span className="border border-zinc-200 font-bold text-xs px-2.5 py-1 rounded-lg bg-zinc-50 text-black">{preparingOrders.length}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[700px]">
                {preparingOrders.length === 0 ? (
                  <p className="text-zinc-500 text-center py-12 text-sm italic">No orders currently preparing.</p>
                ) : (
                  preparingOrders.map(order => (
                    <div key={order.id} className="bg-white border border-zinc-200 p-5 flex flex-col justify-between rounded-2xl shadow-sm">
                      <div>
                        <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5 mb-3">
                          <span className="text-black font-bold text-sm">{['Take Away', 'Delivery'].includes(order.table_name || order.table) ? (order.table_name || order.table) : `Table ${order.table_name || order.table}`}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            {getOrderBadges(order).map((b, idx) => (
                              <span key={idx} className={`text-[0.65rem] px-2 py-0.5 font-bold border rounded-lg ${b.className}`}>
                                {b.label}
                              </span>
                            ))}
                            <span className={`text-[0.7rem] px-2 py-0.5 font-bold border border-zinc-200 rounded-lg ml-auto ${
                              order.status === 'cooking' ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-800'
                            }`}>
                              {order.status === 'cooking' ? 'Preparing' : 'Confirmed'}
                            </span>
                          </div>
                        </div>
                        <ul className="flex flex-col gap-1.5 mb-4">
                          {order.items.map((i, idx) => (
                            <li key={idx} className="flex justify-between text-xs text-black">
                              <span>{i.name}</span>
                              <span className="font-bold text-black">x{i.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-t border-zinc-100 pt-3 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs text-black">
                          <span>Tax: Rs {order.billing.tax ? order.billing.tax.toFixed(2) : '0.00'}</span>
                          <span className="font-bold text-sm">Total: Rs {order.billing.total.toFixed(2)}</span>
                        </div>
                        {order.billing?.confirmedBy && (
                          <div className="text-[10px] text-zinc-500 -mt-2">Sales Rep: {order.billing.confirmedBy}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(order)}
                            className="flex-1 py-2 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-xs rounded-xl transition-colors"
                          >
                            Edit Items
                          </button>
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="flex-1 py-2 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-xs rounded-xl transition-colors"
                          >
                            Cancel Order
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Ready */}
            <div className="bg-white border border-zinc-200 p-5 min-h-[600px] flex flex-col rounded-2xl shadow-sm">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5">
                <h3 className="text-base font-bold text-black">Ready to Serve</h3>
                <span className="border border-zinc-200 font-bold text-xs px-2.5 py-1 rounded-lg bg-zinc-50 text-black">{readyOrders.length}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[700px]">
                {readyOrders.length === 0 ? (
                  <p className="text-zinc-500 text-center py-12 text-sm italic">No orders ready to serve.</p>
                ) : (
                  readyOrders.map(order => (
                    <div key={order.id} className="bg-white border border-zinc-200 p-5 flex flex-col justify-between rounded-2xl shadow-sm">
                      <div>
                        <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5 mb-3">
                          <span className="text-black font-bold text-sm">{['Take Away', 'Delivery'].includes(order.table_name || order.table) ? (order.table_name || order.table) : `Table ${order.table_name || order.table}`}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            {getOrderBadges(order).map((b, idx) => (
                              <span key={idx} className={`text-[0.65rem] px-2 py-0.5 font-bold border rounded-lg ${b.className}`}>
                                {b.label}
                              </span>
                            ))}
                            <span className="border border-zinc-200 bg-black text-white text-[0.7rem] px-2.5 py-0.5 font-bold rounded-lg ml-auto">Ready</span>
                          </div>
                        </div>
                        <ul className="flex flex-col gap-1.5 mb-4">
                          {order.items.map((i, idx) => (
                            <li key={idx} className="flex justify-between text-xs text-black">
                              <span>{i.name}</span>
                              <span className="font-bold text-black">x{i.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-t border-zinc-100 pt-3 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs text-black">
                          <span>Tax: Rs {order.billing.tax ? order.billing.tax.toFixed(2) : '0.00'}</span>
                          <span className="font-bold text-sm">Total: Rs {order.billing.total.toFixed(2)}</span>
                        </div>
                        {order.billing?.confirmedBy && (
                          <div className="text-[10px] text-zinc-500 -mt-2">Sales Rep: {order.billing.confirmedBy}</div>
                        )}
                        <button
                          onClick={() => handleMarkServed(order.id)}
                          className="w-full py-2 bg-black text-white hover:bg-zinc-800 font-bold text-xs rounded-xl transition-colors"
                        >
                          Mark Served
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Served / Pending Bills */}
        {activeTab === 'bills' && (
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 print:hidden rounded-2xl shadow-sm">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-black">Served Tables (Awaiting Payment Settle)</h2>
              <span className="border border-zinc-200 font-bold text-sm px-3 py-1 bg-black text-white rounded-lg">{servedOrders.length}</span>
            </div>

            {/* Rider Pending Balances Summary Panel */}
            {Object.keys(getRiderPendingBalances()).length > 0 && (
              <div className="mb-8 border border-zinc-200 rounded-2xl p-6 bg-zinc-50 text-black">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🚴</span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-600">Rider Outstanding Cash Summary</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(getRiderPendingBalances()).map(([riderName, balance]) => {
                    const riderOrders = liveOrders.filter(o => 
                      (o.order_type === 'delivery' || o.billing?.order_type === 'delivery') && 
                      o.status !== 'completed' &&
                      o.status !== 'cancelled' &&
                      o.billing?.paymentStatus === 'pending' &&
                      (o.billing?.rider?.display_name === riderName || o.billing?.rider?.name === riderName)
                    );

                    return (
                      <div key={riderName} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start border-b border-zinc-100 pb-3 mb-3">
                            <div>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Rider Name</span>
                              <span className="text-sm font-extrabold text-black mt-0.5 block">{riderName}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Total Outstanding</span>
                              <span className="text-sm font-black text-amber-700 block">Rs {balance.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* List of Pending Delivery Orders for this Rider */}
                          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Assigned Deliveries ({riderOrders.length})</span>
                            {riderOrders.map(order => (
                              <div key={order.id} className="flex justify-between items-center bg-zinc-50 border border-zinc-200 p-2.5 rounded-lg text-xs">
                                <div className="flex flex-col text-left gap-0.5">
                                  <span className="font-bold text-black">
                                    #{order.order_number || order.id.slice(0, 4)} 
                                    {order.billing?.customerName ? ` - ${order.billing.customerName}` : ''}
                                  </span>
                                  <span className="text-[10px] text-zinc-500">
                                    {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} items • Rs {order.billing?.total.toFixed(2)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => openBillingModal(order)}
                                  className="px-2.5 py-1.5 bg-black hover:bg-zinc-800 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors shrink-0 ml-2"
                                >
                                  Settle
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {servedOrders.length === 0 ? (
                <p className="col-span-full text-zinc-500 text-center py-12 italic text-sm">No served tables awaiting settlement.</p>
              ) : (
                servedOrders.map(order => (
                  <div key={order.id} className="bg-white border border-zinc-200 p-5 flex flex-col justify-between rounded-2xl shadow-sm">
                    <div>
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5 mb-3">
                        <span className="text-black font-bold text-sm">{['Take Away', 'Delivery'].includes(order.table_name || order.table) ? (order.table_name || order.table) : `Table ${order.table_name || order.table}`}</span>
                        <div className="flex flex-wrap items-center gap-1">
                          {getOrderBadges(order).map((b, idx) => (
                            <span key={idx} className={`text-[0.65rem] px-2 py-0.5 font-bold border rounded-lg ${b.className}`}>
                              {b.label}
                            </span>
                          ))}
                          <span className="border border-zinc-200 text-[0.7rem] px-2 py-0.5 font-bold bg-zinc-50 text-black rounded-lg ml-auto">Served</span>
                        </div>
                      </div>
                      <ul className="flex flex-col gap-1.5 mb-4">
                        {order.items.map((i, idx) => (
                          <li key={idx} className="flex justify-between text-xs text-black">
                            <span>{i.name}</span>
                            <span className="font-bold text-black">x{i.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t border-zinc-100 pt-3">
                       <div className="flex justify-between items-center text-xs mb-3 text-black">
                          <span>Tax: Rs {order.billing.tax ? order.billing.tax.toFixed(2) : '0.00'}</span>
                          <span className="font-bold text-sm">Total Bill: Rs {order.billing.total.toFixed(2)}</span>
                        </div>
                        {order.billing?.confirmedBy && (
                          <div className="text-[10px] text-zinc-500 -mt-2 mb-3">Sales Rep: {order.billing.confirmedBy}</div>
                        )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(order)}
                          className="flex-1 py-2 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-xs rounded-xl transition-colors"
                        >
                          Edit Order
                        </button>
                        <button
                          onClick={() => openBillingModal(order)}
                          className="flex-[1.2] py-2 bg-black text-white hover:bg-zinc-800 font-bold text-xs rounded-xl transition-colors"
                        >
                          Settle Bill
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Order History */}
        {activeTab === 'history' && (
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 print:hidden rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-black">Completed & Cancelled History</h2>
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search history by Table or ID..."
                  value={searchHistoryQuery}
                  onChange={(e) => setSearchHistoryQuery(e.target.value)}
                  className="w-full py-2.5 px-4 bg-white border border-zinc-200 text-black text-sm outline-none rounded-xl focus:border-zinc-400 transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-black">
                <thead className="text-xs uppercase bg-zinc-50 text-zinc-600 border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3.5 border-b border-zinc-200">Order ID</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200">Table</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200">Items</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200">Tax</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200">Total</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200">Status</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200">Payment</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200 text-xs">Time</th>
                    <th className="px-5 py-3.5 border-b border-zinc-200 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-5 py-8 text-center text-zinc-500 italic border-b border-zinc-100">No historical orders found.</td>
                    </tr>
                  ) : (
                    filteredHistory.map(order => (
                      <tr key={order.id} className="bg-white hover:bg-zinc-50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-black border-b border-zinc-100">
                          {order.order_number ? `#${order.order_number}` : order.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-black border-b border-zinc-100">
                           <div>
                             {['Take Away', 'Delivery'].includes(order.table_name || order.table)
                               ? (order.table_name || order.table)
                               : `Table ${order.table_name || order.table}`}
                           </div>
                           <div className="flex flex-wrap gap-1 mt-1.5">
                             {getOrderBadges(order).map((b, idx) => (
                               <span key={idx} className={`text-[0.55rem] px-1.5 py-0.5 font-bold border rounded ${b.className}`}>
                                 {b.label}
                               </span>
                             ))}
                           </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-[240px] truncate border-b border-zinc-100 text-zinc-600" title={order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}>
                          {order.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-black border-b border-zinc-100">Rs {order.billing.tax ? order.billing.tax.toFixed(2) : '0.00'}</td>
                        <td className="px-5 py-3.5 font-bold text-black border-b border-zinc-100">Rs {order.billing.total.toFixed(2)}</td>
                        <td className="px-5 py-3.5 border-b border-zinc-100">
                          <span className={`px-2 py-0.5 text-[0.7rem] font-bold border border-zinc-200 rounded-lg ${
                            order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-100">
                          {order.billing.paymentMethod === 'unpaid' ? (
                            <span className="text-zinc-600 text-xs font-bold px-2 py-0.5 border border-zinc-200 bg-zinc-50 rounded-lg">UNPAID</span>
                          ) : order.billing.paymentMethod === 'cash' ? (
                            <span className="bg-zinc-950 text-white font-bold text-[0.7rem] px-2 py-0.5 border border-zinc-800 rounded-lg">CASH</span>
                          ) : (
                            <span className="bg-zinc-950 text-white font-bold text-[0.7rem] px-2 py-0.5 border border-zinc-800 rounded-lg">CARD</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-zinc-500 border-b border-zinc-100 font-mono">
                          {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5 text-center border-b border-zinc-100">
                          <button
                            onClick={() => openBillingModal(order, true)}
                            className="px-3 py-1.5 bg-white text-black hover:bg-zinc-50 text-xs font-bold border border-zinc-200 rounded-lg transition-colors"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Order Modal */}
        {isEditModalOpen && editOrder && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5 print:hidden">
            <div className="bg-white border border-zinc-200 w-full max-w-[480px] p-6 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-black leading-none">Edit Order Items</h2>
                  <span className="text-zinc-400 font-mono text-xs">
                    {editOrder.order_number ? `#${editOrder.order_number}` : editOrder.id.slice(0, 8)}
                  </span>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-2xl text-zinc-400 hover:text-black transition-colors">✕</button>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1 mb-4">
                {editTempItems.length === 0 ? (
                  <p className="text-zinc-500 text-center py-6 italic text-xs">No items left in order. Add at least one item.</p>
                ) : (
                  editTempItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white border border-zinc-200 p-3 rounded-xl">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-black">{item.name}</span>
                        <span className="text-xs text-zinc-400 font-mono">Rs {item.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-lg">
                          <button onClick={() => handleEditChangeQty(item.id, -1)} className="text-zinc-600 font-bold text-sm hover:bg-zinc-200 px-1.5 rounded transition-colors">−</button>
                          <span className="font-bold text-xs text-black min-w-[14px] text-center font-mono">{item.quantity}</span>
                          <button onClick={() => handleEditChangeQty(item.id, 1)} className="text-zinc-600 font-bold text-sm hover:bg-zinc-200 px-1.5 rounded transition-colors">+</button>
                        </div>
                        <button
                          onClick={() => handleEditRemoveItem(item.id)}
                          className="text-rose-600 hover:bg-rose-50 border border-rose-100 px-2.5 py-1 font-bold text-xs rounded-lg transition-colors"
                          title="Remove Item"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Item Box */}
              <div className="border-t border-zinc-100 pt-4 mt-4 flex flex-col gap-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Add Item to Order</label>
                <div className="flex gap-2">
                  <select
                    value={selectedEditAddId}
                    onChange={(e) => setSelectedEditAddId(e.target.value)}
                    className="flex-grow p-3 bg-white border border-zinc-200 rounded-xl text-black text-sm outline-none focus:border-zinc-400 transition-colors"
                  >
                    {menuItemsList.map(item => (
                      <option key={item.id} value={item.id}>{item.name} (Rs {item.price.toFixed(2)})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleEditAddItem}
                    className="px-5 bg-black text-white hover:bg-zinc-800 font-bold text-sm rounded-xl transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdits}
                  className="px-5 py-2.5 bg-black text-white hover:bg-zinc-800 font-bold text-sm rounded-xl transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settle & Billing Modal overlay */}
        {isBillingModalOpen && billingOrder && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5 print:p-0 print:bg-white print:text-black">
            <div className="bg-white border border-zinc-200 w-full max-w-[480px] p-6 rounded-2xl shadow-xl print:border-none print:shadow-none print:p-0 print:bg-white print:max-w-full">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5 print:hidden">
                <h2 className="text-lg font-bold text-black">Order #{billingOrder.order_number || billingOrder.id.slice(0, 4)}</h2>
                <button onClick={() => setIsBillingModalOpen(false)} className="text-2xl text-zinc-400 hover:text-black transition-colors">✕</button>
              </div>

              {/* Paper Thermal Receipt ticket print output block */}
              <div id="receipt-details" className="bg-zinc-50/50 text-black p-6 font-mono text-sm border border-zinc-200 flex flex-col gap-2 mb-5 print:p-0 print:bg-white print:border-none rounded-xl">
                <div className="text-center border-b border-dashed border-zinc-200 pb-3 mb-3">
                  <div className="text-lg font-bold tracking-wider text-black flex flex-col items-center gap-1">
                    {user?.restaurantLogo && (
                      <img src={user.restaurantLogo} className="h-8 w-auto object-contain mb-1 print:block border border-zinc-200 p-0.5 rounded-lg" alt={user.restaurantName} />
                    )}
                    <span className="font-bold">{user?.restaurantName || 'Apex Scan'}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {['Take Away', 'Delivery'].includes(billingOrder.table)
                      ? `Receipt for ${billingOrder.table}`
                      : `Receipt for Table ${billingOrder.table}`}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    <p className="text-xs">Date: {new Date(billingOrder.timestamp).toLocaleString()}</p>
                    {billingOrder.billing?.confirmedBy && (
                      <p className="text-xs font-bold mt-1 text-black">Sales Rep: {billingOrder.billing.confirmedBy}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-b border-dashed border-zinc-200 pb-3 mb-3">
                  {billingOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-zinc-800">
                      <span>{item.name} x{item.quantity}</span>
                      <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs {billingOrder.billing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes (8%):</span>
                    <span>Rs {billingOrder.billing.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge (5%):</span>
                    <span>Rs {billingOrder.billing.serviceCharge.toFixed(2)}</span>
                  </div>
                  {billingOrder.billing.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>- Rs {billingOrder.billing.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-black border-t border-zinc-200 pt-2.5 mt-2">
                    <span>GRAND TOTAL:</span>
                    <span>Rs {billingOrder.billing.total.toFixed(2)}</span>
                  </div>
                  {billingOrder.billing.paymentStatus === 'pending' && (
                    <div className="flex justify-between font-bold text-amber-600 border-t border-dashed border-zinc-200 pt-1 mt-1">
                      <span>PENDING BALANCE:</span>
                      <span>Rs {billingOrder.billing.pendingAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {billingOrder.order_type === 'delivery' && (
                    <div className="border-t border-zinc-200 pt-2.5 mt-2.5 text-xs text-zinc-700 flex flex-col gap-1 text-left">
                      <p className="font-bold text-black uppercase tracking-wider text-[10px] mb-1">Delivery Information</p>
                      <p>Name: <span className="font-semibold text-black">{billingOrder.billing.customerName}</span></p>
                      <p>Phone: <span className="font-semibold text-black">{billingOrder.billing.customerPhone}</span></p>
                      <p>Address: <span className="font-semibold text-black">{billingOrder.billing.deliveryAddress}, {billingOrder.billing.deliveryArea}, {billingOrder.billing.deliveryCity}</span></p>
                      {billingOrder.billing.deliveryInstructions && (
                        <p className="italic">Note: "{billingOrder.billing.deliveryInstructions}"</p>
                      )}
                      {billingOrder.billing.rider && (
                        <p className="font-bold text-black mt-1">Rider Assigned: {billingOrder.billing.rider.name || billingOrder.billing.rider.display_name} ({billingOrder.billing.rider.phone || billingOrder.billing.rider.employee_code})</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment selector panel (hide on view history) */}
              {!isHistoryViewOnly && (
                <div className="flex flex-col gap-3 mb-5 print:hidden">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Payment Method</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setBillingPaymentMethod('cash')}
                      className={`flex-1 py-3 border font-bold text-sm transition-all flex items-center justify-center rounded-xl ${
                        billingPaymentMethod === 'cash'
                          ? 'bg-black text-white border-black hover:bg-zinc-800'
                          : 'bg-white text-black border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Cash Settle
                    </button>
                    <button
                      onClick={() => setBillingPaymentMethod('card')}
                      className={`flex-1 py-3 border font-bold text-sm transition-all flex items-center justify-center rounded-xl ${
                        billingPaymentMethod === 'card'
                          ? 'bg-black text-white border-black hover:bg-zinc-800'
                          : 'bg-white text-black border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Credit Card
                    </button>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4 mt-6 print:hidden">
                {!isHistoryViewOnly && (
                  <button
                    onClick={() => handleCancelOrder(billingOrder.id)}
                    className="mr-auto px-4 py-2.5 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-sm rounded-xl transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                <button
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-4 py-2.5 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-sm rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white text-black border border-zinc-200 hover:bg-zinc-50 font-bold text-sm rounded-xl transition-colors"
                >
                  Print
                </button>
                {!isHistoryViewOnly && (
                  <button
                    onClick={handleSettlePayment}
                    className="px-5 py-2.5 bg-black text-white hover:bg-zinc-800 font-bold text-sm rounded-xl transition-colors"
                  >
                    Settle & Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
