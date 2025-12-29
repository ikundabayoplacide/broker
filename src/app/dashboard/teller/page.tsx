/* eslint-disable react/no-unescaped-entities */
"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import {
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiUsers,
  FiDollarSign,
  FiAlertTriangle,
  FiPhone,
  FiMail,
  FiCalendar,
} from "react-icons/fi";

// Mock data for development (keeping only what's needed)
const mockOrders = [
  {
    id: "ORD001",
    client: { name: "Mujawamariya", id: "CL001", csdNumber: "20241201 1 RW01" },
    company: { symbol: "BK", name: "Bank of Kigali" },
    type: "BUY",
    quantity: 100,
    price: "450.00",
    createdAt: "2024-12-23T09:30:00Z",
    priority: "high"
  },
  {
    id: "ORD002",
    client: { name: "Tuyisenge Bosco", id: "CL002", csdNumber: "20241115 2 RW02" },
    company: { symbol: "EQTY", name: "Equity Bank" },
    type: "SELL",
    quantity: 50,
    price: "320.00",
    createdAt: "2024-12-23T10:15:00Z",
    priority: "medium"
  }
];

const mockAlerts = [
  {
    id: "ALT001",
    type: "kyc_expiry",
    client: "Marie Uwimana",
    message: "KYC documents expire in 7 days",
    severity: "warning"
  },
  {
    id: "ALT002",
    type: "large_order",
    client: "David Habimana",
    message: "Large order pending approval (>Rwf 500K)",
    severity: "info"
  },
  {
    id: "ALT003",
    type: "failed_payment",
    client: "Grace Mutesi",
    message: "Payment failed for order #ORD045",
    severity: "error"
  }
];

const mockRecentClients = [
  {
    id: "CL004",
    name: "Peter Mugisha",
    lastVisit: "2024-12-23T14:30:00Z",
    action: "Portfolio Review",
    status: "completed"
  },
  {
    id: "CL005",
    name: "Linda Uwase",
    lastVisit: "2024-12-23T13:45:00Z",
    action: "New Account Setup",
    status: "in_progress"
  },
  {
    id: "CL006",
    name: "Robert Niyonzima",
    lastVisit: "2024-12-23T12:20:00Z",
    action: "Trade Execution",
    status: "completed"
  }
];

