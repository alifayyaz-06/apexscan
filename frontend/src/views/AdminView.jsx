import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, BarChart3, QrCode,
  Plus, Pencil, Trash2, X, Search, Printer, Download, ChevronDown,
  Upload, ImageIcon, Loader2, Users, Key, Settings,
  ShoppingBag, DollarSign, TrendingUp, Flame, Calendar, Percent, Activity, CheckCircle2
} from 'lucide-react';

import { API_URL } from '../utils/config';
import { formatOrderId, formatReceiptDate } from '../utils/formatters';
import { generateTableCodeFallback } from '../utils/customerConstants';

const BACKEND_URL = API_URL;

// Dynamic categories resolution used instead of static config
const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  confirmed: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  cooking: 'bg-blue-50 text-blue-600 border-blue-200',
  ready: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  served: 'bg-teal-50 text-teal-600 border-teal-200',
  completed: 'bg-green-50 text-green-600 border-green-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

export default function AdminView() {
  const { user, logout, authHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardChartTab, setDashboardChartTab] = useState('today');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [analyticsMode, setAnalyticsMode] = useState('daily');
  const [analyticsDate, setAnalyticsDate] = useState(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });
  const [analyticsMonth, setAnalyticsMonth] = useState(() => {
    const local = new Date();
    return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}`;
  });

  const getTrialRemainingDays = () => {
    if (!user?.expiresAt) return 0;
    const now = new Date();
    const exp = new Date(user.expiresAt);
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setIsSidebarOpen(false);
  };

  const handleLaunchTerminal = async (terminalType) => {
    const targetSlug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant');
    await logout();
    if (targetSlug) {
      window.location.href = `/r/${targetSlug}/login?tab=staff&source=launchpad`;
    } else {
      window.location.href = `/login?tab=staff&source=launchpad`;
    }
  };

  // ─── Menu State ───
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuModal, setMenuModal] = useState(false);
  const [menuEditItem, setMenuEditItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ id: '', name: '', category: 'starters', price: '', description: '', image: '' });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryVal, setCustomCategoryVal] = useState('');
  const [csvPeriod, setCsvPeriod] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // ─── Orders State ───
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [ordersPage, setOrdersPage] = useState(1);

  useEffect(() => {
    setOrdersPage(1);
  }, [orderSearch, orderStatusFilter]);

  // ─── Sales State ───
  const [salesData, setSalesData] = useState(null);
  const [salesLoading, setSalesLoading] = useState(true);

  // ─── QR State ───
  const [tableCount, setTableCount] = useState(10);
  const [tableCodesMap, setTableCodesMap] = useState({});
  const [confirmRegenTable, setConfirmRegenTable] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ─── Staff State ───
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // ─── Settings State ───
  const [settingsName, setSettingsName] = useState('');
  const [settingsLogo, setSettingsLogo] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsAddress, setSettingsAddress] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsTax, setSettingsTax] = useState(8.00);
  const [settingsServiceCharge, setSettingsServiceCharge] = useState(5.00);
  const [settingsKitchenMode, setSettingsKitchenMode] = useState('display');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [staffModal, setStaffModal] = useState(false);
  const [staffEditItem, setStaffEditItem] = useState(null);
  const [staffForm, setStaffForm] = useState({ username: '', password: '', role: 'kitchen_staff', displayName: '' });
  const [staffError, setStaffError] = useState('');

  // ╔═══════════════════════════════════════╗
  // ║          DATA FETCHERS                ║
  // ╚═══════════════════════════════════════╝
  const loadMenu = async () => {
    setMenuLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/menu`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) setMenuItems(result.data);
    } catch (err) { console.error(err); }
    setMenuLoading(false);
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) setOrders(result.data);
    } catch (err) { console.error(err); }
    setOrdersLoading(false);
  };

  const loadSales = async () => {
    setSalesLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/sales/summary`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) setSalesData(result.data);
    } catch (err) { console.error(err); }
    setSalesLoading(false);
  };

  const downloadSalesReport = () => {
    if (!orders || orders.length === 0) {
      toast.error("No sales data available to download.");
      return;
    }

    let completed = orders.filter(o => o.status === 'completed');
    if (completed.length === 0) {
      toast.error("No completed sales transactions found in history.");
      return;
    }

    // Filter by period selected on the analytics page
    if (activeTab === 'sales') {
      if (analyticsMode === 'daily') {
        const startRange = new Date(analyticsDate);
        startRange.setHours(0, 0, 0, 0);
        const endRange = new Date(startRange.getTime() + 24 * 60 * 60 * 1000);
        completed = completed.filter(o => {
          const d = new Date(o.timestamp || o.created_at);
          return d >= startRange && d < endRange;
        });
      } else {
        const [yr, mo] = analyticsMonth.split('-').map(Number);
        const startRange = new Date(yr, mo - 1, 1);
        const endRange = new Date(yr, mo, 1);
        completed = completed.filter(o => {
          const d = new Date(o.timestamp || o.created_at);
          return d >= startRange && d < endRange;
        });
      }
    } else {
      // 1. Filter by period (today, month, year, or all) for other pages if applicable
      const now = new Date();
      if (csvPeriod === 'today') {
        completed = completed.filter(o => new Date(o.timestamp).toDateString() === now.toDateString());
      } else if (csvPeriod === 'month') {
        completed = completed.filter(o => {
          const d = new Date(o.timestamp);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      } else if (csvPeriod === 'year') {
        completed = completed.filter(o => new Date(o.timestamp).getFullYear() === now.getFullYear());
      }
    }

    if (completed.length === 0) {
      toast.error("No completed sales transactions found for the selected period.");
      return;
    }

    // 2. Sort chronologically by date/time (month & date wise)
    completed.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // CSV Headers
    const headers = [
      'Order ID',
      'Table Name',
      'Items Ordered',
      'Subtotal (Rs)',
      'Tax (8%) (Rs)',
      'Service Charge (5%) (Rs)',
      'Grand Total (Rs)',
      'Payment Method',
      'Timestamp',
      'Confirmed By (Sales Rep)'
    ];

    // CSV Rows
    const rows = completed.map(o => {
      const itemSummary = o.items.map(i => `${i.name} (x${i.quantity})`).join('; ');
      return [
        o.id,
        o.table_name || `Table ${o.table}`,
        itemSummary,
        o.billing.subtotal.toFixed(2),
        o.billing.tax.toFixed(2),
        o.billing.serviceCharge.toFixed(2),
        o.billing.total.toFixed(2),
        o.billing.paymentMethod.toUpperCase(),
        new Date(o.timestamp).toLocaleString(),
        o.billing.confirmedBy || 'Self-Ordered / Customer'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${csvPeriod}_${user?.restaurantName || 'restaurant'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/staff`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) setStaffList(result.data);
    } catch (err) { console.error(err); }
    setStaffLoading(false);
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/restaurants/settings`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success && result.data) {
        setSettingsName(result.data.name || '');
        setSettingsLogo(result.data.logo_url || '');
        setSettingsPhone(result.data.phone || '');
        setSettingsAddress(result.data.address || '');
        setSettingsEmail(result.data.email || '');
        setSettingsTax(result.data.tax_rate !== undefined ? result.data.tax_rate : 8.00);
        setSettingsServiceCharge(result.data.service_charge !== undefined ? result.data.service_charge : 5.00);
        setSettingsKitchenMode(result.data.kitchen_mode || 'display');
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
    setSettingsLoading(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/restaurants/settings`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: settingsName,
          logo_url: settingsLogo,
          phone: settingsPhone,
          address: settingsAddress,
          email: settingsEmail,
          tax_rate: parseFloat(settingsTax) || 0,
          service_charge: parseFloat(settingsServiceCharge) || 0,
          kitchen_mode: settingsKitchenMode
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Settings saved successfully!');
        if (user) {
          user.restaurantName = settingsName;
          user.restaurantLogo = settingsLogo;
        }
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings.');
    }
    setSettingsSaving(false);
  };

  const fetchTableCodes = async () => {
    const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'cheezious';
    const fallbackMap = {};
    for (let i = 1; i <= tableCount; i++) {
      fallbackMap[i] = generateTableCodeFallback(i, slug);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/qr/tables?restaurant=${slug}&count=${tableCount}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const map = {};
          data.data.forEach((item) => {
            map[item.tableNumber] = item.tableCode;
          });
          setTableCodesMap(map);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend QR batch endpoint pending restart, using fallback table codes:', e.message);
    }
    setTableCodesMap(fallbackMap);
  };

  const handleRegenerateCode = async (tableNum) => {
    const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'default';
    setIsRegenerating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/qr/regenerate`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table: tableNum, restaurant: slug })
      });
      const result = await res.json();
      if (result.success && result.data?.tableCode) {
        setTableCodesMap(prev => ({ ...prev, [tableNum]: result.data.tableCode }));
        toast.success(`Regenerated code for Table ${tableNum}: ${result.data.tableCode}`);
        setConfirmRegenTable(null);
      } else {
        toast.error(result.message || 'Failed to regenerate code');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error regenerating table code');
    }
    setIsRegenerating(false);
  };

  const printSingleQr = (tableNum) => {
    const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'default';
    const code = tableCodesMap[tableNum] || 'PENDING';
    const host = window.location.host;
    const protocol = window.location.protocol;
    const qrUrl = `${protocol}//${host}/r/${slug}/customer?table=${code}`;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Pop-up blocked. Please allow pop-ups to print QR codes.');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table ${tableNum} - QR Stand</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; }
            .card { background: white; border: 2px solid #111; padding: 40px; border-radius: 28px; text-align: center; width: 320px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
            .brand { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 8px; }
            .table-title { font-size: 32px; font-weight: 900; color: #111; margin: 0 0 20px 0; }
            .qr-frame { background: #fff; border: 1px solid #eee; padding: 16px; border-radius: 20px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
            img { width: 220px; height: 220px; display: block; }
            .code-badge { margin-top: 20px; font-family: monospace; font-size: 20px; font-weight: 800; background: #111; color: #fff; padding: 8px 20px; border-radius: 12px; display: inline-block; letter-spacing: 3px; }
            .instruction { margin-top: 18px; font-size: 12px; font-weight: 600; color: #666; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">${user?.restaurantName || 'Smart QR System'}</div>
            <h1 class="table-title">Table ${tableNum}</h1>
            <div class="qr-frame">
              <img src="${qrImgUrl}" alt="QR Code" />
            </div>
            <br />
            <div class="code-badge">${code}</div>
            <p class="instruction">Scan QR code with your smartphone camera to view menu & place your order.</p>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const printAllQrs = () => {
    const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'default';
    const host = window.location.host;
    const protocol = window.location.protocol;

    const cardsHtml = Array.from({ length: tableCount }, (_, i) => i + 1).map(tableNum => {
      const code = tableCodesMap[tableNum] || 'PENDING';
      const qrUrl = `${protocol}//${host}/r/${slug}/customer?table=${code}`;
      const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;
      return `
        <div class="card">
          <div class="brand">${user?.restaurantName || 'Smart QR System'}</div>
          <h1 class="table-title">Table ${tableNum}</h1>
          <div class="qr-frame">
            <img src="${qrImgUrl}" alt="QR Code" />
          </div>
          <br />
          <div class="code-badge">${code}</div>
          <p class="instruction">Scan QR code to order</p>
        </div>
      `;
    }).join('');

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Pop-up blocked. Please allow pop-ups to print QR codes.');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Table QR Stands</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 20px; background: white; }
            .grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 30px; }
            .card { page-break-inside: avoid; border: 2px solid #111; padding: 24px; border-radius: 20px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
            .brand { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #666; margin-bottom: 4px; }
            .table-title { font-size: 24px; font-weight: 900; color: #111; margin: 0 0 14px 0; }
            .qr-frame { background: #fff; border: 1px solid #eee; padding: 12px; border-radius: 16px; display: inline-block; }
            img { width: 170px; height: 170px; display: block; }
            .code-badge { margin-top: 14px; font-family: monospace; font-size: 16px; font-weight: 800; background: #111; color: #fff; padding: 6px 16px; border-radius: 10px; display: inline-block; letter-spacing: 2px; }
            .instruction { margin-top: 10px; font-size: 11px; font-weight: 600; color: #666; }
            @media print {
              .grid { grid-template-cols: repeat(2, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 600); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  useEffect(() => {
    loadMenu();
    loadOrders();
    loadSales();
    loadStaff();
    loadSettings();

    // Polling real-time updates every 30s automatically
    const pollInterval = setInterval(() => {
      loadOrders();
      loadSales();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'qr') {
      fetchTableCodes();
    }
  }, [activeTab, tableCount]);

  // ╔═══════════════════════════════════════╗
  // ║          MENU CRUD HANDLERS           ║
  // ╚═══════════════════════════════════════╝
  const openAddModal = () => {
    setMenuEditItem(null);
    // Auto-generate a unique ID for the new item
    const autoId = crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMenuForm({ id: autoId, name: '', category: 'starters', price: '', description: '', image: '' });
    setImagePreview(null);
    setIsCustomCategory(false);
    setCustomCategoryVal('');
    setMenuModal(true);
  };

  const openEditModal = (item) => {
    setMenuEditItem(item);
    setImagePreview(item.image || null);
    setMenuForm({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      description: item.description || '',
      image: item.image || ''
    });
    const defaultCategoriesList = ['starters', 'mains', 'desserts', 'drinks'];
    const isDefault = defaultCategoriesList.includes(item.category);
    setIsCustomCategory(!isDefault);
    setCustomCategoryVal(isDefault ? '' : item.category);
    setMenuModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/upload`, {
        method: 'POST',
        headers: authHeaders(), // Attach token for verification
        body: formData
      });
      const result = await res.json();
      if (result.success && result.data) {
        setMenuForm(prev => ({ ...prev, image: result.data.url }));
        setImagePreview(result.data.url);
      } else {
        toast.error(result.message || 'Image upload failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error uploading image.');
    }
    setImageUploading(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLogoUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });
      const result = await res.json();
      if (result.success && result.data) {
        setSettingsLogo(result.data.url);
      } else {
        toast.error(result.message || 'Logo upload failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error uploading logo.');
    }
    setLogoUploading(false);
  };

  const handleMenuSubmit = async () => {
    if (!menuForm.name || !menuForm.price || !menuForm.category) {
      toast.warning('Please fill in name, category, and price.');
      return;
    }

    try {
      if (menuEditItem) {
        // Update existing
        const res = await fetch(`${BACKEND_URL}/api/v1/menu/${menuEditItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
          },
          body: JSON.stringify({
            name: menuForm.name,
            category: menuForm.category,
            price: parseFloat(menuForm.price),
            description: menuForm.description,
            image: menuForm.image
          })
        });
        const result = await res.json();
        if (result.success) {
          setMenuItems(prev => prev.map(i => i.id === menuEditItem.id ? result.data : i));
        }
      } else {
        // Create new — ID was auto-generated when modal opened
        const res = await fetch(`${BACKEND_URL}/api/v1/menu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
          },
          body: JSON.stringify({ ...menuForm, price: parseFloat(menuForm.price) })
        });
        const result = await res.json();
        if (result.success) {
          setMenuItems(prev => [...prev, result.data]);
        }
      }
      setMenuModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save menu item.');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/menu/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const result = await res.json();
      if (result.success) {
        setMenuItems(prev => prev.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete menu item.');
    }
    setDeleteConfirm(null);
  };

  // ╔═══════════════════════════════════════╗
  // ║          STAFF CRUD HANDLERS          ║
  // ╚═══════════════════════════════════════╝
  const openAddStaffModal = () => {
    setStaffEditItem(null);
    setStaffForm({ username: '', password: '', role: 'kitchen_staff', displayName: '' });
    setStaffError('');
    setStaffModal(true);
  };

  const openEditStaffModal = (staff) => {
    setStaffEditItem(staff);
    setStaffForm({ username: staff.username, password: '', role: staff.role, displayName: staff.display_name });
    setStaffError('');
    setStaffModal(true);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffError('');
    try {
      if (staffEditItem) {
        // Update staff
        const res = await fetch(`${BACKEND_URL}/api/v1/staff/${staffEditItem.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
          },
          body: JSON.stringify({
            password: staffForm.password || undefined,
            displayName: staffForm.displayName,
            isActive: staffEditItem.is_active
          })
        });
        const result = await res.json();
        if (result.success) {
          setStaffList(prev => prev.map(s => s.id === staffEditItem.id ? result.data : s));
          setStaffModal(false);
        } else {
          setStaffError(result.message);
        }
      } else {
        // Create staff
        if (staffForm.role !== 'rider' && !staffForm.password) {
          setStaffError('Password is required for new staff logins.');
          return;
        }
        const res = await fetch(`${BACKEND_URL}/api/v1/staff`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
          },
          body: JSON.stringify({
            employeeCode: staffForm.username,
            password: staffForm.role === 'rider' ? 'rider_password_123456' : staffForm.password,
            role: staffForm.role,
            displayName: staffForm.displayName || staffForm.username
          })
        });
        const result = await res.json();
        if (result.success) {
          setStaffList(prev => [result.data, ...prev]);
          setStaffModal(false);
        } else {
          setStaffError(result.message);
        }
      }
    } catch (err) {
      setStaffError('Connection error.');
    }
  };

  const handleToggleStaffActive = async (staff) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/staff/${staff.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ isActive: !staff.is_active })
      });
      const result = await res.json();
      if (result.success) {
        setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: !staff.is_active } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('Are you sure you want to delete this staff login?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/staff/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        setStaffList(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ╔═══════════════════════════════════════╗
  // ║          FILTERED DATA                ║
  // ╚═══════════════════════════════════════╝
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const q = orderSearch.toLowerCase().trim();
    if (!q) return matchesStatus;

    const orderNum = String(o.order_number || '').toLowerCase();
    const shortId = o.id.replace(/^inv-/i, '').toLowerCase();
    const matchesOrderNumber = orderNum.includes(q) || shortId.includes(q) || o.id.toLowerCase().includes(q);

    const timestamp = o.timestamp || o.created_at;
    const dateStr = new Date(timestamp).toLocaleDateString().toLowerCase();
    const dateIso = new Date(timestamp).toISOString().toLowerCase();
    const dateText = new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
    const dateFullText = new Date(timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
    const matchesDate = dateStr.includes(q) || dateIso.includes(q) || dateText.includes(q) || dateFullText.includes(q);

    return matchesStatus && (matchesOrderNumber || matchesDate);
  });

  const ENTRIES_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredOrders.length / ENTRIES_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ENTRIES_PER_PAGE, ordersPage * ENTRIES_PER_PAGE);

  const activeCats = Array.from(new Set(menuItems.map(i => i.category).filter(Boolean)));
  const catsToDisplay = activeCats.length > 0 ? activeCats : ['starters', 'mains', 'desserts', 'drinks'];

  const groupedMenu = catsToDisplay.map(cat => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    items: menuItems.filter(i => i.category === cat)
  }));

  const getDashboardMetrics = () => {
    const todaySales = salesData?.metrics?.today?.revenue || 0;
    const todayOrdersCount = salesData?.metrics?.today?.count || 0;

    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    const occupiedTablesSet = new Set(
      activeOrders
        .map(o => o.table_name || o.table)
        .filter(Boolean)
        .map(t => String(t).replace(/^(table\s*)+/i, '').trim())
    );
    const activeTablesCount = occupiedTablesSet.size;

    const occupiedTablesList = Array.from(new Set(
      activeOrders
        .filter(o => ['confirmed', 'cooking', 'ready', 'served'].includes(o.status))
        .map(o => o.table_name || o.table)
        .filter(Boolean)
        .map(t => String(t).replace(/^(table\s*)+/i, '').trim())
    ));
    const occupiedTablesCount = occupiedTablesList.length;
    const availableTablesCount = Math.max(0, tableCount - activeTablesCount);

    const kitchenPendingCount = orders.filter(o => ['pending', 'confirmed', 'cooking'].includes(o.status)).length;
    const completedOrdersCount = orders.filter(o => o.status === 'completed').length;

    const totalCompletedRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.billing?.total || 0), 0);
    const averageOrderValue = completedOrdersCount > 0 ? (totalCompletedRevenue / completedOrdersCount) : 0;

    const recentOrdersList = [...orders]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    return {
      todaySales,
      todayOrdersCount,
      activeTablesCount,
      occupiedTablesCount,
      availableTablesCount,
      kitchenPendingCount,
      completedOrdersCount,
      averageOrderValue,
      recentOrdersList
    };
  };

  const getPeakOrderingHour = () => {
    if (!orders || orders.length === 0) return 'N/A';
    const hourCounts = {};
    orders.forEach(o => {
      const date = new Date(o.timestamp);
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    let peakHour = null;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hour);
      }
    });
    if (peakHour === null) return 'N/A';
    const formatHour = (h) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return `${displayHour}:00 ${ampm}`;
    };
    return `${formatHour(peakHour)} - ${formatHour((peakHour + 1) % 24)}`;
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'menu', label: 'Menu Editor', icon: UtensilsCrossed },
    { key: 'orders', label: 'All Orders', icon: ClipboardList },
    { key: 'sales', label: 'Sales Analytics', icon: BarChart3 },
    { key: 'qr', label: 'QR Codes', icon: QrCode },
    { key: 'staff', label: 'Staff Logins', icon: Users },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#2B2D42] flex relative">
      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* ── Left Sidebar ── */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 fixed inset-y-0 left-0 h-screen overflow-y-auto z-50 transform transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user?.restaurantLogo ? (
              <img src={user.restaurantLogo} className="h-9 w-9 object-contain rounded-xl border border-slate-100 p-0.5 bg-white" alt={user.restaurantName} />
            ) : (
              <div className="h-9 w-9 bg-gradient-to-br from-[#E63946] to-[#FF6B35] rounded-xl flex items-center justify-center">
                <LayoutDashboard size={18} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#2B2D42] truncate leading-tight">
                {user?.restaurantName || 'Admin Panel'}
              </h1>
              <span className="text-[10px] font-medium text-slate-400 truncate block">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-black rounded-lg hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key
                ? 'bg-[#E63946]/10 text-[#E63946]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-[#2B2D42]'
                }`}
            >
              <tab.icon size={18} className={activeTab === tab.key ? 'text-[#E63946]' : 'text-slate-400'} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Bottom */}
        <div className="px-4 pb-5 mt-auto border-t border-slate-100 pt-4 flex flex-col gap-3">
          <button
            onClick={() => handleLaunchTerminal('staff')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#E63946]/10 hover:bg-[#E63946]/20 text-[#E63946] font-bold text-xs rounded-xl transition-colors border border-[#E63946]/20"
          >
            <Key size={14} />
            Launch Terminal
          </button>
          <button
            onClick={logout}
            className="w-full text-xs text-red-400 hover:text-red-600 font-bold transition-colors py-1.5"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Right Content Area ── */}
      <div className="flex-1 min-h-screen overflow-y-auto w-full lg:w-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 bg-slate-50 rounded-xl border border-slate-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-[#2B2D42]">{tabs.find(t => t.key === activeTab)?.label}</h2>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-500">
            Admin Panel
          </span>
        </header>

        {/* ── Tab Content ── */}
        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">

          {/* Free Trial Banner */}
          {user?.plan === 'trial' && (() => {
            const days = getTrialRemainingDays();
            let bannerCls = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            let dotCls = 'bg-emerald-500';
            if (days <= 1) {
              bannerCls = 'bg-rose-50 text-rose-800 border-rose-200';
              dotCls = 'bg-rose-500';
            } else if (days <= 3) {
              bannerCls = 'bg-orange-50 text-orange-800 border-orange-200';
              dotCls = 'bg-orange-500';
            } else if (days <= 7) {
              bannerCls = 'bg-amber-50 text-amber-800 border-amber-200';
              dotCls = 'bg-amber-500';
            }

            return (
              <div className={`mb-6 p-4 rounded-2xl border ${bannerCls} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm animate-fade-in`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-3.5 w-3.5 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotCls}`}></span>
                    <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${dotCls}`}></span>
                  </span>
                  <div>
                    <span className="font-extrabold text-sm block">
                      {days > 0 ? `Free Trial — ${days} Days Remaining` : 'Trial Expired'}
                    </span>
                    <span className="text-xs opacity-85 block mt-0.5">
                      Your 14-day free trial will end on {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-black hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Upgrade Now
                </button>
              </div>
            );
          })()}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TAB 0: DASHBOARD OVERVIEW                      */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'dashboard' && (() => {
            const todayDateString = new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            // Local Date calculations for today (current date)
            const selectedDate = new Date();
            selectedDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);

            // Filter completed and all orders for today (current date)
            const dateCompletedOrders = orders.filter(o => 
              o.status === 'completed' && 
              new Date(o.timestamp || o.created_at) >= selectedDate && 
              new Date(o.timestamp || o.created_at) < nextDay
            );
            const dateAllOrders = orders.filter(o => 
              new Date(o.timestamp || o.created_at) >= selectedDate && 
              new Date(o.timestamp || o.created_at) < nextDay
            );

            // Metrics for current date
            const selectedDateRevenue = dateCompletedOrders.reduce((sum, o) => sum + (o.billing?.total || 0), 0);
            const selectedDateOrdersCount = dateAllOrders.length;
            const completedCount = dateCompletedOrders.length;
            const selectedDateAverageValue = completedCount > 0 ? (selectedDateRevenue / completedCount) : 0;
            const selectedDateCompletedCount = completedCount;

            const paymentSummary = (() => {
              let cashTotal = 0;
              let cardTotal = 0;
              let unpaidTotal = 0;

              dateCompletedOrders.forEach(o => {
                const method = String(o.billing?.paymentMethod || 'cash').toLowerCase();
                const amount = o.billing?.total || 0;
                if (method === 'card') {
                  cardTotal += amount;
                } else if (method === 'cash') {
                  cashTotal += amount;
                } else {
                  unpaidTotal += amount;
                }
              });

              return { cashTotal, cardTotal, unpaidTotal };
            })();

            const orderTypeBreakdown = (() => {
              const counts = { dineIn: 0, takeaway: 0, delivery: 0 };
              dateAllOrders.forEach(o => {
                const rawType = o.order_type || o.billing?.order_type;
                const tbl = String(o.table_name || o.table || '').toLowerCase();
                const isTakeaway = rawType === 'takeaway' || tbl.includes('take away') || tbl.includes('takeaway');
                const isDelivery = rawType === 'delivery' || tbl.includes('delivery');
                if (isTakeaway) counts.takeaway++;
                else if (isDelivery) counts.delivery++;
                else counts.dineIn++;
              });
              const total = counts.dineIn + counts.takeaway + counts.delivery;
              const safeTotal = total || 1;
              return {
                ...counts,
                total,
                dineInPct: (counts.dineIn / safeTotal) * 100,
                takeawayPct: (counts.takeaway / safeTotal) * 100,
                deliveryPct: (counts.delivery / safeTotal) * 100,
              };
            })();

            const getStatusClass = (status) => {
              switch (status) {
                case 'pending':
                  return 'bg-orange-50 text-orange-700 border border-orange-100';
                case 'completed':
                case 'served':
                  return 'bg-green-50 text-green-700 border border-green-100';
                case 'cancelled':
                  return 'bg-red-50 text-red-700 border border-red-100';
                default:
                  return 'bg-blue-50 text-blue-700 border border-blue-100';
              }
            };

            const formatTypeLabel = (type) => {
              if (type === 'delivery') return 'Delivery';
              if (type === 'takeaway') return 'Take Away';
              return 'Dine In';
            };

            const activePreps = dateAllOrders.filter(o => ['pending', 'confirmed', 'cooking', 'ready'].includes(o.status));

            const occupiedTablesSet = new Set(
              activePreps
                .map(o => o.table_name || o.table)
                .filter(Boolean)
                .map(t => String(t).replace(/^(table\s*)+/i, '').trim())
            );
            const activeTablesCount = occupiedTablesSet.size;

            const occupiedTablesList = Array.from(new Set(
              activePreps
                .filter(o => ['confirmed', 'cooking', 'ready', 'served'].includes(o.status))
                .map(o => o.table_name || o.table)
                .filter(Boolean)
                .map(t => String(t).replace(/^(table\s*)+/i, '').trim())
            ));
            const occupiedTablesCount = occupiedTablesList.length;
            const availableTablesCount = Math.max(0, tableCount - activeTablesCount);
            const kitchenPendingCount = dateAllOrders.filter(o => ['pending', 'confirmed', 'cooking'].includes(o.status)).length;

            const getPeakHourForSelectedDate = () => {
              if (dateAllOrders.length === 0) return 'N/A';
              const hourCounts = {};
              dateAllOrders.forEach(o => {
                const hr = new Date(o.timestamp || o.created_at).getHours();
                hourCounts[hr] = (hourCounts[hr] || 0) + 1;
              });
              let peak = null;
              let max = 0;
              Object.entries(hourCounts).forEach(([hr, cnt]) => {
                if (cnt > max) {
                  max = cnt;
                  peak = parseInt(hr);
                }
              });
              if (peak === null) return 'N/A';
              const formatHour = (h) => {
                const ampm = h >= 12 ? 'PM' : 'AM';
                const display = h % 12 === 0 ? 12 : h % 12;
                return `${display}:00 ${ampm}`;
              };
              return `${formatHour(peak)} - ${formatHour((peak + 1) % 24)}`;
            };

            const topItems = (() => {
              const tracker = {};
              dateCompletedOrders.forEach(o => {
                (o.items || []).forEach(item => {
                  if (!tracker[item.name]) {
                    tracker[item.name] = 0;
                  }
                  tracker[item.name] += item.quantity;
                });
              });
              return Object.entries(tracker)
                .map(([name, quantity]) => ({ name, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);
            })();

            const recentOrdersList = [...dateAllOrders]
              .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at))
              .slice(0, 5);

            // Dynamic Chart Hourly aggregation for today (current date)
            const hourlySales = Array(12).fill(0).map((_, i) => ({ label: `${11 + i}:00`, amount: 0, count: 0 }));
            dateCompletedOrders.forEach(o => {
              const hour = new Date(o.timestamp || o.created_at).getHours();
              const hourIdx = hour - 11;
              if (hourIdx >= 0 && hourIdx < 12) {
                hourlySales[hourIdx].amount += o.billing?.total || 0;
                hourlySales[hourIdx].count++;
              }
            });

            // Weekly: daily sales (last 7 days from today)
            const oneDayMs = 24 * 60 * 60 * 1000;
            const weeklySales = Array(7).fill(0).map((_, i) => {
              const d = new Date(selectedDate.getTime() - (6 - i) * oneDayMs);
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const startRange = new Date(d);
              startRange.setHours(0, 0, 0, 0);
              const endRange = new Date(startRange.getTime() + oneDayMs);
              const dayOrders = orders.filter(o => 
                o.status === 'completed' && 
                new Date(o.timestamp || o.created_at) >= startRange && 
                new Date(o.timestamp || o.created_at) < endRange
              );
              const amount = dayOrders.reduce((sum, o) => sum + (o.billing?.total || 0), 0);
              return { label: dayNames[d.getDay()], amount, count: dayOrders.length };
            });

            // Monthly: weekly sales (last 4 weeks from today)
            const monthlySales = [
              { label: 'Week 1', startMs: 30, endMs: 22 },
              { label: 'Week 2', startMs: 21, endMs: 15 },
              { label: 'Week 3', startMs: 14, endMs: 8 },
              { label: 'Week 4', startMs: 7, endMs: 0 }
            ].map(w => {
              const startRange = new Date(selectedDate.getTime() - w.startMs * oneDayMs);
              const endRange = new Date(selectedDate.getTime() - w.endMs * oneDayMs + oneDayMs);
              const weekOrders = orders.filter(o => 
                o.status === 'completed' && 
                new Date(o.timestamp || o.created_at) >= startRange && 
                new Date(o.timestamp || o.created_at) < endRange
              );
              const amount = weekOrders.reduce((sum, o) => sum + (o.billing?.total || 0), 0);
              return { label: w.label, amount, count: weekOrders.length };
            });

            const chartData = dashboardChartTab === 'today' 
              ? hourlySales 
              : dashboardChartTab === 'week' 
                ? weeklySales 
                : monthlySales;

            const maxChartAmount = Math.max(...chartData.map(c => c.amount), 1);

            return (
              <div className="animate-fade-in flex flex-col gap-6">
                {/* Date & Today's Sales Banner */}
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#E63946] block">Overview</span>
                    <h2 className="text-base font-bold text-zinc-900 mt-0.5">{todayDateString}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#E63946]/5 text-[#E63946] px-4 py-2 rounded-lg font-bold text-sm border border-[#E63946]/10 flex items-center gap-2">
                      <span>Today's Sales:</span>
                      <span>Rs {selectedDateRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-[#E63946]/5 border border-[#E63946]/10 flex items-center justify-center text-[#E63946] shrink-0">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Revenue</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">Rs {selectedDateRevenue.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 shrink-0">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Orders</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">{selectedDateOrdersCount}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Average Value</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">Rs {selectedDateAverageValue.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Completed</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">{selectedDateCompletedCount}</span>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1 & 2: Revenue Chart and Live Orders */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Revenue Chart Widget */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col justify-between min-h-[380px]">
                      <div className="flex justify-between items-center border-b border-zinc-150 pb-4 mb-6">
                        <h3 className="text-base font-bold text-zinc-900">Revenue</h3>
                        <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl p-1 gap-1">
                          <button
                            onClick={() => setDashboardChartTab('today')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all rounded-lg ${dashboardChartTab === 'today' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                          >
                            Today
                          </button>
                          <button
                            onClick={() => setDashboardChartTab('week')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all rounded-lg ${dashboardChartTab === 'week' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                          >
                            Weekly
                          </button>
                          <button
                            onClick={() => setDashboardChartTab('month')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all rounded-lg ${dashboardChartTab === 'month' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-400 hover:text-zinc-800'
                              }`}
                          >
                            Monthly
                          </button>
                        </div>
                      </div>

                      {chartData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-400 italic text-sm py-20">
                          No sales records for this period.
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-end">
                          {(() => {
                            const width = 500;
                            const height = 180;
                            const padding = 15;
                            const points = chartData.map((item, idx) => {
                              const x = padding + (idx * (width - padding * 2)) / (chartData.length - 1 || 1);
                              const y = height - padding - (item.amount / maxChartAmount) * (height - padding * 2);
                              return { x, y, item, idx };
                            });

                            const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaPath = points.length > 0
                              ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
                              : '';

                            return (
                              <div className="relative h-56 w-full mt-4">
                                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                                  <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#E63946" stopOpacity="0.15" />
                                      <stop offset="100%" stopColor="#E63946" stopOpacity="0.00" />
                                    </linearGradient>
                                  </defs>

                                  <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
                                  <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
                                  <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e4e4e7" strokeWidth="1" />

                                  {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
                                  {linePath && <path d={linePath} fill="none" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                                  {points.map((p, idx) => (
                                    <g key={idx} className="group/dot cursor-pointer">
                                      <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r="4"
                                        fill="white"
                                        stroke="#E63946"
                                        strokeWidth="2"
                                        className="transition-all duration-200 hover:r-6"
                                      />
                                      <foreignObject
                                        x={p.x - 60}
                                        y={p.y - 48}
                                        width="120"
                                        height="42"
                                        className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none overflow-visible"
                                      >
                                        <div className="bg-zinc-950 text-white text-[9px] font-bold py-1 px-2 rounded shadow-md text-center whitespace-nowrap">
                                          <div className="font-mono">Rs {p.item.amount.toFixed(2)}</div>
                                          <div className="text-[7px] text-zinc-400 mt-0.5">{p.item.count} Orders</div>
                                        </div>
                                      </foreignObject>
                                    </g>
                                  ))}
                                </svg>
                              </div>
                            );
                          })()}

                          <div className="flex gap-4 px-2 mt-3 pt-1">
                            {chartData.map((item, index) => (
                              <div key={index} className="flex-1 text-center text-[10px] font-semibold text-zinc-400 truncate">
                                {item.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Live Orders Table */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-5">Live Orders</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-800">
                          <thead>
                            <tr className="uppercase bg-zinc-50 text-zinc-400 font-bold border-b border-zinc-150">
                              <th className="px-4 py-3 rounded-l-lg">Order</th>
                              <th className="px-4 py-3">Table</th>
                              <th className="px-4 py-3">Customer</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Total</th>
                              <th className="px-4 py-3 text-right rounded-r-lg">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {recentOrdersList.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="text-center py-8 text-zinc-400 italic">No orders received yet.</td>
                              </tr>
                            ) : (
                              recentOrdersList.map(order => (
                                <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold">{formatOrderId(order)}</td>
                                  <td className="px-4 py-3 font-semibold text-zinc-900">
                                    Table {String(order.table_name || order.table).replace(/[^0-9]/g, '')}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-500 font-medium">
                                    {order.billing?.customerName || 'Walk-in'}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-500 font-medium">
                                    {formatTypeLabel(order.order_type || order.billing?.order_type)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${getStatusClass(order.status)}`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-bold font-mono text-zinc-900">Rs {order.billing?.total?.toFixed(2) || '0.00'}</td>
                                  <td className="px-4 py-3 text-right text-zinc-400 font-semibold">
                                    {new Date(order.timestamp || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Secondary Widgets */}
                  <div className="flex flex-col gap-6">
                    {/* Order Summary */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Order Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Dine In</span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{orderTypeBreakdown.dineIn}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Takeaway</span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{orderTypeBreakdown.takeaway}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Delivery</span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{orderTypeBreakdown.delivery}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Total Orders</span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{orderTypeBreakdown.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Mix Donut */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col items-center">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-5 w-full">Order Mix</h3>
                      {orderTypeBreakdown.total === 0 ? (
                        <div className="py-6 text-center text-zinc-400 italic text-xs">No orders recorded yet.</div>
                      ) : (
                        <>
                          <div
                            className="h-32 w-32 rounded-full relative"
                            style={{
                              background: `conic-gradient(#E63946 0% ${orderTypeBreakdown.dineInPct}%, #2B2D42 ${orderTypeBreakdown.dineInPct}% ${orderTypeBreakdown.dineInPct + orderTypeBreakdown.takeawayPct}%, #a1a1aa ${orderTypeBreakdown.dineInPct + orderTypeBreakdown.takeawayPct}% 100%)`
                            }}
                          >
                            <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                              <span className="text-lg font-bold text-zinc-900">{orderTypeBreakdown.total}</span>
                              <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">Orders</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 w-full mt-5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-zinc-600">
                                <span className="h-2 w-2 rounded-full bg-[#E63946]"></span>Dine In
                              </span>
                              <span className="font-mono font-bold text-zinc-800">{orderTypeBreakdown.dineInPct.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-zinc-600">
                                <span className="h-2 w-2 rounded-full bg-[#2B2D42]"></span>Takeaway
                              </span>
                              <span className="font-mono font-bold text-zinc-800">{orderTypeBreakdown.takeawayPct.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-zinc-600">
                                <span className="h-2 w-2 rounded-full bg-zinc-400"></span>Delivery
                              </span>
                              <span className="font-mono font-bold text-zinc-800">{orderTypeBreakdown.deliveryPct.toFixed(0)}%</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Payment Summary Widget */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Payment Summary</h3>
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-zinc-500">Cash Payments</span>
                          <span className="font-mono font-bold text-zinc-800">Rs {paymentSummary.cashTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-zinc-500">Card Payments</span>
                          <span className="font-mono font-bold text-zinc-800">Rs {paymentSummary.cardTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-zinc-100 pt-2.5">
                          <span className="font-semibold text-zinc-800">Unpaid / Settle Pending</span>
                          <span className="font-mono font-bold text-zinc-800">Rs {paymentSummary.unpaidTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Balanced Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Top Selling Items */}
                  <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col min-h-[220px]">
                    <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Top Selling Items</h3>
                    {(topItems.length === 0) ? (
                      <div className="flex-1 flex items-center justify-center text-zinc-400 italic text-xs">
                        No item metrics computed yet.
                      </div>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {topItems.map((item, index) => (
                          <li key={index} className="flex items-center justify-between gap-3 text-xs border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span className="h-5 w-5 shrink-0 rounded bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-zinc-800 truncate">{item.name}</span>
                            </span>
                            <span className="font-mono font-bold text-zinc-500 shrink-0">{item.quantity} sold</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Kitchen Status Widget */}
                  <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col">
                    <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Kitchen Status</h3>
                    {activePreps.length === 0 ? (
                      <div className="py-6 text-center text-zinc-400 italic text-xs">No orders in kitchen.</div>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {activePreps.slice(0, 5).map((o, idx) => (
                          <li key={idx} className="flex justify-between items-center text-xs border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                            <span className="font-semibold text-zinc-800">
                              Table {String(o.table_name || o.table).replace(/[^0-9]/g, '')}
                            </span>
                            <span className={`px-2 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider ${getStatusClass(o.status)}`}>
                              {o.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Tables & Kitchen Status */}
                  <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Tables & Kitchen</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Active Tables</span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{activeTablesCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Occupied</span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{occupiedTablesCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Available</span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{availableTablesCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                            {settingsKitchenMode === 'printer_only' ? 'Active Orders' : 'Kitchen Queue'}
                          </span>
                          <span className="text-lg font-bold text-zinc-900 block mt-0.5">{kitchenPendingCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded bg-[#E63946]/5 border border-[#E63946]/10 text-[#E63946] flex items-center justify-center shrink-0">
                        <Flame size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider block text-zinc-400">Peak Hour</span>
                        <span className="text-xs font-bold text-zinc-900">{getPeakHourForSelectedDate()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === 'menu' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B2D42]">Menu Management</h2>
                </div>
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-[#E63946]/20 transition-colors"
                >
                  <Plus size={16} /> Add Item
                </button>
              </div>

              {menuLoading ? (
                <div className="text-center py-20 text-slate-500 animate-pulse">Loading menu…</div>
              ) : (
                groupedMenu.map(cat => (
                  <div key={cat.value} className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#E63946] mb-4">{cat.label}</h3>
                    {cat.items.length === 0 ? (
                      <p className="text-slate-400 text-sm italic pl-2">No items in this category.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cat.items.map(item => (
                          <div key={item.id} className="bg-white border border-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.035)] rounded-2xl p-4 flex gap-4 hover:shadow-[0_12px_24px_rgba(0,0,0,0.055)] transition-all group">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-[#2B2D42] text-sm truncate">{item.name}</h4>
                                <span className="text-[#E63946] font-bold text-sm ml-2 shrink-0">Rs {parseFloat(item.price).toFixed(2)}</span>
                              </div>
                              <p className="text-slate-500 text-xs mt-1 line-clamp-2">{item.description}</p>
                              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(item.id)}
                                  className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TAB 2: ALL ORDERS                               */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'orders' && (
            <div className="animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B2D42]">All Orders</h2>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by ID or table..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full sm:w-56 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] pl-9 pr-4 py-2.5 placeholder-slate-400 focus:outline-none focus:border-[#E63946]/50 focus:ring-1 focus:ring-[#E63946]/20"
                    />
                  </div>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] px-4 py-2.5 focus:outline-none focus:border-[#E63946]/50 appearance-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cooking">Cooking</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {ordersLoading ? (
                <div className="text-center py-20 text-slate-500">Loading orders…</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic">No orders match your filters.</div>
              ) : (
                <div className="bg-white border border-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.035)] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                          <th className="text-left px-5 py-3.5 font-bold">Order ID</th>
                          <th className="text-left px-5 py-3.5 font-bold">Order Type</th>
                          <th className="text-left px-5 py-3.5 font-bold">Status</th>
                          <th className="text-right px-5 py-3.5 font-bold">Total</th>
                          <th className="text-right px-5 py-3.5 font-bold">Payment</th>
                          <th className="text-right px-5 py-3.5 font-bold">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrders.map((order, idx) => {
                          const rawType = order.order_type || order.billing?.order_type;
                          const tbl = String(order.table_name || order.table || '').trim();
                          const isTakeaway = rawType === 'takeaway' || tbl.toLowerCase().includes('take away') || tbl.toLowerCase().includes('takeaway');
                          const isDelivery = rawType === 'delivery' || tbl.toLowerCase().includes('delivery');
                          const typeLabel = isTakeaway ? 'Takeaway' : isDelivery ? 'Delivery' : 'Dine-In';

                          return (
                            <tr key={order.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                              <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700">{formatOrderId(order)}</td>
                              <td className="px-5 py-3.5 font-bold">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${isTakeaway
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : isDelivery
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-500'}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-bold text-[#E63946]">Rs {(order.billing?.total || 0).toFixed(2)}</td>
                              <td className="px-5 py-3.5 text-right text-xs text-slate-400 capitalize">{order.billing?.paymentMethod || 'unpaid'}</td>
                              <td className="px-5 py-3.5 text-right text-xs text-slate-500 font-medium">
                                {formatReceiptDate(order.timestamp || order.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center px-5 py-4 border-t border-slate-100 text-xs bg-white text-slate-500">
                      <div>
                        Showing <span className="font-semibold text-slate-800">{((ordersPage - 1) * ENTRIES_PER_PAGE) + 1}</span> to{" "}
                        <span className="font-semibold text-slate-800">{Math.min(ordersPage * ENTRIES_PER_PAGE, filteredOrders.length)}</span> of{" "}
                        <span className="font-semibold text-slate-800">{filteredOrders.length}</span> entries
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <button
                          onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                          disabled={ordersPage === 1}
                          className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 bg-white cursor-pointer"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const pageNumbers = [];
                            const maxVisible = 5;
                            let start = Math.max(1, ordersPage - 2);
                            let end = Math.min(totalPages, start + maxVisible - 1);
                            if (end - start < maxVisible - 1) {
                              start = Math.max(1, end - maxVisible + 1);
                            }
                            for (let i = start; i <= end; i++) {
                              pageNumbers.push(i);
                            }
                            return pageNumbers.map(pageNum => (
                              <button
                                key={pageNum}
                                onClick={() => setOrdersPage(pageNum)}
                                className={`w-8 h-8 flex items-center justify-center border rounded-xl font-bold transition-colors cursor-pointer ${ordersPage === pageNum
                                  ? "bg-[#E63946] text-white border-[#E63946]"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                              >
                                {pageNum}
                              </button>
                            ));
                          })()}
                        </div>
                        <button
                          onClick={() => setOrdersPage(p => Math.min(totalPages, p + 1))}
                          disabled={ordersPage === totalPages}
                          className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 bg-white cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TAB 3: SALES ANALYTICS                         */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'sales' && (() => {
            // Local Period Date Range
            let startRange = new Date();
            let endRange = new Date();
            let periodLabel = '';

            if (analyticsMode === 'daily') {
              startRange = new Date(analyticsDate);
              startRange.setHours(0, 0, 0, 0);
              endRange = new Date(startRange.getTime() + 24 * 60 * 60 * 1000);
              periodLabel = new Date(analyticsDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            } else {
              const [yr, mo] = analyticsMonth.split('-').map(Number);
              startRange = new Date(yr, mo - 1, 1);
              endRange = new Date(yr, mo, 1);
              periodLabel = startRange.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
              });
            }

            // Filter orders for the selected period
            const periodCompletedOrders = orders.filter(o => 
              o.status === 'completed' && 
              new Date(o.timestamp || o.created_at) >= startRange && 
              new Date(o.timestamp || o.created_at) < endRange
            );
            const periodAllOrders = orders.filter(o => 
              new Date(o.timestamp || o.created_at) >= startRange && 
              new Date(o.timestamp || o.created_at) < endRange
            );

            // Metrics
            const periodRevenue = periodCompletedOrders.reduce((sum, o) => sum + (o.billing?.total || 0), 0);
            const periodOrdersCount = periodAllOrders.length;
            const completedCount = periodCompletedOrders.length;
            const periodAverageValue = completedCount > 0 ? (periodRevenue / completedCount) : 0;
            const periodCompletedCount = completedCount;

            const paymentSummary = (() => {
              let cashTotal = 0;
              let cardTotal = 0;
              let unpaidTotal = 0;

              periodCompletedOrders.forEach(o => {
                const method = String(o.billing?.paymentMethod || 'cash').toLowerCase();
                const amount = o.billing?.total || 0;
                if (method === 'card') {
                  cardTotal += amount;
                } else if (method === 'cash') {
                  cashTotal += amount;
                } else {
                  unpaidTotal += amount;
                }
              });

              return { cashTotal, cardTotal, unpaidTotal };
            })();

            const orderTypeBreakdown = (() => {
              const counts = { dineIn: 0, takeaway: 0, delivery: 0 };
              periodAllOrders.forEach(o => {
                const rawType = o.order_type || o.billing?.order_type;
                const tbl = String(o.table_name || o.table || '').toLowerCase();
                const isTakeaway = rawType === 'takeaway' || tbl.includes('take away') || tbl.includes('takeaway');
                const isDelivery = rawType === 'delivery' || tbl.includes('delivery');
                if (isTakeaway) counts.takeaway++;
                else if (isDelivery) counts.delivery++;
                else counts.dineIn++;
              });
              const total = counts.dineIn + counts.takeaway + counts.delivery;
              const safeTotal = total || 1;
              return {
                ...counts,
                total,
                dineInPct: (counts.dineIn / safeTotal) * 100,
                takeawayPct: (counts.takeaway / safeTotal) * 100,
                deliveryPct: (counts.delivery / safeTotal) * 100,
              };
            })();

            const topItems = (() => {
              const tracker = {};
              periodCompletedOrders.forEach(o => {
                (o.items || []).forEach(item => {
                  if (!tracker[item.name]) {
                    tracker[item.name] = { quantity: 0, revenue: 0 };
                  }
                  tracker[item.name].quantity += item.quantity;
                  tracker[item.name].revenue += (item.price || 0) * item.quantity;
                });
              });
              return Object.entries(tracker)
                .map(([name, stat]) => ({ name, quantity: stat.quantity, revenue: stat.revenue }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);
            })();

            const periodOrdersList = [...periodAllOrders]
              .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at))
              .slice(0, 5);

            // Dynamic Chart Hourly aggregation for selected mode
            let chartData = [];
            if (analyticsMode === 'daily') {
              chartData = Array(12).fill(0).map((_, i) => ({ label: `${11 + i}:00`, amount: 0, count: 0 }));
              periodCompletedOrders.forEach(o => {
                const hour = new Date(o.timestamp || o.created_at).getHours();
                const hourIdx = hour - 11;
                if (hourIdx >= 0 && hourIdx < 12) {
                  chartData[hourIdx].amount += o.billing?.total || 0;
                  chartData[hourIdx].count++;
                }
              });
            } else {
              // Monthly: list of days in this month
              const [yr, mo] = analyticsMonth.split('-').map(Number);
              const daysInMonth = new Date(yr, mo, 0).getDate();
              chartData = Array(daysInMonth).fill(0).map((_, i) => ({ label: String(i + 1), amount: 0, count: 0 }));
              periodCompletedOrders.forEach(o => {
                const day = new Date(o.timestamp || o.created_at).getDate();
                const dayIdx = day - 1;
                if (dayIdx >= 0 && dayIdx < daysInMonth) {
                  chartData[dayIdx].amount += o.billing?.total || 0;
                  chartData[dayIdx].count++;
                }
              });
            }

            const maxChartAmount = Math.max(...chartData.map(c => c.amount), 1);

            const getStatusClass = (status) => {
              switch (status) {
                case 'pending':
                  return 'bg-orange-50 text-orange-700 border border-orange-100';
                case 'completed':
                case 'served':
                  return 'bg-green-50 text-green-700 border border-green-100';
                case 'cancelled':
                  return 'bg-red-50 text-red-700 border border-red-100';
                default:
                  return 'bg-blue-50 text-blue-700 border border-blue-100';
              }
            };

            const formatTypeLabel = (type) => {
              if (type === 'delivery') return 'Delivery';
              if (type === 'takeaway') return 'Take Away';
              return 'Dine In';
            };

            return (
              <div className="animate-fade-in flex flex-col gap-6">
                {/* Header Controls Banner */}
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#E63946] block">Sales Analytics</span>
                    <h2 className="text-base font-bold text-zinc-900 mt-0.5">{periodLabel}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                    <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl p-1 gap-1">
                      <button
                        onClick={() => setAnalyticsMode('daily')}
                        className={`px-3 py-1.5 text-xs font-bold transition-all rounded-lg ${analyticsMode === 'daily' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-400 hover:text-zinc-800'
                          }`}
                      >
                        Daily Mode
                      </button>
                      <button
                        onClick={() => setAnalyticsMode('monthly')}
                        className={`px-3 py-1.5 text-xs font-bold transition-all rounded-lg ${analyticsMode === 'monthly' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-400 hover:text-zinc-800'
                          }`}
                      >
                        Monthly Mode
                      </button>
                    </div>

                    {analyticsMode === 'daily' ? (
                      <input 
                        type="date" 
                        value={analyticsDate} 
                        onChange={(e) => setAnalyticsDate(e.target.value)} 
                        className="bg-white border border-zinc-200 rounded-lg text-xs font-bold px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#E63946] cursor-pointer"
                      />
                    ) : (
                      <input 
                        type="month" 
                        value={analyticsMonth} 
                        onChange={(e) => setAnalyticsMonth(e.target.value)} 
                        className="bg-white border border-zinc-200 rounded-lg text-xs font-bold px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#E63946] cursor-pointer"
                      />
                    )}

                    <button
                      onClick={downloadSalesReport}
                      className="flex items-center gap-1.5 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-[#E63946]/20 transition-all cursor-pointer shrink-0"
                    >
                      <Download size={14} /> Download CSV
                    </button>
                  </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-[#E63946]/5 border border-[#E63946]/10 flex items-center justify-center text-[#E63946] shrink-0">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Period Revenue</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">Rs {periodRevenue.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 shrink-0">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Total Orders</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">{periodOrdersCount}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Average Value</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">Rs {periodAverageValue.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Completed</span>
                      <span className="text-xl font-bold text-zinc-900 mt-1 block">{periodCompletedCount}</span>
                    </div>
                  </div>
                </div>

                {/* Main Content Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* SVG Line / Area Chart */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col justify-between min-h-[380px]">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-150 pb-4 mb-6">Revenue Trend</h3>
                      {chartData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-400 italic text-sm py-20">
                          No sales records for this period.
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-end">
                          {(() => {
                            const width = 500;
                            const height = 180;
                            const padding = 15;
                            const points = chartData.map((item, idx) => {
                              const x = padding + (idx * (width - padding * 2)) / (chartData.length - 1 || 1);
                              const y = height - padding - (item.amount / maxChartAmount) * (height - padding * 2);
                              return { x, y, item, idx };
                            });

                            const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaPath = points.length > 0
                              ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
                              : '';

                            return (
                              <div className="relative h-56 w-full mt-4">
                                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                                  <defs>
                                    <linearGradient id="analyticsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#E63946" stopOpacity="0.15" />
                                      <stop offset="100%" stopColor="#E63946" stopOpacity="0.00" />
                                    </linearGradient>
                                  </defs>

                                  <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
                                  <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
                                  <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e4e4e7" strokeWidth="1" />

                                  {areaPath && <path d={areaPath} fill="url(#analyticsAreaGrad)" />}
                                  {linePath && <path d={linePath} fill="none" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                                  {points.map((p, idx) => (
                                    <g key={idx} className="group/dot cursor-pointer">
                                      <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r="3.5"
                                        fill="white"
                                        stroke="#E63946"
                                        strokeWidth="2"
                                        className="transition-all duration-200 hover:r-5"
                                      />
                                      <foreignObject
                                        x={p.x - 60}
                                        y={p.y - 48}
                                        width="120"
                                        height="42"
                                        className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none overflow-visible"
                                      >
                                        <div className="bg-zinc-950 text-white text-[9px] font-bold py-1 px-2 rounded shadow-md text-center whitespace-nowrap">
                                          <div>Rs {p.item.amount.toFixed(2)}</div>
                                          <div className="text-[7px] text-zinc-400 mt-0.5">{p.item.count} Orders</div>
                                        </div>
                                      </foreignObject>
                                    </g>
                                  ))}
                                </svg>
                              </div>
                            );
                          })()}

                          <div className="flex gap-1.5 px-2 mt-3 pt-1">
                            {chartData.map((item, index) => {
                              // Conditionally space out labels for monthly view
                              const shouldShowLabel = analyticsMode === 'daily' || index === 0 || index === chartData.length - 1 || (index + 1) % 5 === 0;
                              return (
                                <div key={index} className="flex-1 text-center text-[9px] font-semibold text-zinc-400 truncate">
                                  {shouldShowLabel ? item.label : ''}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Period Orders list */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-5">Period Orders</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-800">
                          <thead>
                            <tr className="uppercase bg-zinc-50 text-zinc-400 font-bold border-b border-zinc-150">
                              <th className="px-4 py-3 rounded-l-lg">Order</th>
                              <th className="px-4 py-3">Table</th>
                              <th className="px-4 py-3">Customer</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Total</th>
                              <th className="px-4 py-3 text-right rounded-r-lg">Date/Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {periodOrdersList.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="text-center py-8 text-zinc-400 italic">No orders recorded in this period.</td>
                              </tr>
                            ) : (
                              periodOrdersList.map(order => (
                                <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold">{formatOrderId(order)}</td>
                                  <td className="px-4 py-3 font-semibold text-zinc-900">
                                    Table {String(order.table_name || order.table).replace(/[^0-9]/g, '')}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-500 font-medium">
                                    {order.billing?.customerName || 'Walk-in'}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-500 font-medium">
                                    {formatTypeLabel(order.order_type || order.billing?.order_type)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${getStatusClass(order.status)}`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-bold font-mono text-zinc-900">Rs {order.billing?.total?.toFixed(2) || '0.00'}</td>
                                  <td className="px-4 py-3 text-right text-zinc-400 font-semibold">
                                    {new Date(order.timestamp || order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{" "}
                                    {new Date(order.timestamp || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Order Mix */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col items-center">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-5 w-full">Order Mix</h3>
                      {orderTypeBreakdown.total === 0 ? (
                        <div className="py-6 text-center text-zinc-400 italic text-xs">No orders recorded in this period.</div>
                      ) : (
                        <>
                          <div
                            className="h-32 w-32 rounded-full relative"
                            style={{
                              background: `conic-gradient(#E63946 0% ${orderTypeBreakdown.dineInPct}%, #2B2D42 ${orderTypeBreakdown.dineInPct}% ${orderTypeBreakdown.dineInPct + orderTypeBreakdown.takeawayPct}%, #a1a1aa ${orderTypeBreakdown.dineInPct + orderTypeBreakdown.takeawayPct}% 100%)`
                            }}
                          >
                            <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                              <span className="text-lg font-bold text-zinc-900">{orderTypeBreakdown.total}</span>
                              <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">Orders</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 w-full mt-5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-zinc-600">
                                <span className="h-2 w-2 rounded-full bg-[#E63946]"></span>Dine In
                              </span>
                              <span className="font-mono font-bold text-zinc-800">{orderTypeBreakdown.dineInPct.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-zinc-600">
                                <span className="h-2 w-2 rounded-full bg-[#2B2D42]"></span>Takeaway
                              </span>
                              <span className="font-mono font-bold text-zinc-800">{orderTypeBreakdown.takeawayPct.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-zinc-600">
                                <span className="h-2 w-2 rounded-full bg-zinc-400"></span>Delivery
                              </span>
                              <span className="font-mono font-bold text-zinc-800">{orderTypeBreakdown.deliveryPct.toFixed(0)}%</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Payment Summary</h3>
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-zinc-500">Cash Payments</span>
                          <span className="font-mono font-bold text-zinc-800">Rs {paymentSummary.cashTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-zinc-500">Card Payments</span>
                          <span className="font-mono font-bold text-zinc-800">Rs {paymentSummary.cardTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-zinc-100 pt-2.5">
                          <span className="font-semibold text-zinc-800">Unpaid / Settle Pending</span>
                          <span className="font-mono font-bold text-zinc-800">Rs {paymentSummary.unpaidTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Top Selling Items */}
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs flex flex-col min-h-[220px]">
                      <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Top Selling Items</h3>
                      {(topItems.length === 0) ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-400 italic text-xs">
                          No item metrics computed yet.
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {topItems.map((item, index) => (
                            <li key={index} className="flex items-center justify-between gap-3 text-xs border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span className="h-5 w-5 shrink-0 rounded bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="font-semibold text-zinc-800 truncate">{item.name}</span>
                              </span>
                              <span className="font-mono font-bold text-zinc-500 shrink-0">{item.quantity} sold</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TAB 4: QR CODE STAND GENERATION               */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'qr' && (
            <div className="animate-fade-in max-w-4xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B2D42]">Secure QR Table Code Manager</h2>
                </div>
                <button
                  onClick={printAllQrs}
                  className="flex items-center gap-1.5 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Printer size={16} /> Print All QR Stands
                </button>
              </div>

              <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total Restaurant Tables</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={tableCount}
                      onChange={(e) => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-32 py-2 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] font-bold text-sm focus:border-[#E63946] outline-none"
                    />
                  </div>
                </div>

                <h3 className="font-bold text-sm text-[#2B2D42] mb-4">Table Codes & Development Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: tableCount }, (_, i) => i + 1).map(num => {
                    const code = tableCodesMap[num] || '...';
                    const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'default';
                    const fullUrl = `${window.location.origin}/r/${slug}/customer?table=${code}`;

                    return (
                      <div key={num} className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between bg-slate-50/60 hover:bg-slate-50 transition-colors gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[#2B2D42]">Table {num}</span>
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded-md tracking-wider">
                              {code}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setConfirmRegenTable(num)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all"
                              title="Regenerate table code"
                            >
                              Reset Code
                            </button>
                            <button
                              onClick={() => printSingleQr(num)}
                              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:border-[#E63946] text-[#E63946] hover:bg-red-50/30 transition-all shadow-xs"
                              title="Print QR stand"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Full Dev URL & Quick Action Links */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#E63946] hover:underline truncate font-semibold mr-2"
                            title={fullUrl}
                          >
                            {fullUrl}
                          </a>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(fullUrl);
                                toast.success(`Copied Table ${num} URL!`);
                              }}
                              className="text-[11px] font-bold font-sans text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-all"
                            >
                              Copy
                            </button>
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold font-sans text-white bg-[#2B2D42] hover:bg-[#2B2D42]/90 px-2.5 py-0.5 rounded transition-all"
                            >
                              Open ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation Modal for Regenerating Code */}
              {confirmRegenTable && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
                    <h3 className="text-xl font-bold text-[#2B2D42] mb-2">Regenerate Code for Table {confirmRegenTable}?</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      Generating a new random code for <strong className="text-slate-900">Table {confirmRegenTable}</strong> will immediately <strong className="text-red-600">invalidate the existing physical QR code stand</strong> on the table. Anyone scanning the old QR stand will be denied access.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setConfirmRegenTable(null)}
                        disabled={isRegenerating}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRegenerateCode(confirmRegenTable)}
                        disabled={isRegenerating}
                        className="px-5 py-2.5 bg-[#E63946] hover:bg-[#FF6B35] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        {isRegenerating ? 'Regenerating…' : 'Yes, Invalidate & Regenerate'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B2D42]">Staff Credentials</h2>
                </div>
                <button
                  onClick={openAddStaffModal}
                  className="flex items-center gap-2 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-[#E63946]/20 transition-colors"
                >
                  <Plus size={16} /> Create Staff Login
                </button>
              </div>

              {staffLoading ? (
                <div className="text-center py-20 text-slate-500">Loading staff credentials…</div>
              ) : (
                <div className="bg-white border border-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.035)] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                          <th className="text-left px-6 py-4 font-bold">Display Name</th>
                          <th className="text-left px-6 py-4 font-bold">Employee Code</th>
                          <th className="text-left px-6 py-4 font-bold">Role Terminal</th>
                          <th className="text-left px-6 py-4 font-bold">Status</th>
                          <th className="text-right px-6 py-4 font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffList.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">No staff logins registered. Create one to allow Kitchen or Sales dashboard access.</td>
                          </tr>
                        ) : (
                          staffList.map(staff => (
                            <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-[#2B2D42]">{staff.display_name}</td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-650">{staff.employee_code}</td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${staff.role === 'kitchen_staff'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : staff.role === 'rider'
                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  }`}>
                                  {staff.role === 'kitchen_staff'
                                    ? 'Kitchen (KDS)'
                                    : staff.role === 'rider'
                                      ? 'Delivery Rider'
                                      : staff.role === 'waiter'
                                        ? 'Waiter POS'
                                        : 'Sales Terminal'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => handleToggleStaffActive(staff)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${staff.is_active
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : 'bg-red-50 text-red-600 border-red-200'
                                    }`}
                                >
                                  {staff.is_active ? 'Allowed' : 'Suspended'}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => openEditStaffModal(staff)}
                                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteStaff(staff.id)}
                                  className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <Trash2 size={12} /> Delete
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
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TAB 6: RESTAURANT SETTINGS                     */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in max-w-4xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#2B2D42]">Restaurant Settings</h2>
              </div>

              {settingsLoading ? (
                <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-[#E63946]" size={24} />
                  <span>Loading restaurant configuration...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="bg-white border border-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.035)] rounded-2xl p-6 sm:p-8 flex flex-col gap-6">

                  {/* Branding Section */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Branding & Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Restaurant Name</label>
                        <input
                          type="text"
                          required
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          placeholder="e.g. Gourmet Bistro"
                          className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] focus:border-[#E63946] outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Restaurant Logo</label>
                        <div className="flex items-center gap-4">
                          {settingsLogo ? (
                            <div className="relative w-16 h-16 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-sm p-1">
                              <img src={settingsLogo} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                              <button
                                type="button"
                                onClick={() => setSettingsLogo('')}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow"
                                title="Remove logo"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon size={20} />
                            </div>
                          )}
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="settings-logo-upload"
                            />
                            <label
                              htmlFor="settings-logo-upload"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                            >
                              {logoUploading ? (
                                <>
                                  <Loader2 className="animate-spin" size={14} />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={14} />
                                  <span>Select Image from PC</span>
                                </>
                              )}
                            </label>
                            <p className="text-[10px] text-slate-400 mt-1">Recommended: Square logo with a transparent/white background (Max 5MB).</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Contact Details & Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Contact Email</label>
                        <input
                          type="email"
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          placeholder="e.g. contact@bistro.com"
                          className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] focus:border-[#E63946] outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Phone Number</label>
                        <input
                          type="text"
                          value={settingsPhone}
                          onChange={(e) => setSettingsPhone(e.target.value)}
                          placeholder="e.g. +1 555-0199"
                          className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] focus:border-[#E63946] outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Location Address</label>
                        <input
                          type="text"
                          value={settingsAddress}
                          onChange={(e) => setSettingsAddress(e.target.value)}
                          placeholder="e.g. 123 Gourmet Way, NY"
                          className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] focus:border-[#E63946] outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Configurations */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Billing Rates & Fees</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Sales Tax Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={settingsTax}
                          onChange={(e) => setSettingsTax(parseFloat(e.target.value) || 0)}
                          placeholder="8.00"
                          className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] focus:border-[#E63946] outline-none transition-colors"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Configure the default state tax rate added to customer checks.</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Service Charge (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={settingsServiceCharge}
                          onChange={(e) => setSettingsServiceCharge(parseFloat(e.target.value) || 0)}
                          placeholder="5.00"
                          className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] focus:border-[#E63946] outline-none transition-colors"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Configure default gratuity/service fees applied to dining checks.</p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Kitchen Management Mode</label>
                      <select
                        value={settingsKitchenMode}
                        onChange={(e) => setSettingsKitchenMode(e.target.value)}
                        className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] focus:border-[#E63946] outline-none transition-colors"
                      >
                        <option value="display">Kitchen Display Screen (KDS)</option>
                        <option value="printer_only">Printer Only Mode</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Choose whether orders go to an interactive kitchen tablet display screen or print directly to a kitchen ticket printer.
                      </p>
                    </div>
                  </div>

                  {/* Form Action */}
                  <div className="border-t border-slate-100 pt-5 flex justify-end">
                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="flex items-center gap-2 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-[#E63946]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {settingsSaving ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Saving Settings...</span>
                        </>
                      ) : (
                        <>
                          <Settings size={16} />
                          <span>Save Configuration</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}
            </div>
          )}

        </main>
      </div>{/* end right content area */}

      {/* MODAL: Menu Add / Edit Item                       */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {menuModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md p-6 shadow-xl animate-pop-in">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
              <h3 className="text-lg font-bold text-[#2B2D42]">{menuEditItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setMenuModal(false)} className="text-xl text-slate-400 hover:text-[#2B2D42]">✕</button>
            </div>

            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
              {!menuEditItem && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Item ID (Unique)</label>
                  <input
                    type="text"
                    value={menuForm.id}
                    onChange={e => setMenuForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    placeholder="e.g. burger_cheese"
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Name</label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={e => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Gourmet Cheeseburger"
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Category</label>
                  <select
                    value={isCustomCategory ? '__custom__' : menuForm.category}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomCategory(true);
                        setMenuForm(prev => ({ ...prev, category: customCategoryVal }));
                      } else {
                        setIsCustomCategory(false);
                        setMenuForm(prev => ({ ...prev, category: val }));
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none appearance-none"
                  >
                    {Array.from(new Set([
                      'starters', 'mains', 'desserts', 'drinks',
                      ...Array.from(new Set(menuItems.map(i => i.category).filter(Boolean)))
                    ])).map(catKey => {
                      const label = catKey.charAt(0).toUpperCase() + catKey.slice(1);
                      return <option key={catKey} value={catKey}>{label}</option>;
                    })}
                    <option value="__custom__">+ Create New Category...</option>
                  </select>
                  {isCustomCategory && (
                    <input
                      type="text"
                      required
                      value={customCategoryVal}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomCategoryVal(val);
                        setMenuForm(prev => ({ ...prev, category: val }));
                      }}
                      placeholder="e.g. Burgers, Sides..."
                      className="w-full mt-2 py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none animate-fade-in"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Price (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={menuForm.price}
                    onChange={e => setMenuForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="12.99"
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Description</label>
                <textarea
                  value={menuForm.description}
                  onChange={e => setMenuForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the ingredients or flavor profile..."
                  rows="3"
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Dish Image</label>
                <input
                  type="file"
                  id="menu-img-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="menu-img-upload"
                  className="w-full h-32 border-2 border-dashed border-slate-200 hover:border-[#E63946] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-red-50/10 transition-all overflow-hidden"
                >
                  {imageUploading ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400 animate-pulse text-xs">
                      <Loader2 size={24} className="animate-spin text-[#E63946]" />
                      Uploading to cloud storage...
                    </div>
                  ) : imagePreview ? (
                    <div className="relative w-full h-full group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-all">
                        Change Image
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="text-slate-400" />
                      <span className="text-xs text-slate-500">Click to upload image <span className="text-slate-400">(JPEG, PNG, WebP — max 5MB)</span></span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMenuModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMenuSubmit}
                className="flex-1 py-2.5 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl shadow-md shadow-[#E63946]/20 transition-colors"
              >
                {menuEditItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL: Staff Add / Edit Account                   */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {staffModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md p-6 shadow-xl animate-pop-in">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
              <h3 className="text-lg font-bold text-[#2B2D42]">{staffEditItem ? 'Edit Staff Credentials' : 'Create Staff Login'}</h3>
              <button onClick={() => setStaffModal(false)} className="text-xl text-slate-400 hover:text-[#2B2D42]">✕</button>
            </div>

            {staffError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl mb-4">
                {staffError}
              </div>
            )}

            <form onSubmit={handleStaffSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">
                  {staffForm.role === 'rider' ? 'Rider Full Name' : 'Staff Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={staffForm.displayName}
                  onChange={e => setStaffForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={staffForm.role === 'rider' ? 'e.g. Ali Fayyaz' : 'e.g. Chef Ahmed'}
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">
                  {staffForm.role === 'rider' ? 'Rider Phone Number / Code' : 'Employee Code (Login)'}
                </label>
                <input
                  type="text"
                  required
                  disabled={!!staffEditItem}
                  value={staffForm.username}
                  onChange={e => setStaffForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  placeholder={staffForm.role === 'rider' ? 'e.g. 0300-1234567' : 'e.g. chef001'}
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none disabled:bg-slate-100"
                />
              </div>

              {staffForm.role !== 'rider' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Password</label>
                  <input
                    type="password"
                    required={!staffEditItem}
                    value={staffForm.password}
                    onChange={e => setStaffForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={staffEditItem ? 'Leave blank to keep current' : '••••••••'}
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none"
                  />
                </div>
              )}

              {!staffEditItem && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Terminal Scoped Role</label>
                  <select
                    value={staffForm.role}
                    onChange={e => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none appearance-none"
                  >
                    <option value="kitchen_staff">Kitchen Display (KDS)</option>
                    <option value="sales_staff">Sales Terminal</option>
                    <option value="waiter">Waiter POS & Floor Dashboard</option>
                    <option value="rider">Delivery Rider</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStaffModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                >
                  {staffEditItem ? 'Save Settings' : 'Create Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL: Delete Menu Item Confirmation             */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white border border-red-100 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-[#2B2D42] mb-2">Delete Menu Item?</h2>
              <p className="text-slate-500 text-sm mb-6">
                This will permanently remove <strong className="text-[#2B2D42]">{menuItems.find(i => i.id === deleteConfirm)?.name}</strong> from the menu. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteItem(deleteConfirm)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors"
            >
              ✕
            </button>
            <div className="mb-5 text-center">
              <h3 className="text-lg font-black text-[#2B2D42]">Upgrade to Premium</h3>
              <p className="text-xs text-slate-400 mt-1">Unlock unlimited active orders, staff management, analytics, and custom QR codes permanently.</p>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2">
                <p>To upgrade your subscription, please contact support:</p>
                <div className="flex flex-col gap-1 mt-2">
                  <a href="mailto:alifayyaz958362@gmail.com" className="font-extrabold text-black hover:underline">alifayyaz958362@gmail.com</a>
                  <a href="https://wa.me/92312064468" target="_blank" rel="noreferrer" className="font-extrabold text-indigo-600 hover:underline">WhatsApp Support</a>
                </div>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2.5 bg-black hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
