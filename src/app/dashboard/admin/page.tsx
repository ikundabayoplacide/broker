"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
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
} from "react-icons/fi";

export default function AdminDashboard() {
  const { user } = useAuth();

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

  return (
        <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
          <div className="space-y-6">
            <div className="animate-fadeInUp">
              <h1 className="text-2xl font-bold text-gray-500">Admin Dashboard</h1>
                <p className="text-base text-gray-400">
                Manage clients, tellers, and oversee platform operations.
              </p>
            </div>

            <div className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideInRight">
              {[
                {
                  title: "Total Clients",
                  value: "2,847",
                  change: "+12% this month",
                  icon: <FiUsers className="w-6 h-6 text-white" />,
                  color: "bg-gradient-to-r from-[#004B5B] to-[#006B7D]",
                },
                {
                  title: "Active Tellers",
                  value: "8",
                  change: "All operational",
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
                  title: "Pending KYC",
                  value: "23",
                  change: "Requires review",
                  icon: <FiShield className="w-6 h-6 text-orange-400" />,
                  bg: "bg-orange-100",
                  textColor: "text-orange-600",
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
                  title: "New Clients",
                  value: "156",
                  change: "Joined this week",
                  icon: <FiUserCheck className="w-6 h-6 text-indigo-400" />,
                  bg: "bg-indigo-100",
                  textColor: "text-indigo-600",
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
                      <p className="text-base font-medium text-gray-500 mb-5">{item.title}</p>
                      <p className="text-xs font-bold text-gray-600">{item.value}</p>
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
