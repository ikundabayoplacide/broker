"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState, useEffect } from "react";
import axios from "@/lib/axios";
import {
  FiUsers,
  FiBriefcase,
  FiBarChart2,
  FiTrendingUp,
  FiShield,
  FiUserCheck,
  FiActivity,
  FiSettings,
  FiFileText,
  FiAlertTriangle,
  FiX,
  FiPrinter,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { generateManagerDashboardPrint } from "@/utils/printing/managerDashboardPrint";
import { executePrint } from "@/utils/printing/printUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalClients: 0,
    activeClients: 0,
    totalTellers: 0,
    activeTellers: 0,
    loading: true
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;
      try {
        const [usersRes] = await Promise.all([
          axios.get('/user', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        const users = usersRes.data?.users || usersRes.data || [];
        const clients = users.filter((u: any) => u.role === 'CLIENT');
        const tellers = users.filter((u: any) => u.role === 'TELLER');
        
        setDashboardData({
          totalClients: clients.length,
          activeClients: clients.filter((c: any) => c.isVerified).length,
          totalTellers: tellers.length,
          activeTellers: tellers.filter((t: any) => t.isVerified).length,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchDashboardData();
  }, [token]);

  const { displayName, email, dashboardRole } = useMemo((): {
    displayName: string;
    email: string;
  dashboardRole: "client" | "teller" | "admin" | "manager" | "super-admin" | "company";
  } => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "Admin";
    const role = user?.role?.toString().toUpperCase() ?? "ADMIN";
    const normalizedRole = (() => {
      switch (role) {
        case "CLIENT":
          return "client";
        case "TELLER":
          return "teller";
        case "MANAGER":
          return "manager";
        case "SUPER_ADMIN":
          return "super-admin";
        case "COMPANY":
          return "company";
        default:
          return "admin";
      }
    })();

    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      dashboardRole: normalizedRole,
    };
  }, [user?.email, user?.fullName, user?.role]);

  const handlePrint = () => {
    const printContent = generateManagerDashboardPrint();
    executePrint(printContent);
  };

  return (
        <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
          <div className="space-y-6">
            <div className="flex justify-between items-start animate-fadeInUp">
              <div>
                <h1 className="text-2xl font-bold text-gray-500">Manager's Dashboard [ manager of branches]</h1>
                <p className="text-base text-gray-400">
                  Manage clients, tellers, and oversee platform operations. for specific branch
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handlePrint}
              >
                <FiPrinter className="h-4 w-4" />
                Print
              </Button>
            </div>

            <div className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideInRight">
              {[
                {
                  title: "Total Clients",
                  value: dashboardData.loading ? "Loading..." : dashboardData.totalClients.toString(),
                  activevalue: dashboardData.loading ? "..." : dashboardData.activeClients.toString(),
                  valuechange: "Active clients",
                  change: `${dashboardData.activeClients}/${dashboardData.totalClients} verified`,
                  icon: <FiUsers className="w-6 h-6 text-white" />,
                  color: "bg-gradient-to-r from-[#004B5B] to-[#006B7D]",
                },
                {
                  title: "Total Tellers",
                  value: dashboardData.loading ? "Loading..." : dashboardData.totalTellers.toString(),
                  activevalue: dashboardData.loading ? "..." : dashboardData.activeTellers.toString(),
                  change: `${dashboardData.activeTellers} Active`,
                  icon: <FiBriefcase className="w-6 h-6 text-blue-400" />,
                  bg: "bg-blue-100",
                  textColor: "text-blue-500",
                },
                {
                  title: "Daily Volume",
                  value: "2,004,000 Rwf",
                  change: "+8.5% from yesterday",
                  icon: <FiTrendingUp className="w-6 h-6 text-green-400" />,
                  bg: "bg-green-100",
                  textColor: "text-green-600",
                },
                {
                  title: "Monthly Trading Volume",
                  value: "156,000,000 Rwf",
                  change: "+8.5% from yesterday",
                  icon: <FiTrendingUp className="w-6 h-6 text-indigo-400" />,
                  bg: "bg-indigo-100",
                  textColor: "text-indigo-600",
                },
                {
                  title: "Pending KYC",
                  value: "23",
                  change: "Requires review",
                  icon: <FiShield className="w-6 h-6 text-orange-400" />,
                  bg: "bg-orange-100",
                  textColor: "text-orange-600",
                },

                {
                  title: "Reports Generated",
                  value: "42",
                  change: "This month",
                  icon: <FiFileText className="w-6 h-6 text-purple-400" />,
                  bg: "bg-purple-100",
                  textColor: "text-purple-600",
                },
                {
                  title: "Platform Healthy",
                  value: "99.97%",
                  change: "Stable last 30 days",
                  icon: <FiActivity className="w-6 h-6 text-green-400" />,
                  bg: "bg-green-100",
                  textColor: "text-green-600",
                },
             
                {
                  title: "System Alerts",
                  value: "4",
                  change: "Requires attention",
                  icon: <FiAlertTriangle className="w-6 h-6 text-red-400" />,
                  bg: "bg-red-100",
                  textColor: "text-red-600",
                },
              ].map((item, i) => (
                <Card key={i} className="p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-medium text-gray-500 mb-2">{item.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                      {item.activevalue && (
                        <p className="text-sm font-medium text-gray-600">
                          {item.valuechange || "Active"}: {item.activevalue}
                        </p>
                      )}
                      <p className={`text-sm ${item.textColor || "text-green-600"}`}>
                        {item.change}
                      </p>
                    </div>
                    <div
                      className={`w-10 h-10 ${
                        item.color || item.bg || "bg-gray-100"
                      } rounded-full flex items-center justify-center`}
                    >
                      {item.icon}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Trading Volume Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-500 mb-4">Daily Trading Volume</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { day: "Mon", volume: 1850000 },
                      { day: "Tue", volume: 2100000 },
                      { day: "Wed", volume: 1950000 },
                      { day: "Thu", volume: 2200000 },
                      { day: "Fri", volume: 2004000 },
                      { day: "Sat", volume: 1800000 },
                      { day: "Sun", volume: 1600000 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} RWF`, "Volume"]} />
                      <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-500 mb-4">Monthly Trading Volume</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { month: "Jan", volume: 45000000 },
                      { month: "Feb", volume: 52000000 },
                      { month: "Mar", volume: 48000000 },
                      { month: "Apr", volume: 61000000 },
                      { month: "May", volume: 58000000 },
                      { month: "Jun", volume: 67000000 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} RWF`, "Volume"]} />
                      <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="p-6 animate-fadeInUp">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-400">Recent Activities</h2>
                    <select className="px-3 py-2 border focus:outline-none border-gray-300 text-gray-500 rounded-lg text-sm">
                      <option>Last 24 hours</option>
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    {[
                      {
                        color: "blue",
                        title: "New user registration",
                        desc: "John Doe completed KYC verification",
                        time: "2 min ago",
                        icon: <FiUsers className="w-3 h-3 text-blue-400" />,
                      },
                      {
                        color: "green",
                        title: "Large transaction executed",
                        desc: "2,004,000 Rwf BK Group purchase by Client #2847",
                        time: "15 min ago",
                        icon: <FiBarChart2 className="w-3 h-3 text-green-600" />,
                      },
                      {
                        color: "yellow",
                        title: "System alert",
                        desc: "High trading volume detected - monitoring",
                        time: "1 hour ago",
                        icon: <FiAlertTriangle className="w-3 h-3 text-yellow-600" />,
                      },
                      {
                        color: "red",
                        title: "Failed transaction",
                        desc: "Insufficient funds - Order #12847 rejected",
                        time: "2 hours ago",
                        icon: <FiX className="w-3 h-3 text-red-600" />,
                      },
                    ].map((act, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-10 h-10 bg-${act.color}-100 rounded-full flex items-center justify-center mr-4`}
                          >
                            {act.icon}
                          </div>
                          <div>
                            <p className="font-base text-gray-800 mb-2">{act.title}</p>
                            <p className="text-sm text-gray-400">{act.desc}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{act.time}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="p-6 animate-slideInRight">
                  <h3 className="text-lg font-semibold text-gray-600 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Approve KYC", icon: <FiUserCheck /> },
                      { label: "Add Teller", icon: <FiBriefcase /> },
                      { label: "Generate Report", icon: <FiFileText /> },
                      { label: "System Settings", icon: <FiSettings /> },
                    ].map((btn, i) => (
                      <Button key={i} className="w-full justify-start" variant="outline">
                        <span className="mr-3">{btn.icon}</span> {btn.label}
                      </Button>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 animate-slideInRight">
                  <h3 className="text-lg font-semibold text-gray-500 mb-4">
                    System Status
                  </h3>
                  {[
                    { label: "Platform Status", status: "Operational", color: "green" },
                    { label: "RSE Connection", status: "Connected", color: "green" },
                    { label: "Payment Gateway", status: "Active", color: "green" },
                    { label: "Database", status: "Healthy", color: "green" },
                    { label: "Last Backup", status: "2 hours ago" },
                  ].map((sys, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between mb-2 last:mb-0"
                    >
                      <span className="text-sm text-gray-500">{sys.label}</span>
                      {sys.color ? (
                        <span
                          className={`px-2 py-1 bg-${sys.color}-100 text-${sys.color}-500 rounded-full text-sm`}
                        >
                          {sys.status}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500">{sys.status}</span>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          </div>
        </DashboardLayout>
  );
}
