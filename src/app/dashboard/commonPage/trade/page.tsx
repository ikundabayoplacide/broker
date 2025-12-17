"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { FiSearch, FiTrendingUp, FiTrendingDown, FiUser, FiDollarSign, FiShoppingCart } from "react-icons/fi";
import toast from "react-hot-toast";

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

  const { displayName, dashboardRole, userRole, isClient, canSelectClient } = useMemo(() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "User";
    const role = user?.role;
    const isClient = role === "CLIENT";
    const canSelectClient = role === "TELLER" || role === "MANAGER";
    
    return {
      displayName: fullName || fallbackName,
      dashboardRole: role?.toLowerCase() as "client" | "teller" | "manager",
      userRole: role,
      isClient,
      canSelectClient
    };
  }, [user]);

  // Load companies
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Load clients for teller/manager
  useEffect(() => {
    if (canSelectClient) {
      fetchClients();
    }
  }, [canSelectClient]);

  // Load wallet and portfolio when client is selected or for direct client
  useEffect(() => {
    const targetUserId = selectedClient?.id || (isClient ? user?.id : null);
    if (targetUserId) {
      fetchWallet(targetUserId);
      fetchPortfolio(targetUserId);
    }
  }, [selectedClient, user?.id, isClient]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/company");
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
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
      const response = await fetch(`/api/wallet?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  const fetchPortfolio = async (userId: string) => {
    try {
      const response = await fetch(`/api/portfolio?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setPortfolio(data.portfolio || []);
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPrice = selectedCompany?.closingPrice || selectedCompany?.sharePrice || 0;
  const totalCost = quantity ? (parseInt(quantity) * (priceType === "LIMIT" ? parseFloat(limitPrice || "0") : currentPrice)) : 0;
  const fees = totalCost * 0.01; // 1% fee
  const finalTotal = totalCost + fees;

  const availableQuantity = portfolio.find(p => p.companyId === selectedCompany?.id)?.quantity || 0;

  const validateTrade = () => {
    if (!selectedCompany) return "Please select a company";
    if (canSelectClient && !selectedClient) return "Please select a client";
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
        ...(canSelectClient && selectedClient && { clientId: selectedClient.id })
      };

      const response = await fetch("/api/trade", {
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
        const targetUserId = selectedClient?.id || user?.id;
        if (targetUserId) {
          fetchWallet(targetUserId);
          fetchPortfolio(targetUserId);
        }
        fetchCompanies();
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

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName}>
      <div className="space-y-4">
        {/* Header */}
        <div className="animate-fadeInUp">
          <h1 className="text-2xl font-bold text-gray-600">Trade Securities</h1>
          <p className="text-base text-gray-400">Execute buy and sell orders for your clients</p>
          {canSelectClient && selectedClient && (
            <div className="mt-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Trading for: {selectedClient.fullName}
              </span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-slideInRight">
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Wallet Balance</p>
                <p className="text-xl font-semibold text-gray-700">Rwf {wallet?.balance.toLocaleString() || "0"}</p>
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
                <p className="text-xl font-semibold text-gray-700">{availableQuantity.toLocaleString()}</p>
                <p className="text-sm text-gray-400">{selectedCompany?.symbol || "Select stock"}</p>
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
                <p className="text-xl font-semibold text-gray-700">Rwf {currentPrice.toFixed(2)}</p>
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
            {canSelectClient && (
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
            <Card className="p-6 animate-fadeInUp">
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
              <div className="max-h-64 overflow-y-auto space-y-2">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                {canSelectClient && selectedClient && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{selectedClient.fullName}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="flex-1"
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
      </div>
    </DashboardLayout>
  );
}