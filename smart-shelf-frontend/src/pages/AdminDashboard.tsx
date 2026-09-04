import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import client from '../api/client';
import {
  Plus,
  Download,
  AlertTriangle,
  Tag,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  UserPlus,
  Users,
  Calendar,
  Package,
  Search,
  Trash2,
  QrCode,
  LayoutDashboard,
  Sparkles,
  X
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  category: number;
  category_name: string;
  manufacturing_date: string;
  expiry_date: string;
  price: string;
  stock_quantity: number;
  status: 'active' | 'expired' | 'cleared';
  total_sold?: number;
  qr_code_id: string;
  created_at: string;
}

interface ExpiryPrediction {
  product_id: number;
  product_name: string;
  category_name: string;
  stock_quantity: number;
  days_until_expiry: number;
  sales_speed: number;
  price: string;
  risk_score: number;
  risk_level: 'High' | 'Medium' | 'Low';
  suggested_action: 'discount' | 'feature it' | 'just monitor';
  suggested_discount_percent?: number;
  discounted_price?: number;
}

interface StaffUser {
  id: number;
  username: string;
  name: string;
  is_active: boolean;
  date_created: string;
}

export const AdminDashboard: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [predictions, setPredictions] = useState<ExpiryPrediction[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);

  // Product form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | 'NEW' | ''>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');

  // Refs for interactive calendar pickers
  const mfgInputRef = useRef<HTMLInputElement>(null);
  const expInputRef = useRef<HTMLInputElement>(null);

  // Staff form state
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffSuccessMsg, setStaffSuccessMsg] = useState<string | null>(null);
  const [staffErrorMsg, setStaffErrorMsg] = useState<string | null>(null);
  const [staffLoading, setStaffLoading] = useState(false);

  const [newlyCreatedProduct, setNewlyCreatedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ML retraining state
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  // Modal State for Viewing QR Code
  const [viewingQrProduct, setViewingQrProduct] = useState<Product | null>(null);

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const qrContainerRef = useRef<HTMLDivElement>(null);
  const modalQrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [catRes, prodRes, predRes, staffRes] = await Promise.all([
        client.get('/categories/'),
        client.get('/products/'),
        client.get('/predictions/near-expiry-risk/'),
        client.get('/admin/staff/'),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      setPredictions(predRes.data);
      setStaffList(staffRes.data);
    } catch (err) {
      console.error('Failed to load initial admin data', err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const payload: any = {
        name,
        manufacturing_date: manufacturingDate,
        expiry_date: expiryDate,
        price,
        stock_quantity: parseInt(stockQuantity, 10),
      };

      if (isCustomCategory) {
        payload.new_category_name = newCategoryName;
      } else {
        payload.category = categoryId;
      }

      const res = await client.post('/products/', payload);
      const createdProd: Product = res.data;

      setNewlyCreatedProduct(createdProd);
      setProducts([createdProd, ...products]);
      setSuccessMsg(`Product "${createdProd.name}" created successfully with QR code!`);

      setName('');
      setCategoryId('');
      setNewCategoryName('');
      setIsCustomCategory(false);
      setManufacturingDate('');
      setExpiryDate('');
      setPrice('');
      setStockQuantity('');

      const [catRes, predRes] = await Promise.all([
        client.get('/categories/'),
        client.get('/predictions/near-expiry-risk/'),
      ]);
      setCategories(catRes.data);
      setPredictions(predRes.data);
    } catch (err: any) {
      if (err.response?.data) {
        const data = err.response.data;
        const msg = typeof data === 'object' ? JSON.stringify(data) : 'Failed to create product.';
        setError(msg);
      } else {
        setError('Network error or server error while creating product.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await client.delete(`/products/${id}/`);
      setProducts(products.filter((p) => p.id !== id));
      if (newlyCreatedProduct?.id === id) {
        setNewlyCreatedProduct(null);
      }
    } catch (err) {
      alert('Failed to delete product.');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffErrorMsg(null);
    setStaffSuccessMsg(null);
    setStaffLoading(true);

    try {
      const res = await client.post('/admin/staff/', {
        username: staffUsername,
        password: staffPassword,
        name: staffName,
      });

      setStaffSuccessMsg(`Staff account "${res.data.username}" created!`);
      setStaffUsername('');
      setStaffPassword('');
      setStaffName('');

      const staffRes = await client.get('/admin/staff/');
      setStaffList(staffRes.data);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setStaffErrorMsg(err.response.data.detail);
      } else if (err.response?.data?.username) {
        setStaffErrorMsg(`Username: ${err.response.data.username[0]}`);
      } else {
        setStaffErrorMsg('Failed to create staff account.');
      }
    } finally {
      setStaffLoading(false);
    }
  };

  const handleToggleStaffStatus = async (staffId: number, currentStatus: boolean) => {
    try {
      await client.patch(`/admin/staff/${staffId}/`, {
        is_active: !currentStatus,
      });
      setStaffList(
        staffList.map((s) => (s.id === staffId ? { ...s, is_active: !currentStatus } : s))
      );
    } catch (err) {
      alert('Failed to update staff status.');
    }
  };

  const handleRetrainModel = async () => {
    setRetrainLoading(true);
    setRetrainMsg(null);
    try {
      const res = await client.post('/predictions/near-expiry-risk/', { action: 'retrain' });
      setRetrainMsg(res.data.detail || 'Model retrained successfully!');
      const predRes = await client.get('/predictions/near-expiry-risk/');
      setPredictions(predRes.data);
    } catch (err) {
      setRetrainMsg('Failed to retrain model. Please try again.');
    } finally {
      setRetrainLoading(false);
    }
  };

  const handleMarkCleared = async (productId: number) => {
    try {
      const res = await client.post(`/products/${productId}/mark_cleared/`);
      setSuccessMsg(res.data.detail || 'Product marked as cleared.');
      fetchInitialData();
    } catch (err: any) {
      setError('Failed to mark product as cleared.');
    }
  };

  const downloadQRCode = () => {
    if (!qrContainerRef.current) return;
    const svgElement = qrContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${newlyCreatedProduct?.name || 'Product'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const downloadModalQRCode = () => {
    if (!modalQrContainerRef.current || !viewingQrProduct) return;
    const svgElement = modalQrContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${viewingQrProduct.name}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const isNearExpiry = (expDateStr: string) => {
    const exp = new Date(expDateStr);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = filterCategory === 'ALL' || p.category_name === filterCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.qr_code_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeProducts = filteredProducts.filter((p) => p.status !== 'expired' && p.status !== 'cleared');
  const expiredProducts = products.filter((p) => p.status === 'expired' || p.status === 'cleared');

  // AI Discount recommendations apply ONLY to active, unexpired products with 1 to 7 days left before expiry
  const activeHighRiskPredictions = predictions.filter(
    (p) => p.risk_level === 'High' && p.days_until_expiry >= 1 && p.days_until_expiry <= 7 && p.stock_quantity > 0
  );
  const highRiskCount = activeHighRiskPredictions.length;
  const totalStockCount = activeProducts.reduce((acc, p) => acc + p.stock_quantity, 0);
  const totalSoldUnits = products.reduce((acc, p) => acc + (p.total_sold || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <span>Supermarket Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Admin Control Center</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRetrainModel}
              disabled={retrainLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 text-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${retrainLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{retrainLoading ? 'Retraining ML Model...' : 'Retrain AI Risk Model'}</span>
            </button>
          </div>
        </div>

        {retrainMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm font-bold shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>{retrainMsg}</span>
            </div>
            <button onClick={() => setRetrainMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Active Products</span>
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">{products.length}</div>
            <div className="text-xs text-slate-500 font-medium">Catalog Items</div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Available Stock</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono">{totalStockCount} units</div>
            <div className="text-xs text-slate-500 font-medium">In Supermarket Inventory</div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Units Sold</span>
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600 font-mono">{totalSoldUnits} units</div>
            <div className="text-xs text-slate-500 font-medium">Tracked Sales Volume</div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>High Expiry Risk (≤ 7 Days)</span>
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-3xl font-black text-rose-600 font-mono">{highRiskCount}</div>
            <div className="text-xs text-rose-600 font-bold">Predicted by ML Model</div>
          </div>
        </div>

        {/* High Expiry Risk & AI Discount Recommendations Section */}
        <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">High Expiry Risk Products & AI Discount Recommendations</h2>
                <p className="text-xs text-slate-500 font-medium">Items predicted by Machine Learning to expire within 7 days before selling out</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 self-start sm:self-auto">
              {activeHighRiskPredictions.length} High Risk Items
            </span>
          </div>

          {activeHighRiskPredictions.length === 0 ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>All store products are currently healthy! No high-risk items requiring discount clearance.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeHighRiskPredictions.map((item) => {
                const discount = item.suggested_discount_percent || (item.days_until_expiry <= 3 ? 50 : item.days_until_expiry <= 7 ? 30 : 20);
                const originalPrice = parseFloat(item.price);
                const discountPrice = item.discounted_price || (originalPrice * (1 - discount / 100)).toFixed(2);

                return (
                  <div key={item.product_id} className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5 space-y-4 shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded border border-rose-200">
                          {item.category_name}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1.5">{item.product_name}</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-600 text-white font-black text-xs rounded-xl shadow-xs shrink-0">
                        {discount}% OFF
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-white p-3 rounded-xl border border-rose-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Days to Expiry</span>
                        <span className="font-extrabold text-rose-600 text-sm">⏳ {item.days_until_expiry} Days Left</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Stock Left</span>
                        <span className="font-extrabold text-slate-800 text-sm">📦 {item.stock_quantity} Units</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-rose-200/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Price Breakdown</span>
                        <div className="flex items-center gap-2">
                          <span className="line-through text-slate-400 font-bold">₹{item.price}</span>
                          <span className="text-emerald-700 font-mono font-black text-base">₹{discountPrice}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Risk Score</span>
                        <span className="font-extrabold text-rose-600">{Math.round(item.risk_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Creation & QR Generator Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Plus className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-black text-slate-900">Add New Supermarket Product</h2>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Organic Milk 1L"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isCustomCategory;
                        setIsCustomCategory(nextState);
                        if (nextState) {
                          setCategoryId('NEW');
                        } else {
                          setCategoryId('');
                          setNewCategoryName('');
                        }
                      }}
                      className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                    >
                      {isCustomCategory ? '← Select Existing' : '+ Enter New Category'}
                    </button>
                  </div>

                  {!isCustomCategory ? (
                    <select
                      required={!isCustomCategory}
                      value={categoryId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'NEW') {
                          setIsCustomCategory(true);
                          setCategoryId('NEW');
                        } else {
                          setCategoryId(val === '' ? '' : Number(val));
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="NEW" className="text-emerald-700 font-bold">+ Enter New Category...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required={isCustomCategory}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Beverages, Organic, Frozen Foods"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-emerald-400 rounded-xl text-slate-900 text-sm font-medium focus:outline-none transition"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Mfg Date *
                  </label>
                  <div className="relative">
                    <input
                      ref={mfgInputRef}
                      type="date"
                      required
                      value={manufacturingDate}
                      onChange={(e) => setManufacturingDate(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                    />
                    <div className="absolute right-3 top-3 text-emerald-600 pointer-events-none">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Expiry Date *
                  </label>
                  <div className="relative">
                    <input
                      ref={expInputRef}
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                    />
                    <div className="absolute right-3 top-3 text-emerald-600 pointer-events-none">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 250.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2 shadow-lg shadow-emerald-600/20"
              >
                {loading ? 'Creating Product...' : 'Create Product & Assign QR'}
              </button>
            </form>
          </div>

          {/* QR Code Display & Download Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between items-center text-center">
            <h2 className="text-lg font-black text-slate-900 w-full text-left mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-600" />
              <span>Generated QR Code</span>
            </h2>

            {newlyCreatedProduct ? (
              <div className="space-y-6 w-full flex flex-col items-center my-auto">
                <div
                  ref={qrContainerRef}
                  className="p-4 bg-white rounded-3xl shadow-xl border-4 border-emerald-500 inline-block"
                >
                  <QRCodeSVG value={newlyCreatedProduct.qr_code_id} size={180} level="H" includeMargin={true} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">{newlyCreatedProduct.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">QR UUID: <span className="font-mono text-emerald-700 font-bold">{newlyCreatedProduct.qr_code_id}</span></p>
                  <p className="text-xs text-slate-500 font-medium">Expires: <span className="text-slate-900 font-bold">{newlyCreatedProduct.expiry_date}</span></p>
                </div>

                <button
                  onClick={downloadQRCode}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-emerald-800 font-extrabold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition text-sm shadow-sm"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Download PNG QR Code</span>
                </button>
              </div>
            ) : (
              <div className="my-auto py-12 text-slate-400 text-sm space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Tag className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-medium text-slate-500">Add a product above to generate & download its QR code.</p>
              </div>
            )}
          </div>
        </div>

        {/* All Store Inventory Table Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-black text-slate-900">All Store Products ({filteredProducts.length})</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
                />
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Product Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Stock Available</th>
                  <th className="px-4 py-3.5">Units Sold</th>
                  <th className="px-4 py-3.5">Mfg Date</th>
                  <th className="px-4 py-3.5">Expiry Date</th>
                  <th className="px-4 py-3.5">QR Code</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-medium text-sm">
                      No active products found in store catalog!
                    </td>
                  </tr>
                ) : (
                  activeProducts.map((prod) => {
                    const isExp = isNearExpiry(prod.expiry_date);
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{prod.name}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                            {prod.category_name || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-black text-emerald-700">₹{prod.price}</td>
                        <td className="px-4 py-3.5">
                          <span className={prod.stock_quantity <= 5 ? 'text-rose-600 font-black' : 'text-slate-800 font-bold'}>
                            {prod.stock_quantity} units
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-black text-amber-600">
                          {prod.total_sold ?? 0} sold
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">{prod.manufacturing_date}</td>
                        <td className="px-4 py-3.5 font-medium">
                          <span className={isExp ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-800'}>
                            {isExp && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                            {prod.expiry_date}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setViewingQrProduct(prod)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1 transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>View QR</span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expired Products (Auditing & Clearance Records) Section */}
        <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h2 className="text-lg font-black text-slate-900">
                Expired Products & Clearance Audit ({expiredProducts.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Read-only history of expired inventory. Mark as cleared once discarded/donated.
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-rose-50 font-bold uppercase text-rose-900 border-b border-rose-200">
                <tr>
                  <th className="px-4 py-3.5">Product Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Stock Left</th>
                  <th className="px-4 py-3.5">Expiry Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Clearance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium text-sm">
                      No expired products recorded. All inventory items are active!
                    </td>
                  </tr>
                ) : (
                  expiredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{prod.name}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {prod.category_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">₹{prod.price}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{prod.stock_quantity} units</td>
                      <td className="px-4 py-3.5 text-rose-600 font-bold">{prod.expiry_date}</td>
                      <td className="px-4 py-3.5">
                        {prod.status === 'cleared' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                            Cleared (Discarded/Donated)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                            Expired (On Shelf)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {prod.status === 'expired' ? (
                          <button
                            onClick={() => handleMarkCleared(prod.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition"
                          >
                            Mark as Cleared
                          </button>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[11px]">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black text-slate-900">Manage Staff Accounts</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create Staff Form */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Create Staff Account</span>
              </h3>

              {staffErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {staffErrorMsg}
                </div>
              )}

              {staffSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                  {staffSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="e.g. staff_john"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={staffLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition shadow-md"
                >
                  {staffLoading ? 'Creating Account...' : 'Create Staff Member'}
                </button>
              </form>
            </div>

            {/* Staff List Table */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Existing Staff Accounts ({staffList.length})</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{staff.username}</td>
                        <td className="px-4 py-3">{staff.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              staff.is_active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {staff.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleStaffStatus(staff.id, staff.is_active)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                              staff.is_active
                                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {staff.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Inspection Modal */}
      {viewingQrProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-6 relative text-center">
            <button
              onClick={() => setViewingQrProduct(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900">Product QR Code</h3>

            <div
              ref={modalQrContainerRef}
              className="p-4 bg-white rounded-3xl shadow-xl border-4 border-emerald-500 inline-block"
            >
              <QRCodeSVG value={viewingQrProduct.qr_code_id} size={180} level="H" includeMargin={true} />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">{viewingQrProduct.name}</h4>
              <p className="text-xs text-slate-500 font-medium">QR UUID: <span className="font-mono text-emerald-700 font-bold">{viewingQrProduct.qr_code_id}</span></p>
              <p className="text-xs text-slate-500 font-medium">Price: <span className="font-mono text-emerald-700 font-bold">₹{viewingQrProduct.price}</span></p>
            </div>

            <button
              onClick={downloadModalQRCode}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG QR Code</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
