"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import "./globals.css";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { CompanyCreateForm, type CompanySummary } from "@/components/company/CompanyCreateForm";
import {
  FiUsers,
  FiBriefcase,
  FiCpu,
  FiLock,
  FiSettings,
  FiPlus,
  FiAlertTriangle,
  FiTrendingUp,
  FiMapPin,
  FiDollarSign,
  FiPercent,
  FiPieChart,
  FiShoppingBag,
  FiPrinter,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { FaBuilding } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels);

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { stats: userStats } = useUserStats();

  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (!token) {
        setCompanies([]);
        return;
      }

      setCompaniesLoading(true);
      setCompaniesError(null);

      try {
        const response = await fetch("/api/company", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load companies");
        }

        const result = await response.json();
        const data = (result?.data ?? []) as CompanySummary[];
        setCompanies(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load companies";
        setCompaniesError(message);
        toast.error(message);
      } finally {
        setCompaniesLoading(false);
      }
    };

    fetchCompanies();
  }, [token]);

  const { displayName, email, dashboardRole } = useMemo((): {
    displayName: string;
    email: string;
    dashboardRole: "super-admin";
  } => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "Super Admin";

    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      dashboardRole: "super-admin",
    };
  }, [user?.email, user?.fullName]);

  const companyStats = useMemo(() => {
    const total = companies.length;
    const pending = companies.filter((c) => c.status === "pending").length;
    return { total, pending };
  }, [companies]);

  const tradingVolumeData = [
    { date: "Jan 15", volume: 1850000 },
    { date: "Jan 16", volume: 1920000 },
    { date: "Jan 17", volume: 1780000 },
    { date: "Jan 18", volume: 2100000 },
    { date: "Jan 19", volume: 1950000 },
    { date: "Jan 20", volume: 2200000 },
    { date: "Jan 21", volume: 2004000 },
  ];

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];
  
  const companySharesData = useMemo(() => {
    // Debug: log raw data

    const validCompanies = companies.filter(company => {
      const shares = Number(company.availableShares) || 0;
      return shares > 0;
    });
    
    
    const totalAvailableShares = validCompanies.reduce((sum, company) => {
      return sum + (Number(company.availableShares) || 0);
    }, 0);
    
    
    return validCompanies.map((company, index) => {
      const shares = Number(company.availableShares) || 0;
      const percentage = totalAvailableShares > 0 ? ((shares / totalAvailableShares) * 100).toFixed(1) : '0';
      console.log(`${company.name}: ${shares} shares = ${percentage}%`);
      return {
        name: company.name,
        shares,
        percentage: Number(percentage),
        color: colors[index % colors.length]
      };
    });
  }, [companies]);

  const summaryCards = [
    {
      title: "Active Users",
      value: userStats.total.toLocaleString(),
      subtitle: `${userStats.total.toLocaleString()} across all roles`,
      icon: <FiUsers className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-blue-500 to-blue-600",
      link: "/dashboard/super-admin/users",
    },
    {
      title: "Registered Companies",
      value: companyStats.total.toLocaleString(),
      subtitle: companyStats.pending > 0 ? `${companyStats.pending} pending review` : "All approved",
      icon: <FiBriefcase className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-purple-500 to-purple-600",
      link: "/dashboard/companies",
    },
    {
      title: "System Uptime",
      value: "99.99%",
      subtitle: "Last 30 days performance",
      icon: <FiCpu className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-green-500 to-green-600",
      link: null,
    },
    {
      title: "Daily Trading Volume",
      value: "2,004,000 RWF",
      change: "+8.5% from yesterday",
      icon: <FiDollarSign className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      link: null,
    },
    {
      title: "Active Branches",
      value: "2",
      subtitle: "Trading locations",
      icon: <FaBuilding className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-indigo-500 to-indigo-600",
      link: null,
    },
    {
      title: "Current Trading Rate",
      value: "1.25%",
      subtitle: "Market commission",
      icon: <FiPercent className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-orange-500 to-orange-600",
      link: null,
    },
    {
      title: "Total Market Shares",
      value: companies.reduce((sum, c) => sum + (Number(c.totalShares) || 0), 0).toLocaleString(),
      subtitle: "All issued shares",
      icon: <FiPieChart className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-teal-500 to-teal-600",
      link: null,
    },
    {
      title: "Available for Trading",
      value: companySharesData.reduce((sum, c) => sum + c.shares, 0).toLocaleString(),
      subtitle: "Shares ready to trade",
      icon: <FiShoppingBag className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-rose-500 to-rose-600",
      link: "/dashboard/super-admin/shares",
    },
  ];

  const oversightHighlights = [
    {
      label: "User onboarding",
      detail: "24 new accounts awaiting verification",
      status: "Review",
      color: "yellow",
    },
    {
      label: "KYC backlog",
      detail: "11 documents flagged for manual review",
      status: "Action",
      color: "orange",
    },
    {
      label: "API traffic",
      detail: "Avg latency 180ms (SLA 250ms)",
      status: "Healthy",
      color: "green",
    },
  ];

  type QuickActionId = "create-company";

  interface QuickAction {
    label: string;
    description: string;
    icon: JSX.Element;
    id?: QuickActionId;
  }

  const quickActions: QuickAction[] = [
    { label: "Create Company", icon: <FiPlus />, description: "List a new issuer", id: "create-company" },
    { label: "Invite Admin", icon: <FiUsers />, description: "Provision platform administrators" },
    { label: "Review Alerts", icon: <FiAlertTriangle />, description: "Address outstanding incidents" },
    { label: "Platform Settings", icon: <FiSettings />, description: "Configure global policies" },
  ];

  const handleQuickActionClick = (action: QuickAction) => {
    if (action.id === "create-company") {
      setShowCreateModal(true);
      return;
    }

    toast("Coming soon");
  };

  const handleCompanyCreated = (company: CompanySummary) => {
    setCompanies((prev) => {
      const filtered = prev.filter((item) => item.id !== company.id);
      return [company, ...filtered];
    });
    setShowCreateModal(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
      <div className="space-y-6 print:space-y-4">
        <div className="hidden print:block print:mb-4 text-right">
          <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="animate-fadeInUp space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-600">Super Admin Overview</h1>
              <p className="text-base text-gray-400">
                Govern user access, company listings, and platform health from a single control centre.
              </p>
            </div>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="print:hidden flex items-center gap-2"
            >
              <FiPrinter className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideInRight print:grid-cols-2 print:gap-2">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className={card.link ? "cursor-pointer" : ""}
              onClick={() => card.link && router.push(card.link)}
            >
              <Card className={`p-6 hover:shadow-lg transition-all ${card.link ? "hover:scale-105" : ""
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-medium text-gray-500 mb-5">{card.title}</p>
                    <p className="text-xl font-semibold text-gray-700">{card.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{card.subtitle || card.change}</p>
                  </div>
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center ${card.gradient || "bg-gray-100"
                      }`}
                  >
                    {card.icon}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <Card className="p-6 mb-6 animate-fadeInUp print:break-inside-avoid">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-500">Trading Volume Trends</h2>
            <Button variant="outline" className="text-sm">
              View full report
            </Button>
          </div>
          <div className="h-80 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={320} minHeight={320}>
              <LineChart data={tradingVolumeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="1 1" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} RWF`, "Volume"]}
                  labelStyle={{ color: "#374151" }}
                  contentStyle={{ 
                    backgroundColor: "white", 
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px"
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mb-6 print:block print:space-y-4">
          <Card className="p-6 lg:col-span-2 animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-500">Company Shares Distribution</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Total Available: {companySharesData.reduce((sum, c) => sum + c.shares, 0).toLocaleString()} shares
                </p>
              </div>
              <Button variant="outline" className="text-sm print:hidden">
                View details
              </Button>
            </div>
            {companySharesData.length > 0 ? (
              <div className="flex items-center justify-between">
                <div className="w-80 h-80 flex-shrink-0">
                  <Doughnut
                    data={{
                      labels: companySharesData.map(company => company.name),
                      datasets: [
                        {
                          data: companySharesData.map(company => company.shares),
                          backgroundColor: companySharesData.map(company => company.color),
                          borderWidth: 2,
                          borderColor: '#ffffff',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      aspectRatio: 1,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0);
                              const parsed = Number(context.parsed) || 0;
                              const percentage = total > 0 ? ((parsed / total) * 100).toFixed(1) : '0';
                              return `${context.label}: ${parsed.toLocaleString()} shares (${percentage}%)`;
                            }
                          }
                        },
                        datalabels: {
                          display: true,
                          color: 'white',
                          font: {
                            weight: 'bold',
                            size: 14
                          },
                          formatter: (value, context) => {
                            const companyIndex = context.dataIndex;
                            const company = companySharesData[companyIndex];
                            return company && company.percentage > 3 ? `${company.percentage.toFixed(1)}%` : '';
                          }
                        }
                      },
                      cutout: '50%',
                    }}
                  />
                </div>
                <div className="flex-1 ml-8">
                  <div className="space-y-4">
                    {companySharesData.map((company) => {
                      const totalShares = companySharesData.reduce((sum, c) => sum + c.shares, 0);
                      const percentage = ((company.shares / totalShares) * 100).toFixed(1);
                      return (
                        <div key={company.name} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3" 
                              style={{ backgroundColor: company.color }}
                            ></div>
                            <span className="text-sm font-medium text-gray-700">{company.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-800">{percentage}%</div>
                            <div className="text-xs text-gray-600">{company.shares.toLocaleString()} shares</div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700">Total</span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {(() => {
                              const totalShares = companySharesData.reduce((sum, c) => sum + c.shares, 0);
                              const sumPercentages = companySharesData.reduce((sum, c) => {
                                const pct = Number(((c.shares / totalShares) * 100).toFixed(1)) || 0;
                                return sum + pct;
                              }, 0);
                              return `${sumPercentages.toFixed(1)}%`;
                            })()}
                          </div>
                          <div className="text-xs text-gray-600">
                            {companySharesData.reduce((sum, c) => sum + c.shares, 0).toLocaleString()} shares
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-400">
                <p>No companies with available shares found</p>
              </div>
            )}
          </Card>

          <Card className="p-6 animate-slideInRight print:hidden">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  className="w-full justify-start h-auto py-3"
                  variant="outline"
                  onClick={() => handleQuickActionClick(action)}
                >
                  <span className="mr-3 text-[#004B5B]">{action.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-600">{action.label}</p>
                    <p className="text-xs text-gray-400">{action.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start print:block print:space-y-4">
          <Card className="p-6 lg:col-span-2 animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-500">Platform Oversight</h2>
              <Button variant="outline" className="text-sm print:hidden">
                View detailed report
              </Button>
            </div>
            <div className="space-y-4">
              {oversightHighlights.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="font-medium text-gray-700 mb-1">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.detail}</p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full bg-${item.color}-100 text-${item.color}-600`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 animate-slideInRight print:break-inside-avoid">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">Recently Listed Companies</h3>
            {companiesLoading ? (
              <p className="text-sm text-gray-400">Loading companies…</p>
            ) : companiesError ? (
              <p className="text-sm text-red-500">{companiesError}</p>
            ) : companies.length === 0 ? (
              <p className="text-sm text-gray-400">
                No companies listed yet. Use the quick action above to add one.
              </p>
            ) : (
              <ul className="space-y-4">
                {companies.slice(0, 5).map((company) => (
                  <li
                    key={company.id}
                    className="flex items-start justify-between rounded-lg border border-gray-100 p-4 hover:border-[#004B5B]/40 transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{company.name}</p>
                      {company.sector && (
                        <p className="text-xs uppercase tracking-wide text-[#004B5B]">{company.sector}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 ">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CompanyCreateForm
                authToken={token}
                onCreated={handleCompanyCreated}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