export default function TellerDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({ 
    totalVolume: "0", 
    executedToday: 0, 
    totalClients: 0, 
    activeClients: 0, 
    commissionEarned: "0", 
    pendingOrders: 0 
  });
  const [orders, setOrders] = useState(mockOrders);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [recentClients, setRecentClients] = useState(mockRecentClients);
  const [loading, setLoading] = useState(true);

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
        
        // TODO: Implement other endpoints later
        // const [ordersRes, alertsRes] = await Promise.all([
        //   fetch("/api/teller/orders?status=PENDING&limit=5", { headers: { Authorization: `Bearer ${token}` } }),
        //   fetch("/api/teller/alerts", { headers: { Authorization: `Bearer ${token}` } })
        // ]);
        // if (ordersRes.ok) setOrders((await ordersRes.json()).data);
        // if (alertsRes.ok) setAlerts((await alertsRes.json()).data);
        
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
      <div className="space-y-2">
        {/* Welcome Section */}
        <div className="animate-fadeInUp space-y-2">
          <h1 className="text-2xl font-bold text-gray-600">Teller Dashboard</h1>
          <p className="text-base text-gray-400">Manage client mandates, monitor trades, and keep portfolios aligned.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 animate-slideInRight">
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Trade Volume</p>
                <p className="text-xl font-semibold text-blue-600">Rwf {loading ? "..." : parseFloat(stats.totalVolume).toLocaleString()}</p>
                <p className="text-sm text-gray-400">Today's volume</p>
              </div>
              <div className="w-11 h-11 gradient-primary rounded-full flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Pending Orders</p>
                <p className="text-xl font-semibold text-orange-600">{loading ? "..." : stats.pendingOrders}</p>
                <p className="text-sm text-gray-400">Awaiting execution</p>
              </div>
              <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center">
                <FiClock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Executed Today</p>
                <p className="text-xl font-semibold text-green-600">{loading ? "..." : stats.executedToday}</p>
                <p className="text-sm text-green-600">Completed trades</p>
              </div>
              <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Total Clients</p>
                <p className="text-xl font-semibold text-gray-700">{loading ? "..." : stats.totalClients}</p>
                <p className="text-sm text-gray-400">All managed</p>
              </div>
              <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Active Clients</p>
                <p className="text-xl font-semibold text-purple-600">{loading ? "..." : stats.activeClients}</p>
                <p className="text-sm text-gray-400">Verified clients</p>
              </div>
              <div className="w-11 h-11 bg-purple-100 rounded-full flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Commission</p>
                <p className="text-xl font-semibold text-yellow-600">Rwf {loading ? "..." : parseFloat(stats.commissionEarned).toLocaleString()}</p>
                <p className="text-sm text-gray-400">Today's earnings (0.5%)</p>
              </div>
              <div className="w-11 h-11 bg-yellow-100 rounded-full flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-3">
          {/* Pending Orders */}
          <div className="lg:col-span-2">
            <Card className="p-6 animate-fadeInUp">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-700">Pending Orders</h2>
                <Link href="/dashboard/teller/orders">
                  <Button size="sm">View All</Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Order</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Quantity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading...</td></tr>
                    ) : orders.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">No pending orders</td></tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{order.client.name}</p>
                              <p className="text-sm text-gray-600">CSD: {order.client.csdNumber}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-sm ${order.type === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {order.type} {order.company.symbol}
                              </span>
                              {order.priority === 'high' && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                            </div>
                          </td>
                          <td className="py-3 px-4">{order.quantity}</td>
                          <td className="py-3 px-4">Rwf {parseFloat(order.price).toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button size="sm" className="px-3 py-1">Execute</Button>
                              <Button size="sm" variant="outline" className="px-3 py-1">Reject</Button>
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

          {/* Alerts & Notifications */}
          <div className="space-y-3">
            <Card className="p-6 animate-slideInRight">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FiAlertTriangle className="w-5 h-5 text-orange-500" />
                Client Alerts
              </h3>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'error' ? 'bg-red-50 border-red-400' :
                    alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <p className="font-medium text-sm">{alert.client}</p>
                    <p className="text-xs text-gray-600">{alert.message}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 animate-slideInRight delay-100">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Clients</h3>
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-gray-600">{client.action}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      client.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {client.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Market Status & Quick Actions */}
          <div className="space-y-3">
            <Card className="p-6 animate-slideInRight">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Market Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">RSE Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Open</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trading Hours</span>
                  <span className="text-sm font-medium">9:00 - 15:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Update</span>
                  <span className="text-sm font-medium">2 min ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Order Value</span>
                  <span className="text-sm font-medium">Rwf {stats.totalVolume && stats.executedToday > 0 ? (parseFloat(stats.totalVolume) / stats.executedToday).toLocaleString() : '0'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 animate-slideInRight delay-100">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
              <div className="flex flex-col gap-4">
                <Link href="/dashboard/teller/guest-trade">
                  <Button className="w-full justify-start hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200" variant="outline">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Guest Trade
                  </Button>
                </Link>
                <Link href="/dashboard/teller/orders">
                  <Button className="w-full justify-start hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200" variant="outline">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Manage Orders
                  </Button>
                </Link>
                <Link href="/dashboard/teller/executions">
                  <Button className="w-full justify-start hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200" variant="outline">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Executions
                  </Button>
                </Link>
                <Link href="/dashboard/teller/users">
                  <Button className="w-full justify-start hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200" variant="outline">
                    <FiUsers className="w-5 h-5 mr-3" />
                    Manage Clients
                  </Button>
                </Link>
                <Link href="/dashboard/teller/reports">
                  <Button className="w-full justify-start hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200" variant="outline">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Generate Reports
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
