"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { FiSearch, FiTrendingUp, FiTrendingDown, FiUser, FiDollarSign, FiShoppingCart, FiRefreshCw, FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";
import TransactionModal, { TransactionConfig } from "@/components/models/TransactionModal";
import { generateTransactionStatement } from "@/utils/printing/transactionStatement";
import { executePrint } from "@/utils/printing/printUtils";

interface Company {
  id: string;
  symbol: string;
  name: string;
  sharePrice: number;
  closingPrice: number;
  priceChange: string;
  availableShares: number;
}

interface Client {
  id: string;
  fullName: string;
  email: string;
  csdNumber: string;
}

interface Wallet {
  balance: number;
}

interface Portfolio {
  companyId: string;
  quantity: number;
  totalInvested?: number;
  averageBuyPrice?: number;
  company: {
    symbol: string;
    name: string;
  };
}

export default function TradePage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [priceType, setPriceType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [tradingMode, setTradingMode] = useState<"self" | "client">("self");
  const [recentTrades, setRecentTrades] = useState<Array<{
    id: string;
    type: string;
    status: string;
    quantity: number;
    executedPrice: string;
    totalAmount: string;
    createdAt: string;
    company: { name: string; symbol: string };
    user?: { fullName: string };
  }>>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [showHoldingsModal, setShowHoldingsModal] = useState(false);
  const [holdingsData, setHoldingsData] = useState<{
    holding: Portfolio | null;
    trades: Array<{
      id: string;
      type: string;
      quantity: number;
      executedPrice: string;
      totalAmount: string;
      createdAt: string;
    }>;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);
  const tradesPerPage = 5; // show 5 trades per page

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

  const { displayName, dashboardRole, userRole, isClient, canSelectClient, isManager } = useMemo(() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "User";
    const role = user?.role;
    const isClient = role === "CLIENT";
    const isManager = role === "MANAGER";
    const canSelectClient = role === "TELLER" || role === "MANAGER";
    
    return {
      displayName: fullName || fallbackName,
      dashboardRole: role?.toLowerCase() as "client" | "teller" | "manager",
      userRole: role,
      isClient,
      canSelectClient,
      isManager
    };
  }, [user]);

  // Load companies and recent trades
  useEffect(() => {
    fetchCompanies();
    setCurrentPage(1); // Reset to page 1 when context changes
    fetchRecentTrades(1);
  }, [isManager, tradingMode, selectedClient, user?.id]);

  // Load clients for teller/manager
  useEffect(() => {
    if (canSelectClient) {
      fetchClients();
    }
  }, [canSelectClient]);

  // Load wallet and portfolio when client is selected, for direct client, or when manager trades for self
  useEffect(() => {
    let targetUserId = null;
    
    if (isClient) {
      targetUserId = user?.id;
    } else if (isManager && tradingMode === "self") {
      targetUserId = user?.id;
    } else if (tradingMode === "client" && selectedClient) {
      targetUserId = selectedClient.id;
    }
    
    if (targetUserId) {
      fetchWallet(targetUserId);
      fetchPortfolio(targetUserId);
    }
  }, [selectedClient, user?.id, isClient, isManager, tradingMode]);

  // Refresh portfolio when company is selected to ensure accurate holdings
  useEffect(() => {
    if (selectedCompany) {
      let targetUserId = null;
      
      if (isClient) {
        targetUserId = user?.id;
      } else if (isManager && tradingMode === "self") {
        targetUserId = user?.id;
      } else if (tradingMode === "client" && selectedClient) {
        targetUserId = selectedClient.id;
      }
      
      if (targetUserId) {
        fetchPortfolio(targetUserId);
      }
    }
  }, [selectedCompany, isClient, isManager, tradingMode, selectedClient, user?.id]);

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true);
      const response = await fetch("/api/company");
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/user?role=CLIENT");
      const data = await response.json();
      if (data.success) {
        setClients(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchWallet = async (userId: string) => {
    try {
      setWalletLoading(true);
      const response = await fetch(`/api/wallet?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setWallet(data.wallet);
      } else if (data.error === "Wallet not found" || !data.wallet) {
        // Create wallet if it doesn't exist
        await createWallet(userId);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setWalletLoading(false);
    }
  };

  const createWallet = async (userId: string) => {
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, initialBalance: 0 })
      });
      const data = await response.json();
      if (data.success) {
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
    }
  };

  const fetchPortfolio = async (userId: string) => {
    try {
      setPortfolioLoading(true);
      const response = await fetch(`/api/portfolio?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setPortfolio(data.portfolio || []);
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchRecentTrades = async (page = 1) => {
    try {
      setTradesLoading(true);
      let targetUserId = null;
      
      // Determine whose trades to fetch based on current context
      if (isClient) {
        targetUserId = user?.id;
      } else if (isManager && tradingMode === "self") {
        targetUserId = user?.id;
      } else if (tradingMode === "client" && selectedClient) {
        targetUserId = selectedClient.id;
      }
      
      if (!targetUserId) {
        setRecentTrades([]);
        setTotalPages(1);
        setCurrentPage(1);
        return;
      }
      
      const response = await fetch(`/api/trade/history?limit=${tradesPerPage}&page=${page}&userId=${targetUserId}`);
      const data = await response.json();

      // Normalize values coming from the API (they might be strings)
      const apiTrades = Array.isArray(data.trades) ? data.trades : [];
      const apiTotal = Number(data.total ?? (Array.isArray(data.trades) ? data.trades.length : 0)) || 0;
      const apiPage = Number(data.page ?? page) || page;
      const apiLimit = Number(data.limit ?? tradesPerPage) || tradesPerPage;

      setRecentTrades(apiTrades);

      // Compute totalPages robustly on the client as a fallback
      const computedTotalPages = Math.max(1, Math.ceil(apiTotal / apiLimit));
      const serverTotalPages = Number(data.totalPages ?? computedTotalPages) || computedTotalPages;

      setTotalPages(serverTotalPages);
      setTotalTrades(apiTotal);
      setCurrentPage(apiPage);
    } catch (error) {
      console.error("Error fetching recent trades:", error);
      setRecentTrades([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setTradesLoading(false);
    }
  };

  // Pagination state is handled; debug logs removed

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPrice = selectedCompany?.closingPrice || selectedCompany?.sharePrice || 0;
  const totalCost = quantity ? (parseInt(quantity) * (priceType === "LIMIT" ? parseFloat(limitPrice || "0") : currentPrice)) : 0;
  const fees = totalCost * 0.01; // 1% fee
  const finalTotal = totalCost + fees;

  const availableQuantity = useMemo(() => {
    if (!selectedCompany || !portfolio.length) return 0;
    return portfolio
      .filter(p => p.companyId === selectedCompany.id)
      .reduce((total, holding) => total + holding.quantity, 0);
  }, [portfolio, selectedCompany]);

  const validateTrade = () => {
    if (!selectedCompany) return "Please select a company";
    if (canSelectClient && tradingMode === "client" && !selectedClient) return "Please select a client";
    if (!quantity || parseInt(quantity) <= 0) return "Please enter a valid quantity";
    if (parseInt(quantity) % 100 !== 0) return "Quantity must be in lots of 100";
    if (priceType === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) return "Please enter a valid limit price";
    
    if (tradeType === "BUY") {
      if (!wallet || wallet.balance < finalTotal) return "Insufficient wallet balance";
      if (selectedCompany.availableShares < parseInt(quantity)) return "Insufficient shares available";
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

    setLoading(true);
    try {
      const payload = {
        companySymbol: selectedCompany?.symbol,
        quantity: parseInt(quantity),
        tradeType,
        priceType,
        ...(priceType === "LIMIT" && { limitPrice: parseFloat(limitPrice) }),
        ...(canSelectClient && tradingMode === "client" && selectedClient && { clientId: selectedClient.id }),
        ...(isManager && tradingMode === "self" && { tradingForSelf: true })
      };

      // Use different endpoint based on trading mode
      const endpoint = (isManager && tradingMode === "self") 
        ? "/api/trade/buy"  // Use the same endpoint as manager/trade page
        : "/api/trade";
        
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowConfirmation(false);
        setQuantity("");
        setLimitPrice("");
        
        // Refresh data
        let targetUserId = null;
        if (isClient) {
          targetUserId = user?.id;
        } else if (isManager && tradingMode === "self") {
          targetUserId = user?.id;
        } else if (tradingMode === "client" && selectedClient) {
          targetUserId = selectedClient.id;
        }
        
        if (targetUserId) {
          fetchWallet(targetUserId);
          fetchPortfolio(targetUserId);
        }
        fetchCompanies();
        fetchRecentTrades();
      } else {
        toast.error(data.error || "Trade failed");
      }
    } catch (error) {
      console.error("Trade error:", error);
      toast.error("Trade execution failed");
    } finally {
      setLoading(false);
    }
  };

  const handleShowHoldings = async () => {
    if (!selectedCompany) return;
    
    let targetUserId = null;
    if (isClient) {
      targetUserId = user?.id;
    } else if (isManager && tradingMode === "self") {
      targetUserId = user?.id;
    } else if (tradingMode === "client" && selectedClient) {
      targetUserId = selectedClient.id;
    }
    
    if (!targetUserId) return;
    
    try {
      // Fetch detailed holdings for the selected company
      const [holdingResponse, tradesResponse] = await Promise.all([
        fetch(`/api/portfolio?userId=${targetUserId}&companyId=${selectedCompany.id}`),
        fetch(`/api/trade/history?userId=${targetUserId}&companyId=${selectedCompany.id}&limit=20`)
      ]);
      
      const holdingData = await holdingResponse.json();
      const tradesData = await tradesResponse.json();
      
      const holding = holdingData.success && holdingData.portfolio?.length > 0 
        ? holdingData.portfolio[0] 
        : null;
      
      const trades = tradesData.success ? tradesData.trades : [];
      
      setHoldingsData({ holding, trades });
      setShowHoldingsModal(true);
    } catch (error) {
      console.error("Error fetching holdings details:", error);
      toast.error("Failed to load holdings details");
    }
  };

  const handleRefreshAll = async () => {
    // Refresh companies
    fetchCompanies();
    
    // Refresh wallet and portfolio based on current context
    let targetUserId = null;
    if (isClient) {
      targetUserId = user?.id;
    } else if (isManager && tradingMode === "self") {
      targetUserId = user?.id;
    } else if (tradingMode === "client" && selectedClient) {
      targetUserId = selectedClient.id;
    }
    
    if (targetUserId) {
      fetchWallet(targetUserId);
      fetchPortfolio(targetUserId);
    }
    
    // Refresh recent trades
    fetchRecentTrades();
  };

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName}>
      <div className="space-y-4">
        {/* Header */}
        <div className="animate-fadeInUp">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-600">Trade Securities</h1>
              <p className="text-base text-gray-400">
                {isClient ? "Execute buy and sell orders" : "Execute buy and sell orders for yourself or your clients"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
              disabled={walletLoading || portfolioLoading || companiesLoading || tradesLoading}
            >
              <FiRefreshCw className={`h-4 w-4 ${(walletLoading || portfolioLoading || companiesLoading || tradesLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Trading Mode Toggle for Managers */}
          {isManager && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setTradingMode("self");
                  setSelectedClient(null);
                }}
                className={`px-7 py-4 rounded-lg font-medium text-lg transition-all ${
                  tradingMode === "self"
                    ? "bg-[#004B5B] text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Trade for Myself
              </button>
              <button
                onClick={() => setTradingMode("client")}
                className={`px-7 py-4 rounded-lg font-medium text-lg transition-all ${
                  tradingMode === "client"
                    ? "bg-[#004B5B] text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Trade for Client
              </button>
            </div>
          )}
          
          {/* Current Trading Status */}
          <div className="mt-4">
            {isClient && (
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Trading for: Myself
              </span>
            )}
            {isManager && tradingMode === "self" && (
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Trading for: Myself
              </span>
            )}
            {canSelectClient && tradingMode === "client" && selectedClient && (
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Trading for: {selectedClient.fullName}
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-slideInRight">
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
                  <p className="text-xl font-semibold text-gray-700">Rwf {wallet?.balance.toLocaleString() || "0"}</p>
                )}
                <p className="text-sm text-blue-600">Available funds</p>
              </div>
              <div className="w-11 h-11 gradient-primary rounded-full flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div 
              className="flex items-center justify-between cursor-pointer" 
              onClick={() => selectedCompany && availableQuantity > 0 && handleShowHoldings()}
            >
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
                  {selectedCompany?.symbol || "Select stock"}
                  {selectedCompany && availableQuantity > 0 && " • Click to view details"}
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
                  selectedCompany && parseFloat(selectedCompany.priceChange) >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {selectedCompany?.priceChange || "0.00"} today
                </p>
              </div>
              <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
                {selectedCompany && parseFloat(selectedCompany.priceChange) >= 0 ? 
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

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left Column - Market Selection */}
          <div className="space-y-4">
            {/* Client Selection */}
            {canSelectClient && tradingMode === "client" && (
              <Card className="p-6 animate-fadeInUp">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <FiUser className="mr-2" /> Select Client
                </h3>
                <select
                  value={selectedClient?.id || ""}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value);
                    setSelectedClient(client || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004F64] focus:border-transparent"
                >
                  <option value="">Choose a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.fullName} ({client.csdNumber})
                    </option>
                  ))}
                </select>
              </Card>
            )}

            {/* Market Selector */}
            <Card className="p-6 animate-fadeInUp max-h-[500px] overflow-y-auto rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Security</h3>
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004F64] focus:border-transparent"
                />
              </div>
              <div className=" overflow-y-auto space-y-2">
                {filteredCompanies.map(company => (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedCompany?.id === company.id
                        ? "bg-blue-50 border-2 border-[#004F64] shadow-sm"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-900">{company.symbol}</div>
                        <div className="text-sm text-gray-600 truncate">{company.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">Rwf {(company.closingPrice || company.sharePrice).toFixed(2)}</div>
                        <div className={`text-sm flex items-center ${
                          parseFloat(company.priceChange) >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {parseFloat(company.priceChange) >= 0 ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                          {company.priceChange}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Available: {company.availableShares.toLocaleString()} shares
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
              
              {!selectedCompany ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiShoppingCart className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium mb-2">Select a Security</p>
                  <p className="text-sm">Choose a company from the list to start trading</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Trade Type Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Order Type</label>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => setTradeType("BUY")}
                        variant={tradeType === "BUY" ? "primary" : "outline"}
                        className="flex-1"
                      >
                        Buy Shares
                      </Button>
                      <Button
                        onClick={() => setTradeType("SELL")}
                        variant={tradeType === "SELL" ? "primary" : "outline"}
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
                        <h4 className="font-semibold text-lg text-gray-900">{selectedCompany.symbol}</h4>
                        <p className="text-gray-600">{selectedCompany.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">Rwf {currentPrice.toFixed(2)}</div>
                        <div className={`text-sm font-medium ${
                          parseFloat(selectedCompany.priceChange) >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {selectedCompany.priceChange} today
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
                    disabled={!!validateTrade() || loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Processing..." : `${tradeType} ${selectedCompany.symbol}`}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && selectedCompany && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirm Trade</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Action:</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                    tradeType === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {tradeType} {selectedCompany.symbol}
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
                  <span className="text-gray-600">Trading for:</span>
                  <span className="font-medium">
                    {isClient || (isManager && tradingMode === "self") 
                      ? "Myself" 
                      : selectedClient?.fullName || "Not selected"
                    }
                  </span>
                </div>
              </div>
              <div className="flex space-x-3  ">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="flex-1 hover:!text-[#004F64] hover:!border-[#004F64] transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTrade}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Processing..." : "Confirm Trade"}
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
              <p className="text-sm text-gray-600 mt-1">
                {isClient 
                  ? "Your recent trading activity"
                  : isManager && tradingMode === "self"
                  ? "Your personal trading activity"
                  : selectedClient
                  ? `${selectedClient.fullName}'s trading activity`
                  : "Select a client to view their trades"
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransactionModal(true)}
                className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                disabled={recentTrades.length === 0}
              >
                <FiFileText className="h-4 w-4" />
                Statement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRecentTrades(currentPage)}
                className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
              >
                <FiRefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
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
                    {isManager && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                    )}
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
                      {isManager && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trade.user?.fullName || "Self"}
                        </td>
                      )}
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

        {/* Transaction Statement Modal */}
        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          onGenerate={handleGenerateStatement}
        />

        {/* Holdings Modal */}
        {showHoldingsModal && selectedCompany && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Holdings in {selectedCompany.name}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedCompany.symbol}</p>
                </div>
                <button
                  onClick={() => setShowHoldingsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {holdingsData?.holding ? (
                <div className="space-y-6">
                  {/* Holdings Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-blue-600">Shares Owned</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {holdingsData.holding.quantity.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-green-600">Current Value</p>
                      <p className="text-2xl font-bold text-green-900">
                        Rwf {(holdingsData.holding.quantity * currentPrice).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-purple-600">Total Invested</p>
                      <p className="text-2xl font-bold text-purple-900">
                        Rwf {Number(holdingsData.holding.totalInvested).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-orange-600">Avg. Buy Price</p>
                      <p className="text-2xl font-bold text-orange-900">
                        Rwf {Number(holdingsData.holding.averageBuyPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Profit/Loss */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Profit/Loss</p>
                        {(() => {
                          const currentValue = holdingsData.holding.quantity * currentPrice;
                          const invested = Number(holdingsData.holding.totalInvested);
                          const profitLoss = currentValue - invested;
                          const profitLossPercentage = invested > 0 ? (profitLoss / invested) * 100 : 0;
                          
                          return (
                            <div>
                              <p className={`text-2xl font-bold ${
                                profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {profitLoss >= 0 ? '+' : ''}Rwf {profitLoss.toLocaleString()}
                              </p>
                              <p className={`text-sm ${
                                profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {profitLossPercentage >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            setShowHoldingsModal(false);
                            setTradeType("BUY");
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Buy More
                        </Button>
                        <Button
                          onClick={() => {
                            setShowHoldingsModal(false);
                            setTradeType("SELL");
                          }}
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          Sell Shares
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Trade History for this company */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent Trades ({holdingsData.trades.length})
                    </h4>
                    {holdingsData.trades.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No recent trades for this company</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {holdingsData.trades.map((trade) => (
                              <tr key={trade.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    trade.type === 'BUY' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {trade.type}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {trade.quantity.toLocaleString()}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  Rwf {Number(trade.executedPrice || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  Rwf {Number(trade.totalAmount).toLocaleString()}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(trade.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No holdings found for this company</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  function handleGenerateStatement(config: TransactionConfig) {
    const currentUser = isClient || (isManager && tradingMode === "self")
      ? { name: displayName, email: user?.email || "" }
      : { name: selectedClient?.fullName || "Client", email: selectedClient?.email || "" };
    
    const statementContent = generateTransactionStatement(
      recentTrades,
      config,
      currentUser
    );
    
    if (config.format === 'pdf') {
      executePrint(statementContent);
    } else {
      // For Word format, create downloadable file
      const blob = new Blob([statementContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction-statement-${config.startDate}-to-${config.endDate}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}