"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
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
} from "react-icons/fi";
import toast from "react-hot-toast";

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

  const summaryCards = [
    {
      title: "Active Users",
      value: userStats.active.toLocaleString(),
      subtitle: `${userStats.total.toLocaleString()} accross all roles`,
      icon: <FiUsers className="w-6 h-6 text-white" />,
      gradient: "bg-gradient-to-r from-[#004B5B] to-[#008195]",
      link: "/dashboard/super-admin/users",
    },
    {
      title: "Listed Companies",
      value: companyStats.total.toLocaleString(),
      subtitle: companyStats.pending > 0 ? `${companyStats.pending} pending review` : "All approved",
      icon: <FiBriefcase className="w-6 h-6 text-blue-400" />,
      accent: "bg-blue-100 text-blue-500",
      link: "/dashboard/super-admin/companies",
    },
    {
      title: "System Health",
      value: "99.99%",
      subtitle: "Uptime last 30 days",
      icon: <FiCpu className="w-6 h-6 text-green-400" />,
      accent: "bg-green-100 text-green-600",
      link: null,
    },
    {
      title: "Security Alerts",
      value: "2",
      subtitle: "Require attention",
      icon: <FiLock className="w-6 h-6 text-red-400" />,
      accent: "bg-red-100 text-red-600",
      link: null,
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

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
      <div className="space-y-6">
        <div className="animate-fadeInUp space-y-2">
          <h1 className="text-2xl font-bold text-gray-600">Super Admin Overview</h1>
          <p className="text-base text-gray-400">
            Govern user access, company listings, and platform health from a single control centre.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideInRight">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className={card.link ? "cursor-pointer" : ""}
              onClick={() => card.link && router.push(card.link)}
            >
              <Card className={`p-6 hover:shadow-lg transition-all ${
                card.link ? "hover:scale-105" : ""
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-medium text-gray-500 mb-5">{card.title}</p>
                    <p className="text-xl font-semibold text-gray-700">{card.value}</p>
                    <p className="text-sm text-gray-400">{card.subtitle}</p>
                  </div>
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      card.gradient || card.accent || "bg-gray-100"
                    }`}
                  >
                    {card.icon}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <Card className="p-6 lg:col-span-2 animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-500">Platform Oversight</h2>
              <Button variant="outline" className="text-sm">
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

          <div className="space-y-6 animate-slideInRight">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-600 mb-4">Quick Actions</h3>
              <div className="space-y-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    className="w-full justify-start"
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

            <Card className="p-6">
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
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 ">
            <div className="w-full max-w-4xl max-h-[100vh] overflow-y-auto">
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
