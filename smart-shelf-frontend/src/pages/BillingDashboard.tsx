import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode } from 'html5-qrcode';
import client from '../api/client';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Phone,
  Printer,
  X,
  Sparkles,
  Upload
} from 'lucide-react';

interface CartItem {
  qr_code_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  quantity: number;
}

interface BillResponse {
  purchase_id: number;
  customer: {
    id: number;
    phone_number: string;
    name: string;
  };
  staff_member: string;
  items: {
    product_id: number;
    product_name: string;
    qr_code_id: string;
    unit_price: string;
    quantity: number;
    line_total: string;
  }[];
  total_amount: string;
  created_at: string;
}

interface ProductCatalogItem {
  id: number;
  name: string;
  category: number;
  category_name: string;
  price: string;
  stock_quantity: number;
  status: string;
  qr_code_id: string;
  expiry_date: string;
}

export const BillingDashboard: React.FC = () => {
  const [manualQrInput, setManualQrInput] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<ProductCatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [finishedBill, setFinishedBill] = useState<BillResponse | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCatalogData();
    return () => {
      stopCameraScanner();
    };
  }, []);

  const fetchCatalogData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        client.get('/categories/'),
        client.get('/products/?status=active')
      ]);
      setCategories(catRes.data);
      setProductsCatalog(prodRes.data);
    } catch (e) {
      console.error('Failed to fetch catalog data', e);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping Html5Qrcode', e);
      }
      html5QrCodeRef.current = null;
    }

    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error clearing html5-qrcode scanner', err);
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const startCameraScanner = async () => {
    setError(null);
    setScanSuccessMsg(null);
    await stopCameraScanner();
    setScannerActive(true);

    setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        };

        html5QrCode
          .start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              handleQrCodeScanned(decodedText);
            },
            () => {}
          )
          .catch((err) => {
            console.warn('Camera start failed, falling back to Html5QrcodeScanner UI', err);
            const scanner = new Html5QrcodeScanner(
              'qr-reader',
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true,
                supportedScanTypes: [
                  Html5QrcodeScanType.SCAN_TYPE_CAMERA,
                  Html5QrcodeScanType.SCAN_TYPE_FILE,
                ],
              },
              false
            );

            scannerRef.current = scanner;
            scanner.render(
              (decodedText) => handleQrCodeScanned(decodedText),
              () => {}
            );
          });
      } catch (err: any) {
        console.error('Scanner init exception:', err);
        setError('Unable to access camera scanner. Please grant camera permission.');
        setScannerActive(false);
      }
    }, 200);
  };

  const toggleScanner = () => {
    if (scannerActive) {
      stopCameraScanner();
    } else {
      startCameraScanner();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanSuccessMsg(null);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-file-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleQrCodeScanned(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setError('Could not detect a valid product QR code in the uploaded image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [expiredModalMsg, setExpiredModalMsg] = useState<string | null>(null);

  const playWarningBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  };

  const handleQrCodeScanned = async (qrCodeId: string) => {
    const now = Date.now();
    if (
      lastScannedRef.current &&
      lastScannedRef.current.code === qrCodeId &&
      now - lastScannedRef.current.time < 2000
    ) {
      return;
    }
    lastScannedRef.current = { code: qrCodeId, time: now };

    setError(null);
    setScanSuccessMsg(null);

    try {
      const res = await client.get(`/billing/lookup/?qr_code_id=${encodeURIComponent(qrCodeId)}`);
      const product = res.data;
      addProductToCart(product);
      setScanSuccessMsg(`Scanned: ${product.name} (₹${product.price})`);
    } catch (err: any) {
      setScanSuccessMsg(null);
      const detail = err.response?.data?.detail || `Product with QR code "${qrCodeId}" not found.`;
      setError(detail);
      if (detail.toLowerCase().includes('expired')) {
        playWarningBeep();
        setExpiredModalMsg(detail);
      }
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQrInput.trim()) return;

    setError(null);
    setScanSuccessMsg(null);

    try {
      const res = await client.get(
        `/billing/lookup/?qr_code_id=${encodeURIComponent(manualQrInput.trim())}`
      );
      const product = res.data;
      addProductToCart(product);
      setManualQrInput('');
      setScanSuccessMsg(`Added: ${product.name}`);
    } catch (err: any) {
      setScanSuccessMsg(null);
      const detail = err.response?.data?.detail || `Product with QR Code / ID "${manualQrInput}" not found.`;
      setError(detail);
      if (detail.toLowerCase().includes('expired')) {
        playWarningBeep();
        setExpiredModalMsg(detail);
      }
    }
  };

  const filteredCatalogProducts = productsCatalog.filter((p) => {
    if (!selectedCategory || selectedCategory === 'ALL') return true;
    return p.category_name === selectedCategory || String(p.category) === selectedCategory;
  });

  const handleSelectProductFromDropdown = (prod: ProductCatalogItem) => {
    setError(null);
    setScanSuccessMsg(null);

    const today = new Date().toISOString().split('T')[0];
    if (prod.status === 'expired' || (prod.expiry_date && prod.expiry_date < today)) {
      playWarningBeep();
      const detail = `This product (${prod.name}) has expired on ${prod.expiry_date} and cannot be sold.`;
      setError(detail);
      setExpiredModalMsg(detail);
      setSelectedProductId('');
      return;
    }

    if (prod.stock_quantity <= 0) {
      setError(`Product "${prod.name}" is out of stock.`);
      setSelectedProductId('');
      return;
    }

    addProductToCart({
      qr_code_id: prod.qr_code_id,
      name: prod.name,
      price: prod.price,
      stock_quantity: prod.stock_quantity,
    });
    setScanSuccessMsg(`Added: ${prod.name} (₹${prod.price})`);
    setSelectedProductId('');
  };

  const addProductToCart = (product: {
    qr_code_id: string;
    name: string;
    price: string | number;
    stock_quantity: number;
  }) => {
    const priceNum = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.qr_code_id === product.qr_code_id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setError(`Cannot add more ${product.name}. Stock limit is ${product.stock_quantity}.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.qr_code_id === product.qr_code_id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          qr_code_id: product.qr_code_id,
          name: product.name,
          price: priceNum,
          stock_quantity: product.stock_quantity,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (qrCodeId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.qr_code_id === qrCodeId) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock_quantity) {
              setError(`Maximum available stock for ${item.name} is ${item.stock_quantity}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (qrCodeId: string) => {
    setCart((prev) => prev.filter((item) => item.qr_code_id !== qrCodeId));
  };

  const cartGrandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty.');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Customer phone number is required for billing.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        customer_phone: customerPhone.trim(),
        customer_name: customerName.trim(),
        items: cart.map((item) => ({
          qr_code_id: item.qr_code_id,
          quantity: item.quantity,
        })),
      };

      const res = await client.post('/billing/checkout/', payload);
      setFinishedBill(res.data);
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Checkout transaction failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Staff Counter Terminal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Smart Billing & Checkout</h1>
          </div>
        </div>

        {error && (
          <div className={`p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 shadow-md transition border ${
            error.toLowerCase().includes('expired')
              ? 'bg-rose-600 text-white border-rose-700 ring-4 ring-rose-200 animate-pulse'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-6 h-6 shrink-0 ${error.toLowerCase().includes('expired') ? 'text-white' : 'text-rose-600'}`} />
              <div>
                {error.toLowerCase().includes('expired') && (
                  <div className="font-black text-xs uppercase tracking-widest text-rose-100">
                    ⛔ EXPIRED PRODUCT REJECTED
                  </div>
                )}
                <div className="text-sm font-extrabold">{error}</div>
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                setExpiredModalMsg(null);
              }}
              className={`p-1.5 rounded-xl transition ${
                error.toLowerCase().includes('expired')
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-rose-100 hover:bg-rose-200 text-rose-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {!error && scanSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold shadow-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{scanSuccessMsg}</span>
          </div>
        )}

        {/* Expired Product Modal Overlay */}
        {expiredModalMsg && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border-4 border-rose-600 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="w-20 h-20 bg-rose-100 border-4 border-rose-300 rounded-full flex items-center justify-center mx-auto text-rose-600 animate-bounce">
                <AlertCircle className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-full">
                  ⛔ EXPIRED ITEM REJECTED
                </span>
                <h2 className="text-2xl font-black text-slate-900 pt-2">Product Cannot Be Sold!</h2>
                <p className="text-rose-700 font-extrabold text-base bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                  {expiredModalMsg}
                </p>
              </div>

              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Store safety policy strictly forbids scanning or selling expired inventory. Please immediately remove this item from the customer counter and hand it to store management for clearance.
              </p>

              <button
                onClick={() => {
                  setExpiredModalMsg(null);
                  setError(null);
                }}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                <span>Dismiss & Continue Scanning</span>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QR Scanner & Manual Lookup Panel */}
          <div className="space-y-6">
            {/* Camera & File QR Scanner Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <span>QR Code Scanner</span>
                </h2>
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-200">
                  Live Stream
                </span>
              </div>

              {/* Camera Scanner Toggle */}
              <button
                onClick={toggleScanner}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md ${
                  scannerActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{scannerActive ? 'Close Camera Scanner' : 'Start Camera Scanner'}</span>
              </button>

              {/* Permission Note */}
              {scannerActive && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    If you see <strong>Permission Denied</strong>: Click the site settings icon next to <code>localhost:5174</code> in your address bar and set <strong>Camera</strong> to <strong>Allow</strong>.
                  </span>
                </div>
              )}

              {/* Hidden div for file scanning */}
              <div id="qr-reader-file-temp" className="hidden" />

              {/* WebCam Stream Container */}
              <div
                id="qr-reader"
                className={`w-full ${scannerActive ? 'block' : 'hidden'} rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 shadow-inner p-2`}
              />

              {/* Upload QR Code Image Option */}
              <div className="pt-2 border-t border-slate-100">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Upload QR Image File</span>
                </button>
              </div>
            </div>

            {/* Manual Product & Category Lookup */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Manual Product & Category Lookup</span>
              </h2>

              {/* Step 1: Category Filter Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  1. Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedProductId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:border-emerald-500 outline-none transition"
                >
                  <option value="ALL">📦 All Categories ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Product Select Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  2. Select Product to Add ({filteredCatalogProducts.length})
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    if (e.target.value) {
                      const prod = productsCatalog.find((p) => String(p.id) === e.target.value);
                      if (prod) {
                        handleSelectProductFromDropdown(prod);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:border-emerald-500 outline-none transition"
                >
                  <option value="">-- Choose item to add to cart --</option>
                  {filteredCatalogProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (₹{prod.price}) - Stock: {prod.stock_quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center py-1">
                <div className="grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-400">OR SEARCH BY UUID CODE</span>
                <div className="grow border-t border-slate-200" />
              </div>

              {/* Step 3: Raw UUID Code Input */}
              <form onSubmit={handleManualSearch} className="space-y-3">
                <input
                  type="text"
                  value={manualQrInput}
                  onChange={(e) => setManualQrInput(e.target.value)}
                  placeholder="Paste or enter product UUID QR code"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:border-emerald-500 outline-none font-mono font-bold"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                >
                  <Search className="w-4 h-4" />
                  <span>Lookup UUID Code</span>
                </button>
              </form>
            </div>
          </div>

          {/* Running Cart & Customer Billing Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <span>Current Cart ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                </h2>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-rose-600 hover:underline font-bold">
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Cart Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Item</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Qty</th>
                      <th className="py-3.5 px-4">Line Total</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          Cart is empty. Scan product QR codes or enter UUID to add items.
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.qr_code_id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{item.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{item.qr_code_id}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">₹{item.price.toFixed(2)}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.qr_code_id, -1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-800 font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-slate-900 px-1.5">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.qr_code_id, 1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-800 font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => removeFromCart(item.qr_code_id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cart Footer & Customer Inputs */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-6">
                <div className="flex justify-between items-center text-xl font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700 text-2xl font-black">₹{cartGrandTotal.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Customer Phone <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:border-emerald-500 outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:border-emerald-500 outline-none shadow-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xl shadow-emerald-600/20 text-base"
                >
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>{loading ? 'Processing Checkout...' : 'Generate Bill & Complete Purchase'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Finished Bill Invoice Modal */}
        {finishedBill && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-6 relative animate-in fade-in duration-200">
              <button
                onClick={() => setFinishedBill(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Purchase Invoice #{finishedBill.purchase_id}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Smart Shelf Official Bill Receipt</p>

                <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs">
                  <span className="text-base">💬</span>
                  <span>Bill sent to WhatsApp ({finishedBill.customer.phone_number})</span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Customer Phone:</span>
                  <span className="font-bold text-slate-900">{finishedBill.customer.phone_number}</span>
                </div>
                {finishedBill.customer.name && (
                  <div className="flex justify-between text-slate-600">
                    <span>Customer Name:</span>
                    <span className="font-bold text-slate-900">{finishedBill.customer.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Staff Member:</span>
                  <span className="font-bold text-slate-900">{finishedBill.staff_member}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Date & Time:</span>
                  <span className="text-slate-500 font-medium">{new Date(finishedBill.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border-t border-b border-slate-100 py-3 space-y-2 max-h-48 overflow-y-auto">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purchased Items</div>
                {finishedBill.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-xs text-slate-800">
                    <span>
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-mono font-bold">₹{item.line_total}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-lg font-black text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono text-emerald-700 text-2xl font-black">₹{finishedBill.total_amount}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setFinishedBill(null)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition shadow-md"
                >
                  Close Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
