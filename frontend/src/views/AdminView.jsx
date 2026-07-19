import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, BarChart3, QrCode,
  Plus, Pencil, Trash2, X, Search, Printer, Download, ChevronDown,
  Upload, ImageIcon, Loader2, Users, Key, Settings
} from 'lucide-react';

import { API_URL } from '../utils/config';

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
  const [activeTab, setActiveTab] = useState('menu');

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

  // ─── Sales State ───
  const [salesData, setSalesData] = useState(null);
  const [salesLoading, setSalesLoading] = useState(true);

  // ─── QR State ───
  const [tableCount, setTableCount] = useState(10);

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

    // 1. Filter by period (today, month, year, or all)
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

    if (completed.length === 0) {
      toast.error(`No completed sales transactions found for period: "${csvPeriod}".`);
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
          service_charge: parseFloat(settingsServiceCharge) || 0
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

  useEffect(() => {
    loadMenu();
    loadOrders();
    loadSales();
    loadStaff();
    loadSettings();
  }, []);

  // ╔═══════════════════════════════════════╗
  // ║          MENU CRUD HANDLERS           ║
  // ╚═══════════════════════════════════════╝
  const openAddModal = () => {
    setMenuEditItem(null);
    setMenuForm({ id: '', name: '', category: 'starters', price: '', description: '', image: '' });
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
        // Create new
        const newId = menuForm.id || `item_${Date.now()}`;
        const res = await fetch(`${BACKEND_URL}/api/v1/menu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
          },
          body: JSON.stringify({ ...menuForm, id: newId, price: parseFloat(menuForm.price) })
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
  // ║          QR CODE HELPERS              ║
  // ╚═══════════════════════════════════════╝
  const getQrUrl = (tableNum) => {
    const target = `${window.location.origin}/r/${user?.restaurantSlug || 'default'}/customer?table=${tableNum}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=000000&bgcolor=ffffff&qzone=2&data=${encodeURIComponent(target)}`;
  };

  const printSingleQr = (tableNum) => {
    const url = getQrUrl(tableNum);
    const target = `${window.location.origin}/r/${user?.restaurantSlug || 'default'}/customer?table=${tableNum}`;
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <html>
        <head><title>QR Code - Table ${tableNum}</title>
          <style>
            body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:'Outfit',sans-serif; margin:0; }
            h1 { font-size:28px; color:#2B2D42; margin-bottom:4px; }
            h2 { font-size:16px; color:#E63946; margin-bottom:24px; font-weight:600; }
            img { border:2px solid #f0f0f0; border-radius:16px; padding:12px; }
            p { font-size:11px; color:#999; margin-top:16px; word-break:break-all; max-width:300px; text-align:center; }
          </style>
        </head>
        <body>
          <h1>${user?.restaurantName || 'Gourmet Bistro'}</h1>
          <h2>Table ${tableNum}</h2>
          <img src="${url}" width="250" height="250" />
          <p>Scan to order: ${target}</p>
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const printAllQrs = () => {
    const cards = Array.from({ length: tableCount }, (_, i) => i + 1).map(num => {
      const target = `${window.location.origin}/r/${user?.restaurantSlug || 'default'}/customer?table=${num}`;
      return `
        <div style="display:flex;flex-direction:column;align-items:center;padding:24px;border:1px solid #eee;border-radius:12px;">
          <h3 style="margin:0 0 4px;font-size:18px;color:#2B2D42;">Table ${num}</h3>
          <img src="${getQrUrl(num)}" width="180" height="180" style="margin:8px 0;" />
          <p style="font-size:9px;color:#999;margin:0;word-break:break-all;max-width:200px;text-align:center;">${target}</p>
        </div>
      `;
    }).join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <html>
        <head><title>All QR Codes - Gourmet Bistro</title>
          <style>
            body { font-family:'Outfit',sans-serif; margin:20px; }
            h1 { text-align:center; color:#2B2D42; }
            .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px; }
          </style>
        </head>
        <body>
          <h1>Gourmet Bistro — Table QR Codes</h1>
          <div class="grid">${cards}</div>
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 1000);
  };

  // ╔═══════════════════════════════════════╗
  // ║          FILTERED DATA                ║
  // ╚═══════════════════════════════════════╝
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const q = orderSearch.toLowerCase();
    const matchesSearch = !q || o.id.toLowerCase().includes(q) || o.table.toString().includes(q);
    return matchesStatus && matchesSearch;
  });

  const activeCats = Array.from(new Set(menuItems.map(i => i.category).filter(Boolean)));
  const catsToDisplay = activeCats.length > 0 ? activeCats : ['starters', 'mains', 'desserts', 'drinks'];

  const groupedMenu = catsToDisplay.map(cat => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    items: menuItems.filter(i => i.category === cat)
  }));

  const tabs = [
    { key: 'menu', label: 'Menu Editor', icon: UtensilsCrossed },
    { key: 'orders', label: 'All Orders', icon: ClipboardList },
    { key: 'sales', label: 'Sales Analytics', icon: BarChart3 },
    { key: 'qr', label: 'QR Codes', icon: QrCode },
    { key: 'staff', label: 'Staff Logins', icon: Users },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#2B2D42]">

      {/* ── Top Header Bar ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user?.restaurantLogo ? (
            <img src={user.restaurantLogo} className="h-8 w-auto object-contain rounded-lg border border-slate-105 p-0.5" alt={user.restaurantName} />
          ) : (
            <LayoutDashboard size={22} className="text-[#E63946]" />
          )}
          <h1 className="text-xl font-bold tracking-tight text-[#2B2D42]">
            {user?.restaurantName || 'AdminPanel'}
          </h1>
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-500 ml-2">
            Admin Panel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-mono">{user?.email}</span>
          <button onClick={logout} className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-[#E63946] border-[#E63946]'
                  : 'text-slate-400 border-transparent hover:text-[#2B2D42] hover:border-slate-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Tab Content ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 1: MENU EDITOR                              */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D42]">Menu Management</h2>
                <p className="text-slate-500 text-sm mt-1">{menuItems.length} items across {catsToDisplay.length} categories</p>
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
                <p className="text-slate-500 text-sm mt-1">{orders.length} total orders</p>
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
                        <th className="text-left px-5 py-3.5 font-bold">Table</th>
                        <th className="text-left px-5 py-3.5 font-bold">Items</th>
                        <th className="text-left px-5 py-3.5 font-bold">Status</th>
                        <th className="text-right px-5 py-3.5 font-bold">Total</th>
                        <th className="text-right px-5 py-3.5 font-bold">Payment</th>
                        <th className="text-right px-5 py-3.5 font-bold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, idx) => (
                        <tr key={order.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{order.id}</td>
                          <td className="px-5 py-3.5 font-bold text-[#2B2D42]">Table {order.table_name || order.table}</td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[200px]">
                            {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-500'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-[#E63946]">Rs {order.billing.total.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right text-xs text-slate-400 capitalize">{order.billing.paymentMethod}</td>
                          <td className="px-5 py-3.5 text-right text-xs text-slate-500">
                            {new Date(order.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 3: SALES ANALYTICS                         */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'sales' && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D42]">Sales Dashboard</h2>
                <p className="text-slate-500 text-sm mt-1">Real-time revenue metrics & order summaries</p>
              </div>
              {salesData && (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={csvPeriod}
                    onChange={(e) => setCsvPeriod(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl text-sm text-[#2B2D42] px-4 py-2.5 focus:outline-none focus:border-[#E63946]/50 appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="all">📁 All Time Report</option>
                    <option value="today">📅 Today's Report</option>
                    <option value="month">📅 This Month's Report</option>
                    <option value="year">📅 This Year's Report</option>
                  </select>
                  <button
                    onClick={downloadSalesReport}
                    className="flex items-center gap-1.5 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-[#E63946]/20 transition-colors shrink-0"
                  >
                    <Download size={16} /> Download CSV
                  </button>
                </div>
              )}
            </div>

            {salesLoading ? (
              <div className="text-center py-20 text-slate-500">Calculating statistics…</div>
            ) : !salesData ? (
              <div className="text-center py-20 text-slate-400">Failed to aggregate sales records.</div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
                    <span className="text-3xl font-black text-[#E63946] mt-2">Rs {salesData.metrics.today.revenue.toFixed(2)}</span>
                    <span className="text-xs text-slate-500 mt-1">{salesData.metrics.today.count} completed orders</span>
                  </div>
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Revenue</span>
                    <span className="text-3xl font-black text-[#2B2D42] mt-2">Rs {salesData.metrics.week.revenue.toFixed(2)}</span>
                    <span className="text-xs text-slate-500 mt-1">{salesData.metrics.week.count} orders (last 7 days)</span>
                  </div>
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</span>
                    <span className="text-3xl font-black text-[#2B2D42] mt-2">Rs {salesData.metrics.month.revenue.toFixed(2)}</span>
                    <span className="text-xs text-slate-500 mt-1">{salesData.metrics.month.count} orders (last 30 days)</span>
                  </div>
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All-Time Count</span>
                    <span className="text-3xl font-black text-slate-700 mt-2">{salesData.metrics.allTimeCompletedCount}</span>
                    <span className="text-xs text-slate-500 mt-1">Total completed checks</span>
                  </div>
                </div>

                {/* Top Items List */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] max-w-md">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[#2B2D42] mb-4">Top 5 Best Selling Items</h3>
                  <ul className="flex flex-col gap-3">
                    {salesData.topItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="font-semibold text-slate-650 flex items-center gap-2">
                          <span className="w-5 h-5 bg-red-50 text-[#E63946] text-xs font-bold rounded flex items-center justify-center">{idx + 1}</span>
                          {item.name}
                        </span>
                        <span className="font-bold bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-lg text-xs">
                          {item.quantity} sold • Rs {item.revenue ? item.revenue.toFixed(2) : '0.00'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 4: QR CODE STAND GENERATION               */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'qr' && (
          <div className="animate-fade-in max-w-4xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D42]">QR Code Generator</h2>
                <p className="text-slate-500 text-sm mt-1">Print table stands for custom ordering links</p>
              </div>
              <button
                onClick={printAllQrs}
                className="flex items-center gap-1.5 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-colors"
              >
                <Printer size={16} /> Print All QR Stands
              </button>
            </div>

            <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Total Restaurant Tables</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tableCount}
                  onChange={(e) => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none mb-6"
                />
                
                <h3 className="font-bold text-sm text-[#2B2D42] mb-3">Individual Tables</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: tableCount }, (_, i) => i + 1).map(num => (
                    <div key={num} className="border border-slate-150 rounded-xl p-3 flex justify-between items-center bg-slate-50/50">
                      <span className="font-bold text-xs">Table {num}</span>
                      <button
                        onClick={() => printSingleQr(num)}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:border-[#E63946] text-[#E63946] hover:bg-red-50/30 transition-all"
                        title="Print table QR"
                      >
                        <Printer size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D42]">Staff Credentials</h2>
                <p className="text-slate-500 text-sm mt-1">Manage kitchen and sales terminal logins</p>
              </div>
              <button
                onClick={openAddStaffModal}
                className="flex items-center gap-2 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-[#E63946]/20 transition-colors"
              >
                <Plus size={16} /> Create Staff Login
              </button>
            </div>

            {/* Terminal Launchpad Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-base font-bold text-[#2B2D42] mb-1">Terminal Launchpad</h3>
                <p className="text-slate-500 text-xs max-w-xl leading-relaxed">
                  Ready to open a staff terminal? Click below to launch the Kitchen KDS or Sales screen. 
                  <strong> Note:</strong> This will sign you out of the Admin panel so you can enter the credentials generated below.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => handleLaunchTerminal('kitchen')}
                  className="px-4 py-2 bg-[#2B2D42] hover:bg-[#2B2D42]/90 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  Launch Kitchen Screen
                </button>
                <button
                  onClick={() => handleLaunchTerminal('sales')}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-[#2B2D42] font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  Launch Sales Screen
                </button>
              </div>
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
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                staff.role === 'kitchen_staff'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : staff.role === 'rider'
                                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                {staff.role === 'kitchen_staff' 
                                  ? '🍳 Kitchen (KDS)' 
                                  : staff.role === 'rider' 
                                  ? '🚴 Delivery Rider' 
                                  : '💵 Sales Terminal'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleStaffActive(staff)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                                  staff.is_active
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
              <p className="text-slate-500 text-sm mt-1">Configure your restaurant profile, logo, contact details, tax rate, and service fees</p>
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
                ⚠️ {staffError}
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
                    <option value="kitchen_staff">🍳 Kitchen Display (KDS)</option>
                    <option value="sales_staff">💵 Sales Terminal</option>
                    <option value="rider">🚴 Delivery Rider</option>
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
    </div>
  );
}
