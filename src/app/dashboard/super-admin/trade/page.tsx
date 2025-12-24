"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { FiSearch, FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingCart, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";

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
  source: "database" | "api";
}

interface TradeStats {
  walletBalance: number;
  openOrders: number;
  todayTrades: number;
}

export default function TradePage() {
  const { user, token } = useAuth();
  const [securities, setSecurities] = useState<Security[]>([]);
  const [selectedSecurity, setSelectedSecurity] = useState<Security | null>(null);
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState<string>("");
  const [priceType, setPriceType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [userHoldings, setUserHoldings] = useState<number>(0);
  const [portfolio, setPortfolio] = useState<Array<{
    companyId: string;
    quantity: number;
    totalInvested?: number;
    averageBuyPrice?: number;
    company: {
      symbol: string;
      name: string;
    };
  }>>([]);
  const [portfolioLoading, setPortfolioLoading] = useState<boolean>(false);
  const [tradeStats, setTradeStats] = useState<TradeStats>({
    walletBalance: 0,
    openOrders: 0,
    todayTrades: 0,
  });
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [companiesLoading, setCompaniesLoading] = useState<boolean>(false);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);
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
  const [tradesLoading, setTradesLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);
  const tradesPerPage = 5;

  const handlePrevious = () => {
    const newPage = Math.max(currentPage - 1, 1);
    setCurrentPage(newPage);
    fetchRecentTrades(newPage);
  };
  
  const handleNext = () => {
    const newPage = Math.min(currentPage + 1, totalPages);
    setCurrentPage(newPage);
    fetchRecentTrades(newPage);
  };

  const fetchRecentTrades = async (page = 1) => {
    try {
      setTradesLoading(true);
      const response = await fetch(`/api/trade/history?limit=${tradesPerPage}&page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const apiTrades = Array.isArray(data.trades) ? data.trades : [];
        const apiTotal = Number(data.total ?? apiTrades.length) || 0;
        const apiPage = Number(data.page ?? page) || page;
        const apiLimit = Number(data.limit ?? tradesPerPage) || tradesPerPage;
        
        setRecentTrades(apiTrades);
        const computedTotalPages = Math.max(1, Math.ceil(apiTotal / apiLimit));
        const serverTotalPages = Number(data.totalPages ?? computedTotalPages) || computedTotalPages;
        
        setTotalPages(serverTotalPages);
        setTotalTrades(apiTotal);
        setCurrentPage(apiPage);
      }
    } catch (error) {
      console.error("Error fetching recent trades:", error);
      setRecentTrades([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setTradesLoading(false);
    }
  };

  const { displayName, email, apiPrefix } = useMemo(() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "User";
    const role = user?.role;
    
    return {
      displayName: fullName || fallbackName,
      email: user?.email || "",
      apiPrefix: role === "SUPER_ADMIN" ? "/super-admin" : "",
    };
  }, [user]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setCompaniesLoading(true);
        setWalletLoading(true);
        
        // Load securities
        const securitiesResponse = await fetch("/api/securities");
        if (securitiesResponse.ok) {
          const securitiesData = await securitiesResponse.json();
          const mappedSecurities = (securitiesData.data || []).map((sec: any) => ({
            symbol: sec.symbol,
            name: sec.name,
            price: sec.price || sec.sharePrice || sec.closingPrice || 0,
            change: sec.change || sec.priceChange || 0,
            volume: sec.volume || "0",
            high: sec.high || sec.price || 0,
            low: sec.low || sec.price || 0,
            bid: sec.bid || sec.price || 0,
            ask: sec.ask || sec.price || 0,
            source: "database" as const,
          }));
          setSecurities(mappedSecurities);
        }
        
        // Load wallet balance for super admin
        const walletResponse = await fetch("/api/wallet", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          setTradeStats(prev => ({
            ...prev,
            walletBalance: walletData.wallet?.balance || 0,
          }));
        }
        
        // Load portfolio for super admin
        const portfolioResponse = await fetch(`/api/portfolio?userId=${user?.id}`);
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json();
          setPortfolio(portfolioData.portfolio || []);
        }
        
        // Load today's trades count and recent trades
        fetchRecentTrades(1);
      } catch (err) {
        setError("Failed to load trading data");
        console.error("Error loading initial data:", err);
      } finally {
        setCompaniesLoading(false);
        setWalletLoading(false);
      }
    };

    if (user && token) {
      loadInitialData();
    }
  }, [user, token]);

  // Load user holdings when security is selected
  useEffect(() => {
    const loadPortfolio = async () => {
      if (!user?.id) return;
      
      try {
        setPortfolioLoading(true);
        const response = await fetch(`/api/portfolio?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setPortfolio(data.portfolio || []);
        }
      } catch (err) {
        console.error("Error loading portfolio:", err);
      } finally {
        setPortfolioLoading(false);
      }
    };

    loadPortfolio();
  }, [user?.id]);

  const availableQuantity = useMemo(() => {
    if (!selectedSecurity || !portfolio.length) return 0;
    return portfolio
      .filter(p => p.company.symbol === selectedSecurity.symbol)
      .reduce((total, holding) => total + holding.quantity, 0);
  }, [portfolio, selectedSecurity]);

  const filteredSecurities = securities.filter(security =>
    security.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    security.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPrice = selectedSecurity?.price || 0;
  const totalCost = quantity ? (parseInt(quantity) * (priceType === "LIMIT" ? parseFloat(limitPrice || "0") : currentPrice)) : 0;
  const fees = totalCost * 0.01; // 1% fee
  const finalTotal = totalCost + fees;

  const validateTrade = () => {
    if (!selectedSecurity) return "Please select a security";
    if (!quantity || parseInt(quantity) <= 0) return "Please enter a valid quantity";
    if (parseInt(quantity) % 100 !== 0) return "Quantity must be in lots of 100";
    if (priceType === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) return "Please enter a valid limit price";
    
    if (orderType === "BUY") {
      if (tradeStats.walletBalance < finalTotal) return "Insufficient wallet balance";
    } else {
      if (availableQuantity < parseInt(quantity)) return "Insufficient shares in portfolio";
    }
    
    return null;
  };

  const handleTrade = async () => {
    const error = validateTrade();
    if (error) {
      toast.error(error);
      return;
    }

    // Only allow buy orders for now
    if (orderType === "SELL") {
      toast.error("Sell functionality is not yet available. Coming soon!");
      return;
    }

    setProcessing(true);
    
    try {
      const response = await fetch("/api/trade/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companySymbol: selectedSecurity?.symbol,
          quantity: parseInt(quantity),
          priceType,
          ...(priceType === "LIMIT" && { limitPrice: parseFloat(limitPrice) }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute trade");
      }

      toast.success(data.message || `Successfully purchased ${quantity} shares`);
      setShowConfirmation(false);
      setQuantity("");
      setLimitPrice("");

      // Refresh data
      const securitiesResponse = await fetch("/api/securities");
      if (securitiesResponse.ok) {
        const securitiesData = await securitiesResponse.json();
        const mappedSecurities = (securitiesData.data || []).map((sec: any) => ({
          symbol: sec.symbol,
          name: sec.name,
          price: sec.price || sec.sharePrice || sec.closingPrice || 0,
          change: sec.change || sec.priceChange || 0,
          volume: sec.volume || "0",
          high: sec.high || sec.price || 0,
          low: sec.low || sec.price || 0,
          bid: sec.bid || sec.price || 0,
          ask: sec.ask || sec.price || 0,
          source: "database" as const,
        }));
        setSecurities(mappedSecurities);
      }

      // Refresh user holdings for current security
      if (user?.id) {
        const portfolioResponse = await fetch(`/api/portfolio?userId=${user.id}`);
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json();
          setPortfolio(portfolioData.portfolio || []);
        }
      }

      // Refresh recent trades
      fetchRecentTrades(currentPage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute trade";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleRefreshAll = async () => {
    setCompaniesLoading(true);
    setWalletLoading(true);
    
    try {
      // Refresh securities
      const securitiesResponse = await fetch("/api/securities");
      if (securitiesResponse.ok) {
        const securitiesData = await securitiesResponse.json();
        const mappedSecurities = (securitiesData.data || []).map((sec: any) => ({
          symbol: sec.symbol,
          name: sec.name,
          price: sec.price || sec.sharePrice || sec.closingPrice || 0,
          change: sec.change || sec.priceChange || 0,
          volume: sec.volume || "0",
          high: sec.high || sec.price || 0,
          low: sec.low || sec.price || 0,
          bid: sec.bid || sec.price || 0,
          ask: sec.ask || sec.price || 0,
          source: "database" as const,
        }));
        setSecurities(mappedSecurities);
      }
      
      // Refresh recent trades
      fetchRecentTrades(currentPage);
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setCompaniesLoading(false);
      setWalletLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="super-admin" userName={displayName}>
      <div className="space-y-4">
        {/* Header */}
        <div className="animate-fadeInUp">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-600">Trade Securities</h1>
              <p className="text-base text-gray-400">Execute buy and sell orders with administrative privileges</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
              disabled={walletLoading || companiesLoading}
            >
              <FiRefreshCw className={`h-4 w-4 ${(walletLoading || companiesLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-slideInRight">
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Wallet Balance</p>
                {walletLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#004B5B]"></div>
                    <p className="text-xl font-semibold text-gray-400">Loading...</p>
                  </div>
                ) : (
                  <p className="text-xl font-semibold text-gray-700">Rwf {tradeStats.walletBalance.toLocaleString()}</p>
                )}
                <p className="text-sm text-blue-600">Available funds</p>
              </div>
              <div className="w-11 h-11 gradient-primary rounded-full flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Holdings</p>
                {portfolioLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#004B5B]"></div>
                    <p className="text-xl font-semibold text-gray-400">Loading...</p>
                  </div>
                ) : (
                  <p className="text-xl font-semibold text-gray-700">{availableQuantity.toLocaleString()}</p>
                )}
                <p className="text-sm text-gray-400">
                  {selectedSecurity?.symbol || "Select stock"}
                </p>
              </div>
              <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center">
                <FiShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Current Price</p>
                {companiesLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#004B5B]"></div>
                    <p className="text-xl font-semibold text-gray-400">Loading...</p>
                  </div>
                ) : (
                  <p className="text-xl font-semibold text-gray-700">Rwf {currentPrice.toFixed(2)}</p>
                )}
                <p className={`text-sm ${
                  selectedSecurity && selectedSecurity.change >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {selectedSecurity?.change.toFixed(2) || "0.00"} today
                </p>
              </div>
              <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
                {selectedSecurity && selectedSecurity.change >= 0 ? 
                  <FiTrendingUp className="w-6 h-6 text-green-600" /> : 
                  <FiTrendingDown className="w-6 h-6 text-red-600" />
                }
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Order Total</p>
                <p className="text-xl font-semibold text-gray-700">Rwf {finalTotal.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Including fees</p>
              </div>
              <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-4">
            <p className="text-rose-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left Column - Market Selection */}
          <div className="space-y-4">
            {/* Market Selector */}
            <Card className="p-6 animate-fadeInUp max-h-[500px] overflow-y-auto rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Security</h3>
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search securities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004F64] focus:border-transparent"
                />
              </div>
              <div className="overflow-y-auto space-y-2">
                {filteredSecurities.map(security => (
                  <div
                    key={security.symbol}
                    onClick={() => setSelectedSecurity(security)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedSecurity?.symbol === security.symbol
                        ? "bg-blue-50 border-2 border-[#004F64] shadow-sm"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-900">{security.symbol}</div>
                        <div className="text-sm text-gray-600 truncate">{security.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">Rwf {security.price.toFixed(2)}</div>
                        <div className={`text-sm flex items-center ${
                          security.change >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {security.change >= 0 ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                          {security.change.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Volume: {security.volume}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - Trade Form */}
          <div className="lg:col-span-2">
            <Card className="p-6 animate-slideInRight">
              <h3 className="text-xl font-semibold text-gray-700 mb-6">Place Order</h3>
              
              {!selectedSecurity ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiShoppingCart className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium mb-2">Select a Security</p>
                  <p className="text-sm">Choose a security from the list to start trading</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Trade Type Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Order Type</label>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => setOrderType("BUY")}
                        variant={orderType === "BUY" ? "primary" : "outline"}
                        className="flex-1"
                      >
                        Buy Shares
                      </Button>
                      <Button
                        onClick={() => setOrderType("SELL")}
                        variant={orderType === "SELL" ? "primary" : "outline"}
                        className="flex-1"
                      >
                        Sell Shares
                      </Button>
                    </div>
                  </div>

                  {/* Selected Security Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">{selectedSecurity.symbol}</h4>
                        <p className="text-gray-600">{selectedSecurity.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">Rwf {currentPrice.toFixed(2)}</div>
                        <div className={`text-sm font-medium ${
                          selectedSecurity.change >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {selectedSecurity.change.toFixed(2)} today
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity (lots of 100)
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity (e.g., 100, 200, 300...)"
                      min="100"
                      step="100"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004F64] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum: 100 shares (1 lot)</p>
                    
                    {/* Quick Quantity Selection */}
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Quick select:</p>
                      <div className="flex flex-wrap gap-2">
                        {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setQuantity(qty.toString())}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                              quantity === qty.toString()
                                ? "bg-[#004F64] text-white shadow-sm"
                                : "bg-gray-100 text-gray-700 hover:bg-[#004F64] hover:text-white border border-gray-200"
                            }`}
                          >
                            {qty}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Price Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Price Type</label>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => setPriceType("MARKET")}
                        variant={priceType === "MARKET" ? "primary" : "outline"}
                        size="sm"
                        className="flex-1"
                      >
                        Market Price
                      </Button>
                      <Button
                        onClick={() => setPriceType("LIMIT")}
                        variant={priceType === "LIMIT" ? "primary" : "outline"}
                        size="sm"
                        className="flex-1"
                      >
                        Limit Price
                      </Button>
                    </div>
                  </div>

                  {/* Limit Price Input */}
                  {priceType === "LIMIT" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Limit Price (Rwf)
                      </label>
                      <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder="Enter your limit price"
                        min="0"
                        step="0.01"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004F64] focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Order Summary */}
                  {quantity && parseInt(quantity) > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-gray-900">Order Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium">{parseInt(quantity).toLocaleString()} shares</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price per share:</span>
                          <span className="font-medium">Rwf {(priceType === "LIMIT" ? parseFloat(limitPrice || "0") : currentPrice).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">Rwf {totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Trading fees (1%):</span>
                          <span className="font-medium">Rwf {fees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base border-t pt-2 text-gray-900">
                          <span>Total:</span>
                          <span>Rwf {finalTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    onClick={() => setShowConfirmation(true)}
                    disabled={!!validateTrade() || processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? "Processing..." : `${orderType} ${selectedSecurity.symbol}`}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && selectedSecurity && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirm Trade</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Action:</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                    orderType === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {orderType} {selectedSecurity.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{parseInt(quantity).toLocaleString()} shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-lg">Rwf {finalTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trading as:</span>
                  <span className="font-medium">Super Admin</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="flex-1 hover:!text-[#004F64] hover:!border-[#004F64] transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTrade}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? "Processing..." : "Confirm Trade"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Recent Trades */}
        <Card className="p-6 animate-fadeInUp">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recent Trades</h2>
              <p className="text-sm text-gray-600 mt-1">Your recent trading activity as Super Admin</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
              disabled={tradesLoading}
            >
              <FiRefreshCw className={`h-4 w-4 ${tradesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {tradesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-600">Loading trades...</p>
            </div>
          ) : recentTrades.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">No Recent Trades</p>
              <p className="text-sm">Start trading to see your transaction history here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Security
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trade.type === "BUY" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{trade.company.symbol}</div>
                        <div className="text-sm text-gray-500">{trade.company.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rwf {parseFloat(trade.executedPrice || "0").toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Rwf {parseFloat(trade.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trade.status === "EXECUTED" 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(trade.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                  <div className="text-sm text-gray-500">
                    {totalTrades === 0 ? (
                      "Showing 0 of 0"
                    ) : (
                      <>
                        Showing {(currentPage - 1) * tradesPerPage + 1}–
                        {Math.min(currentPage * tradesPerPage, totalTrades)} of {totalTrades}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={currentPage === 1 ? undefined : handlePrevious}
                      disabled={currentPage === 1 || tradesLoading}
                      className={`px-3 py-1 rounded-full text-white transition-colors ${
                        currentPage === 1 || tradesLoading
                          ? "bg-gray-300 cursor-not-allowed" 
                          : "bg-[#004B5B] hover:bg-[#006B85]"
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {totalTrades === 0 ? 0 : currentPage} of {totalTrades === 0 ? 0 : totalPages}
                    </span>
                    <button
                      onClick={currentPage === totalPages ? undefined : handleNext}
                      disabled={currentPage === totalPages || tradesLoading}
                      className={`px-3 py-1 rounded-full text-white transition-colors ${
                        currentPage === totalPages || tradesLoading
                          ? "bg-gray-300 cursor-not-allowed" 
                          : "bg-[#004B5B] hover:bg-[#006B85]"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}