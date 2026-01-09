"use client";

import { useState, useEffect } from "react";
import { FiX, FiShoppingCart, FiDollarSign } from "react-icons/fi";
import Button from "@/components/ui/Button";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    clientName: string;
    company: string;
    quantity: number;
    price: number;
    type: string;
  };
  tradeType: "BUY" | "SELL";
  currentUser?: {
    role: string;
    id: string;
    name: string;
  };
}

interface UserPortfolio {
  walletBalance: number;
  ownedShares: { [company: string]: number };
}

interface ManagedUser {
  id: string;
  name: string;
  email: string;
}

export default function TradeModal({ isOpen, onClose, order, tradeType, currentUser }: TradeModalProps) {
  const [quantity, setQuantity] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [portfolio, setPortfolio] = useState<UserPortfolio>({
    walletBalance: 0,
    ownedShares: {}
  });
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [tradingForSelf, setTradingForSelf] = useState(true);

  const canManageUsers = currentUser?.role?.toLowerCase() === "teller" || currentUser?.role?.toLowerCase() === "manager";

  const maxQuantity = order.quantity;
  const pricePerShare = order.price;
  const totalAmount = quantity * pricePerShare;
  const brokerFee = totalAmount * 0.01; // 1% fee
  const finalAmount = totalAmount + brokerFee;
  
  // User's available resources
  const walletBalance = portfolio.walletBalance;
  const ownedShares = portfolio.ownedShares[order.company] || 0;
  const canAfford = walletBalance >= finalAmount;
  const hasShares = ownedShares > 0;

  useEffect(() => {
    if (isOpen) {
      setQuantity(100);
      setTradingForSelf(true);
      setSelectedUserId("");
      fetchPortfolio();
      if (canManageUsers) {
        fetchManagedUsers();
      }
    }
  }, [isOpen, canManageUsers]);

  const fetchManagedUsers = async () => {
    try {
      const response = await fetch('/api/user?forTrade=true&page=1&limit=50');
      const data = await response.json();
      if (data.success) {
        const users = data.users || [];
        setManagedUsers(users.map((user: any) => ({
          id: user.id,
          name: user.fullName,
          email: user.email
        })));
      }
    } catch (error) {
      console.error('Error fetching managed users:', error);
    }
  };

  const fetchPortfolio = async (userId?: string) => {
    try {
      // Determine the target user ID
      let targetUserId;
      if (userId) {
        targetUserId = userId;
      } else if (tradingForSelf) {
        targetUserId = currentUser?.id;
      } else {
        return;
      }
      
      if (!targetUserId) {
        return;
      }
      
      // Fetch real wallet and portfolio data
      const [walletResponse, portfolioResponse] = await Promise.all([
        fetch(`/api/wallet?userId=${targetUserId}`),
        fetch(`/api/portfolio?userId=${targetUserId}`)
      ]);
      
      const walletData = await walletResponse.json();
      const portfolioData = await portfolioResponse.json();
      
      const walletBalance = walletData.success ? walletData.wallet?.balance || 0 : 0;
      const portfolioItems = portfolioData.success ? portfolioData.portfolio || [] : [];
      
      // Convert portfolio to shares by company
      const ownedShares: { [company: string]: number } = {};
      portfolioItems.forEach((item: any) => {
        const companyName = item.company?.name || item.company?.symbol || 'Unknown';
        ownedShares[companyName] = (ownedShares[companyName] || 0) + item.quantity;
      });
      
      const finalPortfolio = { walletBalance, ownedShares };
      setPortfolio(finalPortfolio);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setPortfolio({ 
        walletBalance: 0, 
        ownedShares: {} 
      });
    }
  };

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value) || 0;
    const roundedNum = Math.round(num / 100) * 100;
    if (roundedNum >= 100 && roundedNum <= maxQuantity) {
      setQuantity(roundedNum);
    }
  };

  const incrementQuantity = () => {
    const newQuantity = quantity + 100;
    if (newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const decrementQuantity = () => {
    const newQuantity = quantity - 100;
    if (newQuantity >= 100) {
      setQuantity(newQuantity);
    }
  };

  const handleTrade = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {tradeType === "BUY" ? (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiShoppingCart className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FiDollarSign className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {tradeType === "BUY" ? "Buy Shares" : "Sell Shares"}
              </h2>
              <p className="text-sm text-gray-500">
                {tradeType === "BUY" ? `From ${order.clientName}` : `To ${order.clientName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Trading For Selection */}
        {canManageUsers && (
          <div className="bg-yellow-50 rounded-xl p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Trading For</h4>
            <div className="space-y-3 flex gap-10 flex-col sm:flex-row sm:items-center">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="tradingFor"
                  value="self"
                  checked={tradingForSelf}
                  onChange={() => {
                    setTradingForSelf(true);
                    setSelectedUserId("");
                    fetchPortfolio();
                  }}
                  className="w-4 h-4 text-[#004B5B] focus:ring-[#004B5B]"
                />
                <span className="text-sm font-medium">Trade for myself</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="tradingFor"
                  value="client"
                  checked={!tradingForSelf}
                  onChange={() => {
                    setTradingForSelf(false);
                  }}
                  className="w-4 h-4 text-[#004B5B] focus:ring-[#004B5B]"
                />
                <span className="text-sm font-medium">Trade for a client</span>
              </label>
            </div>
            {!tradingForSelf && (
              <div className="mt-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setSelectedUserId(selectedId);
                    if (selectedId) {
                      fetchPortfolio(selectedId);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004B5B] focus:border-transparent"
                >
                  <option value="">Select a client...</option>
                  {managedUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* User Portfolio Info */}
        <div className="flex flex-row gap-4 mb-6">

        <div className={`rounded-xl p-4 mb-6 ${
          tradeType === "BUY" ? "bg-green-200" : "bg-blue-200"
        }`}>
          <h4 className="font-medium text-gray-900 mb-3">
            {tradingForSelf ? "Your Portfolio" : `Client Portfolio`}

          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Wallet Balance</p>
              <p className={`font-medium ${
                tradeType === "BUY" && !canAfford ? "text-red-600" : "text-gray-900"
              }`}>
                Rwf {walletBalance.toLocaleString()}
              </p>
              {tradeType === "BUY" && !canAfford && (
                <p className="text-xs text-red-500 mt-1">Insufficient funds</p>
              )}
            </div>
            <div>
              <p className="text-gray-600">Owned Shares</p>
              <p className={`font-medium ${
                tradeType === "SELL" && !hasShares ? "text-red-600" : "text-gray-900"
              }`}>
                {ownedShares} {order.company}
              </p>
              {tradeType === "SELL" && !hasShares && (
                <p className="text-xs text-red-500 mt-1">No shares to sell</p>
              )}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">{order.company}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Available</p>
              <p className="font-medium">{order.quantity} shares</p>
            </div>
            <div>
              <p className="text-gray-500">Price per share</p>
              <p className="font-medium">Rwf {pricePerShare.toFixed(2)}</p>
            </div>
          </div>
        </div>
        </div>
        {/* Quantity Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity to {tradeType.toLowerCase()}
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={decrementQuantity}
              disabled={quantity <= 100}
              className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
            >
              -100
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              min="100"
              max={maxQuantity}
              step="100"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#004B5B] focus:border-transparent"
            />
            <button
              onClick={incrementQuantity}
              disabled={quantity >= maxQuantity}
              className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
            >
              +100
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Shares must be in multiples of 100. Maximum: {maxQuantity} shares
          </p>
        </div>

        {/* Calculation Summary */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Transaction Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Shares × Price</span>
              <span>{quantity} × Rwf {pricePerShare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>Rwf {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Broker Fee (1%)</span>
              <span>Rwf {brokerFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 flex justify-between font-medium">
              <span>Total {tradeType === "BUY" ? "Cost" : "Revenue"}</span>
              <span className={tradeType === "BUY" ? "text-red-600" : "text-green-600"}>
                Rwf {finalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 hover:bg-[#004B5B] hover:text-white transition-all duration-200"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleTrade}
            className={`flex-1 ${
              tradeType === "BUY" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={isProcessing || (tradeType === "BUY" && !canAfford) || (tradeType === "SELL" && !hasShares)}
          >
            {isProcessing ? "Processing..." : `${tradeType === "BUY" ? "Buy" : "Sell"} Shares`}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}