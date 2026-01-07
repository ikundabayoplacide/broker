/* eslint-disable react/no-unescaped-entities */
"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useProfileReminder } from "@/hooks/useProfileReminder";
import ProfileReminderCard from "@/components/common/ProfileReminderCard";
import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import {
  FiClock,
  FiTrendingUp,
  FiUsers,
  FiDollarSign,
} from "react-icons/fi";
interface Order {
  id: string;
  client: {
    name: string;
    id: string;
    csdNumber: string;
  };
  company: {
    symbol: string;
    name: string;
  };
  type: string;
  quantity: number;
  price: string;
  createdAt: string;
  priority: string;
}

export default function TellerDashboard() {
  const { user, token } = useAuth();
  const { fullUserData } = useProfileReminder();
  const [stats, setStats] = useState({ 
    totalVolume: "0", 
    executedToday: 0, 
    totalClients: 0, 
    activeClients: 0, 
    commissionEarned: "0", 
    pendingOrders: 0 
  });
  const [walletData, setWalletData] = useState({
    balance: "0",
    availableBalance: "0",
    lockedBalance: "0"
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({
    status: 'Open',
    lastUpdate: new Date(),
    isOpen: true
  });

  const { displayName, email, dashboardRole } = useMemo((): {
    displayName: string;
    email: string;
    dashboardRole: "teller";
  } => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "Teller";

    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      dashboardRole: "teller",
    };
  }, [user?.email, user?.fullName]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        // Fetch real stats data
        const statsRes = await fetch("/api/teller/stats", { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data);
        }

        // Fetch wallet data
        try {
          const walletRes = await fetch("/api/wallet?limit=5&offset=0", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (walletRes.ok) {
            const walletData = await walletRes.json();
            setWalletData(walletData.wallet || { balance: "0", availableBalance: "0", lockedBalance: "0" });
            setRecentTransactions(walletData.transactions?.slice(0, 3) || []);
          }
        } catch (error) {
          console.error('Error fetching wallet data:', error);
        }
        
        // Fetch real orders data
        const [sellOrdersResponse, purchaseOrdersResponse] = await Promise.all([
          fetch('/api/forms/SaleOrderForm'),
          fetch('/api/forms/PurchaseOrderForm')
        ]);
        
        const sellOrdersData = sellOrdersResponse.ok ? (await sellOrdersResponse.json()).data || [] : [];
        const purchaseOrdersData = purchaseOrdersResponse.ok ? (await purchaseOrdersResponse.json()).data || [] : [];
        
        const transformedSellOrders = sellOrdersData.flatMap((order: any) => 
          order.SaleOrderItem?.map((item: any, index: number) => ({
            id: `SO-${order.id}-${index + 1}`,
            client: { 
              name: order.clientName || 'Unknown',
              id: order.userId,
              csdNumber: order.csdNumber || 'N/A'
            },
            company: { 
              symbol: item.security || 'Unknown',
              name: item.security || 'Unknown Security'
            },
            type: 'SELL',
            quantity: item.quantity,
            price: Number(item.price || 0).toFixed(2),
            createdAt: order.createdAt,
            priority: 'medium',
            originalStatus: order.status
          })) || []
        );
        
        const transformedPurchaseOrders = purchaseOrdersData.flatMap((order: any) => 
          order.PurchaseOrderItem?.map((item: any, index: number) => ({
            id: `PO-${order.id}-${index + 1}`,
            client: { 
              name: order.clientName || 'Unknown',
              id: order.userId,
              csdNumber: order.csdNumber || 'N/A'
            },
            company: { 
              symbol: item.security || 'Unknown',
              name: item.security || 'Unknown Security'
            },
            type: 'BUY',
            quantity: item.quantity,
            price: Number(item.price || 0).toFixed(2),
            createdAt: order.createdAt,
            priority: 'medium',
            originalStatus: order.status
          })) || []
        );
        
        const allTransformedOrders = [...transformedSellOrders, ...transformedPurchaseOrders];
        
        const pendingOrders = allTransformedOrders.filter((order: any) => {
          const sellOrder = sellOrdersData.find((so: any) => order.id.includes(so.id));
          const purchaseOrder = purchaseOrdersData.find((po: any) => order.id.includes(po.id));
          const isPending = sellOrder?.status === 'PENDING' || purchaseOrder?.status === 'PENDING';
          return isPending;
        });
        
        const allOrders = pendingOrders
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5); // Limit to 5 orders
        
        setOrders(allOrders);
        
        // Fetch market data
        try {
          const marketRes = await fetch('/api/market-summary');
          if (marketRes.ok) {
            const marketSummary = await marketRes.json();
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = currentHour * 60 + currentMinute; // Convert to minutes
            const marketOpen = 9 * 60; // 9:00 AM in minutes
            const marketClose = 15 * 60; // 3:00 PM in minutes
            const isMarketOpen = currentTime >= marketOpen && currentTime < marketClose;
            
            setMarketData({
              status: isMarketOpen ? 'Open' : 'Closed',
              lastUpdate: marketSummary.snapshotDate ? new Date(marketSummary.snapshotDate) : now,
              isOpen: isMarketOpen
            });
          }
        } catch (error) {
          console.error('Error fetching market data:', error);
          // Fallback to time-based status if API fails
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTime = currentHour * 60 + currentMinute;
          const isMarketOpen = currentTime >= 540 && currentTime < 900; // 9 AM to 3 PM
          
          setMarketData({
            status: isMarketOpen ? 'Open' : 'Closed',
            lastUpdate: now,
            isOpen: isMarketOpen
          });
        }
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
      <div className="space-y-6">
        <ProfileReminderCard userData={fullUserData} />
        {/* Welcome Section */}
        <div className="animate-fadeInUp space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Teller Dashboard</h1>
              <p className="text-lg text-gray-600 mt-1">Manage client mandates, monitor trades, and keep portfolios aligned.</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-slideInRight">
          {/* Wallet Card */}
          <Link href="/dashboard/teller/wallet">
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-emerald-500 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Wallet Balance</p>
                  <p className="text-2xl font-bold text-emerald-600">Rwf {loading ? "..." : parseFloat(walletData.balance).toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-1">Available: Rwf {(parseFloat(walletData.balance) - parseFloat(walletData.lockedBalance)).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            </Card>
          </Link>

          {/* Trade Volume Card */}
          <Link href="/dashboard/teller/executions">
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-blue-500 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Trade Volume</p>
                  <p className="text-2xl font-bold text-blue-600">Rwf {loading ? "..." : parseFloat(stats.totalVolume).toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">Executed: {stats.executedToday} trades</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FiTrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
          </Link>
          
          {/* Pending Orders Card */}
          <Link href="/dashboard/teller/orders">
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-orange-500 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Pending Orders</p>
                  <p className="text-2xl font-bold text-orange-600">{loading ? "..." : orders.length}</p>
                  <p className="text-xs text-orange-600 mt-1">Awaiting execution</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <FiClock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Clients Card */}
          <Link href="/dashboard/teller/users">
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-purple-500 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Clients</p>
                  <p className="text-2xl font-bold text-purple-600">{loading ? "..." : stats.totalClients}</p>
                  <p className="text-xs text-purple-600 mt-1">Active: {stats.activeClients}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <FiUsers className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Commission Card */}
          <Card className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Commission</p>
                <p className="text-2xl font-bold text-yellow-600">Rwf {loading ? "..." : parseFloat(stats.commissionEarned).toLocaleString()}</p>
                <p className="text-xs text-yellow-600 mt-1">Today's earnings (0.5%)</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pending Orders */}
          <div className="lg:col-span-2">
            <Card className="p-6 animate-fadeInUp shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Pending Orders</h2>
                  <p className="text-sm text-gray-500 mt-1">Orders awaiting execution</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-600">Buy: {orders.filter(o => o.type === 'BUY').length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-gray-600">Sell: {orders.filter(o => o.type === 'SELL').length}</span>
                  </div>
                  <Link href="/dashboard/teller/orders">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">View All</Button>
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Client</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Order</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Quantity</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Price</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading...</td></tr>
                    ) : orders.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">No pending orders</td></tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-semibold text-gray-800">{order.client.name}</p>
                              <p className="text-sm text-gray-500">CSD: {order.client.csdNumber}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.type === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {order.type} {order.company.symbol}
                              </span>
                              {order.priority === 'high' && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-medium">{order.quantity.toLocaleString()}</td>
                          <td className="py-4 px-4 font-semibold">Rwf {parseFloat(order.price).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <div className="flex space-x-2">
                              <Button size="sm" className="px-4 py-2 bg-green-600 hover:bg-green-700">Execute</Button>
                              <Button size="sm" variant="outline" className="px-4 py-2 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200">Reject</Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

       

          {/* Market Status & Wallet Overview */}
          <div className="space-y-6">
            <Card className="p-6 animate-slideInRight shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Market Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">RSE Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    marketData.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {marketData.status}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Trading Hours</span>
                  <span className="text-sm font-semibold text-gray-800">9:00 - 15:00</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Last Update</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {(() => {
                      const now = new Date();
                      const diffMs = now.getTime() - marketData.lastUpdate.getTime();
                      const diffMins = Math.floor(diffMs / (1000 * 60));
                      return diffMins < 1 ? 'Just now' : 
                             diffMins < 60 ? `${diffMins} min ago` : 
                             `${Math.floor(diffMins / 60)}h ago`;
                    })()} 
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Avg Order Value</span>
                  <span className="text-sm font-semibold text-gray-800">
                    Rwf {stats.totalVolume && stats.executedToday > 0 ? 
                      (parseFloat(stats.totalVolume) / stats.executedToday).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Active Orders</span>
                  <span className="text-sm font-semibold text-gray-800">{orders.length}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 animate-slideInRight delay-75 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Wallet Overview</h3>
                <Link href="/dashboard/teller/wallet">
                  <Button size="sm" variant="outline" className="text-xs hover:bg-[#004B5B] hover:text-white">Manage</Button>
                </Link>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Total Balance</span>
                  <span className="text-sm font-semibold text-blue-600">
                    Rwf {parseFloat(walletData.balance).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Available</span>
                  <span className="text-sm font-semibold text-green-600">
                    Rwf {(parseFloat(walletData.balance) - parseFloat(walletData.lockedBalance)).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Locked</span>
                  <span className="text-sm font-semibold text-orange-600">
                    Rwf {parseFloat(walletData.lockedBalance).toLocaleString()}
                  </span>
                </div>
                {recentTransactions.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">Recent Activity</p>
                    {recentTransactions.slice(0, 2).map((txn: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-600">
                          {txn.type === 'DEPOSIT' ? '+' : '-'}Rwf {parseFloat(txn.amount).toLocaleString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          txn.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                          txn.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {txn.status.toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>


          </div>
        </div>

        {/* Additional Information Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Executions */}
          <Card className="p-6 animate-fadeInUp shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Recent Executions</h3>
              <Link href="/dashboard/teller/executions">
                <Button size="sm" variant="outline" className="text-xs hover:bg-[#004B5B] hover:text-white">View All</Button>
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-800">BK Group - BUY</p>
                  <p className="text-xs text-gray-500">50 shares @ Rwf 85.75</p>
                </div>
                <span className="text-sm font-semibold text-green-600">+Rwf 21.44</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-800">MTN Rwanda - SELL</p>
                  <p className="text-xs text-gray-500">100 shares @ Rwf 28.75</p>
                </div>
                <span className="text-sm font-semibold text-green-600">+Rwf 14.38</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-800">Equity Bank - BUY</p>
                  <p className="text-xs text-gray-500">75 shares @ Rwf 42.50</p>
                </div>
                <span className="text-sm font-semibold text-green-600">+Rwf 15.94</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Commission Today</span>
                  <span className="font-semibold text-blue-600">Rwf {parseFloat(stats.commissionEarned).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Card>
          {/* Client Activity Summary */}
          <Card className="p-6 animate-fadeInUp shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Client Activity</h3>
              <Link href="/dashboard/teller/users">
                <Button size="sm" variant="outline" className="text-xs hover:bg-[#004B5B] hover:text-white">View All</Button>
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FiUsers className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Active Clients</p>
                    <p className="text-sm text-gray-500">Verified & trading</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-green-600">{stats.activeClients}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiUsers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Total Clients</p>
                    <p className="text-sm text-gray-500">Under management</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-blue-600">{stats.totalClients}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <FiDollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Commission Rate</p>
                    <p className="text-sm text-gray-500">Per transaction</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-purple-600">0.5%</span>
              </div>
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-6 animate-fadeInUp delay-100 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Today's Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Success Rate</span>
                <span className="text-sm font-semibold text-green-600">98.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Avg Processing Time</span>
                <span className="text-sm font-semibold text-gray-800">2.3 min</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Orders Processed</span>
                <span className="text-sm font-semibold text-gray-800">{stats.executedToday}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Revenue Generated</span>
                <span className="text-sm font-semibold text-blue-600">
                  Rwf {parseFloat(stats.commissionEarned).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Market Participation</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  marketData.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {marketData.isOpen ? 'Active' : 'Closed'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
