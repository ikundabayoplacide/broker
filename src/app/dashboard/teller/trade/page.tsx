"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import { useAuth } from "@/hooks/useAuth";
import axios from "@/lib/axios";
import { TrendingUp, Activity, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";

type OrderType = "buy" | "sell";

interface Security {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  high: number;
  low: number;
  bid: number;
  ask: number;
  source: "rse" | "database";
  sector?: string;
  availableShares?: string;
  sharePrice?: number;
  closingPrice?: number;
  priceChange?: number;
}

export default function TradePage() {
  const { user } = useAuth();
  const [orderType, setOrderType] = useState<OrderType>("buy");
  const [selectedSecurity, setSelectedSecurity] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [securities, setSecurities] = useState<Security[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [tradeStats, setTradeStats] = useState({
    walletBalance: 0,
    buyingPower: 0,
    openOrders: 0,
    todayTrades: 0,
  });
  const [recentTrades, setRecentTrades] = useState<Array<{
    id: string;
    type: string;
    status: string;
    quantity: number;
    executedPrice: string;
    totalAmount: string;
    createdAt: string;
    company: { name: string; symbol: string };
  }>>([]);
  const [marketStatus, setMarketStatus] = useState<{
    label: string;
    isOpen: boolean;
  } | null>(null);

  const { token } = useAuth();

  // Fetch securities and trade stats from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch securities
        const securitiesRes = await fetch("/api/securities");
        if (!securitiesRes.ok) throw new Error("Failed to fetch securities");
        const securitiesData = await securitiesRes.json();
        setSecurities(securitiesData.data || []);
        if (securitiesData.data && securitiesData.data.length > 0) {
          setSelectedSecurity(securitiesData.data[0].symbol);
        }

        // Fetch market status
        try {
          const marketRes = await fetch("/api/market-summary");
          if (marketRes.ok) {
            const marketData = await marketRes.json();
            if (marketData.marketStatus) {
              setMarketStatus({
                label: marketData.marketStatus.label,
                isOpen: marketData.marketStatus.isOpen,
              });
            }
          }
        } catch (err) {
          console.error("Error fetching market status:", err);
        }

        // Fetch wallet data
        const walletData = await axios.get(`${apiPrefix}/wallet`, { headers: { Authorization: `Bearer ${token}` } }) as { wallet: { balance: string; availableBalance: string } };
        const walletBalance = parseFloat(walletData.wallet?.balance || "0");
        const buyingPower = parseFloat(walletData.wallet?.availableBalance || "0");

        // Fetch trades
        let todayTrades = 0;
        let openOrders = 0;
        try {
          const tradesData = await axios.get(`${apiPrefix}/trade/history?limit=100`, { headers: { Authorization: `Bearer ${token}` } }) as { trades: Array<{ id: string; type: string; status: string; quantity: number; executedPrice: string; totalAmount: string; createdAt: string; company: { name: string; symbol: string } }> };
          const trades = tradesData.trades || [];
          const today = new Date().toDateString();
          todayTrades = trades.filter((t) => 
            new Date(t.createdAt).toDateString() === today
          ).length;
          openOrders = trades.filter((t) => t.status === "PENDING").length;
          setRecentTrades(trades.slice(0, 5));
        } catch (tradeErr) {
          console.error("Error fetching trades:", tradeErr);
        }

        setTradeStats({
          walletBalance,
          buyingPower,
          openOrders,
          todayTrades,
        });
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
        setSecurities([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  // Validate quantity is multiple of 100
  const validateQuantity = (value: string) => {
    const qty = Number.parseInt(value, 10);
    if (value && qty % 100 !== 0) {
      setQuantityError("Quantity must be in multiples of 100 (100, 200, 300, etc.)");
      return false;
    }
    setQuantityError("");
    return true;
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuantity(value);
    validateQuantity(value);
  };

  const { displayName, email, isCompany, apiPrefix } = useMemo(() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "Client";
    const role = user?.role?.toLowerCase();
    const isCompany = role === "company";
    
    console.log('=== TELLER TRADE PAGE DEBUG ===');
    console.log('User object:', user);
    console.log('User role:', user?.role);
    console.log('Role lowercase:', role);
    console.log('Is company:', isCompany);
    console.log('===============================');
    
    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      isCompany,
      apiPrefix: isCompany ? "/company" : "",
    };
  }, [user?.email, user?.fullName, user?.role]);

  const filteredSecurities = securities.filter(
    (sec) =>
      sec.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSecurity = securities.find((s) => s.symbol === selectedSecurity) || securities[0] || {
    symbol: "",
    name: "No securities available",
    price: 0,
    change: 0,
    volume: "0",
    high: 0,
    low: 0,
    bid: 0,
    ask: 0,
    source: "database" as const,
  };

  const estimatedTotal = useMemo(() => {
    const qty = Number.parseInt(quantity, 10) || 0;
    const price = currentSecurity.price;
    return qty * price;
  }, [quantity, currentSecurity.price]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSecurity || !quantity) {
      return;
    }

    // Only allow buy orders for now
    if (orderType === "sell") {
      setToast({
        show: true,
        message: "Sell functionality is not yet available. Coming soon!",
        type: "error",
      });
      setTimeout(() => {
        setToast({ show: false, message: "", type: "error" });
      }, 5000);
      return;
    }

    setProcessing(true);
    
    try {
      const response = await fetch(`/api${apiPrefix}/trade/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companySymbol: selectedSecurity,
          quantity: Number.parseInt(quantity, 10),
          priceType: "MARKET",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute trade");
      }

      // Show success message
      setToast({
        show: true,
        message: data.message || `Successfully purchased ${quantity} shares`,
        type: "success",
      });

      // Reset form
      setQuantity("");
      setQuantityError("");

      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setToast({ show: false, message: "", type: "success" });
      }, 5000);

      // Refresh securities data
      const securitiesResponse = await fetch("/api/securities");
      if (securitiesResponse.ok) {
        const securitiesData = await securitiesResponse.json();
        setSecurities(securitiesData.data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute trade";
      setToast({
        show: true,
        message: errorMessage,
        type: "error",
      });

      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setToast({ show: false, message: "", type: "error" });
      }, 5000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout userName={displayName} userEmail={email}>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Trading Desk</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">Execute trades and monitor live market data</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-3 md:p-4" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-600">Wallet Balance</p>
                <p className="text-base md:text-xl font-bold text-slate-900">Rwf {tradeStats.walletBalance.toLocaleString()}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 md:p-4" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-600">Buying Power</p>
                <p className="text-base md:text-xl font-bold text-slate-900">Rwf {tradeStats.buyingPower.toLocaleString()}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 md:p-4" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-600">Open Orders</p>
                <p className="text-base md:text-xl font-bold text-slate-900">{tradeStats.openOrders}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 md:p-4" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-600">Today&apos;s Trades</p>
                <p className="text-base md:text-xl font-bold text-slate-900">{tradeStats.todayTrades}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading securities...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-4">
            <p className="text-rose-700 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Trading Form */}
          <Card className="p-4 md:p-6 lg:col-span-2" hover={false}>
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Place Order</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">Execute a buy or sell order</p>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4 md:space-y-6">
              {/* Order Type Toggle */}
              <div className="flex gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("buy")}
                  className={`flex-1 py-2.5 md:py-3 px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all ${
                    orderType === "buy"
                      ? "bg-emerald-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("sell")}
                  className={`flex-1 py-2.5 md:py-3 px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all ${
                    orderType === "sell"
                      ? "bg-rose-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Security Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Security
                </label>
                <select
                  value={selectedSecurity}
                  onChange={(e) => setSelectedSecurity(e.target.value)}
                  className="w-full rounded-lg md:rounded-xl border border-slate-300 px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-slate-900 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
                >
                  {securities.map((sec) => (
                    <option key={sec.symbol} value={sec.symbol}>
                      {sec.symbol} - {sec.name} (Rwf {sec.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Security Details Card */}
              {currentSecurity.symbol && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 md:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Security Details</h3>
                    {marketStatus && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        marketStatus.isOpen 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {marketStatus.isOpen ? "● Market Open" : "● Market Closed"}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Symbol</p>
                      <p className="text-base font-bold text-slate-900">{currentSecurity.symbol}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Available Shares</p>
                      <p className="text-base font-bold text-slate-900">{currentSecurity.availableShares ? Number(currentSecurity.availableShares).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Share Price</p>
                      <p className="text-base font-bold text-slate-900">Rwf {currentSecurity.sharePrice?.toFixed(2) || currentSecurity.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Closing Price</p>
                      <p className="text-base font-bold text-slate-900">Rwf {currentSecurity.closingPrice?.toFixed(2) || currentSecurity.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Price Change</p>
                      <p className={`text-base font-bold ${
                        (currentSecurity.priceChange || currentSecurity.change) >= 0 
                          ? "text-emerald-600" 
                          : "text-rose-600"
                      }`}>
                        {(currentSecurity.priceChange || currentSecurity.change) >= 0 ? '+' : ''}{(currentSecurity.priceChange || currentSecurity.change).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <InputField
                  name="quantity"
                  label="Quantity (Shares - Multiples of 100)"
                  type="number"
                  placeholder="Enter number of shares"
                  value={quantity}
                  onChange={handleQuantityChange}
                />
                {quantityError && (
                  <p className="mt-1 text-xs text-rose-600">{quantityError}</p>
                )}
                
                {/* Quick Quantity Buttons */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <p className="w-full text-xs text-slate-600 mb-1">Quick select:</p>
                  {[100, 200, 300, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => {
                        setQuantity(qty.toString());
                        setQuantityError("");
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        quantity === qty.toString()
                          ? "bg-[#004B5B] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-[#004B5B] hover:text-white"
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="rounded-xl md:rounded-2xl bg-slate-50 p-3 md:p-4 space-y-2 md:space-y-3">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-slate-600">Market Price</span>
                  <span className="font-semibold text-slate-900">Rwf {currentSecurity.price}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-slate-600">Quantity</span>
                  <span className="font-semibold text-slate-900">{quantity || 0} shares</span>
                </div>
                <div className="pt-2 md:pt-3 border-t border-slate-200 flex justify-between text-base md:text-lg">
                  <span className="font-semibold text-slate-700">Total Amount</span>
                  <span className="font-bold text-slate-900">Rwf {estimatedTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Rwanda Trading Rules Info */}
              <div className="rounded-lg md:rounded-xl bg-blue-50 border border-blue-200 p-3 md:p-4">
                <div className="flex gap-2 md:gap-3">
                  <div className="shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-xs md:text-sm text-blue-900">
                    <p className="font-semibold mb-1">Stock Rules</p>
                    <p className="text-blue-700">
                      Shares must be traded in multiples of 100 only (100, 200, 300, 400, 500, etc.). 
                      Minimum order size is 100 shares.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 md:gap-3">
                <Button
                  type="submit"
                  className={`flex-1 text-sm md:text-base ${
                    orderType === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
                  }`}
                  disabled={!quantity || quantityError !== "" || processing || !currentSecurity.symbol}
                >
                  {processing ? "Processing..." : (orderType === "buy" ? "Place Buy Order" : "Place Sell Order")}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-4 md:px-6 text-sm md:text-base hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                  onClick={() => {
                    setQuantity("");
                    setQuantityError("");
                  }}
                >
                  Reset
                </Button>
              </div>

              {/* Quick Links */}
              <div className="pt-3 md:pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2 md:gap-3">
                <Link
                  href="/forms/PurchaseOrderForm"
                  className="text-xs md:text-sm text-[#004B5B] hover:underline font-medium"
                >
                  Advanced Buy Form →
                </Link>
                <Link
                  href="/forms/SaleOrderForm"
                  className="text-xs md:text-sm text-[#004B5B] hover:underline font-medium"
                >
                  Advanced Sell Form →
                </Link>
              </div>
            </form>
          </Card>

          {/* Market Watch */}
          <Card className="p-4 md:p-6" hover={false}>
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Market Watch</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">Live securities prices</p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search securities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-slate-200 text-sm focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
              />
            </div>

            {/* Securities List */}
            <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto">
              {filteredSecurities.map((sec) => (
                <button
                  key={sec.symbol}
                  onClick={() => setSelectedSecurity(sec.symbol)}
                  className={`w-full text-left p-2.5 md:p-3 rounded-lg md:rounded-xl border transition-all ${
                    selectedSecurity === sec.symbol
                      ? "border-[#004B5B] bg-[#004B5B]/5"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <div>
                      <p className="text-sm md:text-base font-semibold text-slate-900">{sec.symbol}</p>
                      <p className="text-xs text-slate-500 truncate">{sec.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm md:text-base font-bold text-slate-900">Rwf {sec.price}</p>
                      <div className={`flex items-center gap-1 text-xs font-semibold ${
                        sec.change >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {sec.change >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        <span>{sec.change >= 0 ? "+" : ""}{sec.change}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-500">Vol:</span> {sec.volume}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">H/L:</span> {sec.high}/{sec.low}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <Link
                href="/market"
                className="block text-center text-xs md:text-sm font-medium text-[#004B5B] hover:underline"
              >
                View Full Market →
              </Link>
          </div>
        </Card>
        </div>
        )}

        {/* Trade History */}
        <Card className="p-4 md:p-6" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900">Recent Trades</h2>
            <Link href="/dashboard/client/history" className="text-xs md:text-sm text-[#004B5B] font-medium hover:underline">
              View All →
            </Link>
          </div>
          
          {recentTrades.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">No trades yet. Start trading to see your history here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">ID</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Type</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Description</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, index) => (
                    <tr key={trade.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600">{index + 1}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold lowercase ${
                          trade.type === "BUY" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {trade.type.toLowerCase()}_shares
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-900">
                        Purchase of {trade.quantity} shares of {trade.company.symbol} at Rwf {parseFloat(trade.executedPrice || "0").toFixed(2)} per share
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">Rwf {parseFloat(trade.totalAmount).toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold lowercase ${
                          trade.status === "EXECUTED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {trade.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{new Date(trade.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-fadeInUp">
          <div
            className={`max-w-md rounded-xl shadow-2xl p-4 border ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-rose-50 border-rose-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {toast.type === "success" ? (
                  <svg
                    className="h-6 w-6 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6 text-rose-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    toast.type === "success" ? "text-emerald-900" : "text-rose-900"
                  }`}
                >
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => setToast({ show: false, message: "", type: "success" })}
                className={`shrink-0 ${
                  toast.type === "success" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
