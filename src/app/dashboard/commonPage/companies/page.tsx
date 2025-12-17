"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardLayout from "@/components/ui/DashboardLayout";
import { CompanyCreateForm, CompanySummary } from "@/components/company/CompanyCreateForm";
import { CompanyManageForm } from "@/components/company/CompanyManageForm";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { Search, Filter, RefreshCcw, Loader2, Eye, Pencil, Trash2, X, Building2, Plus, Printer, FileText, Download } from "lucide-react";
import toast from "react-hot-toast";
import MarketSyncButton from "@/components/market/MarketSyncButton";
import ReportModal, { ReportConfig } from "@/components/models/ReportModal";
import { ReportGenerator } from "@/utils/reportGenerator";

type ManagementMode = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER";

type DashboardRole = "client" | "teller" | "admin" | "manager" | "super-admin" | "company";

interface ModeConfig {
  dashboardRole: DashboardRole;
  title: string;
  subtitle: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  emptyMessage: string;
}

const MODE_CONFIG: Record<ManagementMode, ModeConfig> = {
  SUPER_ADMIN: {
    dashboardRole: "super-admin",
    title: "Companies",
    subtitle: "Create and manage company listings.",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyMessage: "No companies listed yet. Use the form to add one.",
  },
  ADMIN: {
    dashboardRole: "admin",
    title: "Companies",
    subtitle: "Create and manage company listings.",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyMessage: "No companies listed yet. Use the form to add one.",
  },
  MANAGER: {
    dashboardRole: "manager",
    title: "Companies",
    subtitle: "View and manage company listings.",
    canCreate: false,
    canEdit: true,
    canDelete: false,
    emptyMessage: "No companies available yet. Check back once companies are listed.",
  },
  TELLER: {
    dashboardRole: "teller",
    title: "Company directory",
    subtitle: "Browse companies to answer client questions.",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    emptyMessage: "No companies available yet. Check back once the operations team lists them.",
  },
};

const normalizeAuthRole = (role?: string | null): ManagementMode => {
  const normalized = role?.toUpperCase().replace(/-/g, "_");
  switch (normalized) {
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "MANAGER":
      return "MANAGER";
    case "TELLER":
      return "TELLER";
    default:
      return "ADMIN";
  }
};

const ROWS_PER_PAGE = 6;

const sectorLabel = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Uncategorized";
};

const sortCompaniesBySector = (companies: CompanySummary[]) => {
  return [...companies].sort((a, b) => {
    const sectorA = sectorLabel(a.sector).toLowerCase();
    const sectorB = sectorLabel(b.sector).toLowerCase();

    if (sectorA < sectorB) return -1;
    if (sectorA > sectorB) return 1;

    return a.name.localeCompare(b.name);
  });
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
    <p className="text-sm text-gray-700">{value}</p>
  </div>
);

export default function CompaniesPage() {
  const { user, token } = useAuth();
  const mode = useMemo<ManagementMode>(() => normalizeAuthRole(user?.role), [user?.role]);
  const config = MODE_CONFIG[mode];

  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewCompany, setViewCompany] = useState<CompanySummary | null>(null);
  const [editCompany, setEditCompany] = useState<CompanySummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CompanySummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfReportOpen, setPdfReportOpen] = useState(false);
  const [wordReportOpen, setWordReportOpen] = useState(false);

  const displayMeta = useMemo(() => {
    const fullName = typeof user?.fullName === "string" ? user.fullName.trim() : "";
    const emailFallback = user?.email ? user.email.split("@")[0] : config.title;
    return {
      name: fullName || emailFallback || config.title,
      email: user?.email ?? "",
    };
  }, [user?.fullName, user?.email, config.title]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/company", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const body = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to fetch companies");
      }

      const list = Array.isArray(body?.data) ? (body?.data as CompanySummary[]) : [];
      setCompanies(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch companies";
      setError(message);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sectorFilter]);

  const sortedCompanies = useMemo(() => sortCompaniesBySector(companies), [companies]);

  const sectorOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const company of sortedCompanies) {
      unique.add(sectorLabel(company.sector));
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [sortedCompanies]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return sortedCompanies.filter((company) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        company.name.toLowerCase().includes(normalizedSearch) ||
        (company.sector?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (company.description?.toLowerCase().includes(normalizedSearch) ?? false);
      const matchesSector = sectorFilter === "All" || sectorLabel(company.sector) === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [sortedCompanies, search, sectorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / ROWS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedCompanies = useMemo(
    () =>
      filteredCompanies.slice(
        (currentPage - 1) * ROWS_PER_PAGE,
        currentPage * ROWS_PER_PAGE,
      ),
    [filteredCompanies, currentPage],
  );

  const startIndex =
    filteredCompanies.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex =
    filteredCompanies.length === 0
      ? 0
      : Math.min(currentPage * ROWS_PER_PAGE, filteredCompanies.length);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCompanies();
    setRefreshing(false);
  };

  const handleCompanyCreated = (company: CompanySummary) => {
    setCompanies((prev) => [...prev, company]);
    setIsCreateOpen(false);
  };

  const handleCompanyUpdated = (company: CompanySummary) => {
    setCompanies((prev) => prev.map((item) => (item.id === company.id ? company : item)));
    setEditCompany(null);
  };

  const handleDeleteCompany = async () => {
    if (!pendingDelete) return;
    if (!token) {
      toast.error("Missing authentication token. Please sign in again.");
      return;
    }

    const companyId = pendingDelete.id;
    setDeletingId(companyId);

    try {
      const response = await fetch(`/api/company/${companyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = await response.json().catch(() => undefined);
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to delete company");
      }

      setCompanies((prev) => prev.filter((company) => company.id !== companyId));
      toast.success("Company removed");
      setPendingDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete company";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const formatSnapshot = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return "—";
    }
    return date.toLocaleDateString();
  };

  const companyReportFields = [
    { key: 'name', label: 'Company Name' },
    { key: 'sector', label: 'Sector' },
    { key: 'sharePrice', label: 'Share Price' },
    { key: 'closingPrice', label: 'Closing Price' },
    { key: 'totalShares', label: 'Total Shares' },
    { key: 'availableShares', label: 'Available Shares' },
    { key: 'priceChange', label: 'Price Change' },
    { key: 'tradedVolume', label: 'Traded Volume' },
    { key: 'tradedValue', label: 'Traded Value' },
    { key: 'description', label: 'Description' },
    { key: 'snapshotDate', label: 'Snapshot Date' }
  ];

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Companies Report</title>
          <style>
            @media print {
              @page { size: A4; margin: 1in; }
              body { font-family: Arial, sans-serif; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .header { text-align: center; margin-bottom: 20px; }
              .logo { width: 80px; height: auto; margin-bottom: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/logo.svg" alt="Company Logo" class="logo" />
            <h1>Companies Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Company</th>
                <th>Sector</th>
                <th>Share Price</th>
                <th>Total Shares</th>
                <th>Available Shares</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCompanies.map((company, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${company.name}</td>
                  <td>${sectorLabel(company.sector)}</td>
                  <td>${company.sharePrice ?? "—"}</td>
                  <td>${company.totalShares?.toLocaleString() ?? "—"}</td>
                  <td>${company.availableShares?.toLocaleString() ?? "—"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(printContent);
      iframeDoc.close();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }
  };

  const handleGenerateReport = async (config: ReportConfig) => {
    try {
      const reportData = filteredCompanies.map(company => ({
        name: company.name,
        sector: sectorLabel(company.sector),
        sharePrice: company.sharePrice ?? "—",
        closingPrice: company.closingPrice ?? "—",
        totalShares: company.totalShares?.toLocaleString() ?? "—",
        availableShares: company.availableShares?.toLocaleString() ?? "—",
        priceChange: company.priceChange ?? "—",
        tradedVolume: company.tradedVolume ?? "—",
        tradedValue: company.tradedValue ?? "—",
        description: company.description ?? "—",
        snapshotDate: formatSnapshot(company.snapshotDate)
      }));

      const reportInfo = {
        title: 'Companies Report',
        data: reportData,
        fields: companyReportFields.filter(field => config.selectedFields.includes(field.key)),
        dateRange: { start: config.startDate, end: config.endDate }
      };

      if (config.format === 'pdf') {
        await ReportGenerator.generatePDF(reportInfo, config);
      } else if (config.format === 'word') {
        await ReportGenerator.generateWord(reportInfo, config);
      }
      
      toast.success(`${config.format.toUpperCase()} report generated successfully`);
    } catch (error) {
      toast.error(`Failed to generate ${config.format} report`);
    }
  };

  return (
    <DashboardLayout
      userRole={config.dashboardRole}
      userName={displayMeta.name}
      userEmail={displayMeta.email}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-[#004B5B]" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-gray-600">{config.title}</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">{config.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setPdfReportOpen(true)}
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setWordReportOpen(true)}
            >
              <Download className="h-4 w-4" />
              Word
            </Button>
            <MarketSyncButton />
            {config.canCreate ? (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New company
              </Button>
            ) : null}
          </div>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search companies by name or description"
                className="w-full rounded-lg border border-gray-200 px-10 py-2.5 text-sm text-gray-700 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <select
                  value={sectorFilter}
                  onChange={(event) => setSectorFilter(event.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/30"
                >
                  <option value="All">All sectors</option>
                  {sectorOptions.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="text-sm"
                onClick={() => {
                  setSearch("");
                  setSectorFilter("All");
                }}
                disabled={search.length === 0 && sectorFilter === "All"}
              >
                Clear filters
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleRefresh}
                disabled={refreshing || loading}
              >
                {refreshing || loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                <span>{refreshing || loading ? "Refreshing..." : "Refresh"}</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-[#004B5B]/10 text-xs uppercase text-[#004B5B]">
                <tr>
                  <th className="p-1 text-left">No</th>
                  <th className="p-3 text-left">Company</th>
                  <th className="p-3 text-left">Sector</th>
                  <th className="p-3 text-left">Share price</th>
                  <th className="p-3 text-left">Total shares</th>
                  <th className="p-3 text-left">Available shares</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#004B5B]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading companies...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-red-500">
                      <div className="space-y-2">
                        <p>{error}</p>
                        <Button variant="secondary" size="sm" onClick={() => void fetchCompanies()}>
                          Try again
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      {config.emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedCompanies.map((company, index) => (
                    <motion.tr
                      key={company.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3">{startIndex + index}</td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700">{company.name}</span>
                          {company.description ? (
                            <span className="text-xs text-gray-400 line-clamp-1">{company.description}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3">{sectorLabel(company.sector)}</td>
                      <td className="p-3">{company.sharePrice ?? "—"}</td>
                      <td className="p-3">{company.totalShares?.toLocaleString() ?? "—"}</td>
                      <td className="p-3">{company.availableShares?.toLocaleString() ?? "—"}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewCompany(company)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#004B5B] shadow-sm transition hover:border-[#004B5B] hover:bg-[#004B5B] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#004B5B]/40 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`View ${company.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {config.canEdit ? (
                            <button
                              type="button"
                              onClick={() => setEditCompany(company)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm transition hover:border-amber-500 hover:bg-amber-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Edit ${company.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {config.canDelete ? (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(company)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:border-red-500 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={deletingId === company.id}
                              aria-label={`Delete ${company.name}`}
                            >
                              {deletingId === company.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-sm text-gray-500">
              {filteredCompanies.length === 0
                ? "Showing 0 of 0"
                : `Showing ${startIndex}–${endIndex} of ${filteredCompanies.length}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`px-4 py-2 ${currentPage === 1 ? "cursor-not-allowed opacity-60" : ""}`}
                onClick={currentPage === 1 ? undefined : handlePrevious}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {filteredCompanies.length === 0 ? 0 : currentPage} of {filteredCompanies.length === 0 ? 0 : totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className={`px-4 py-2 ${currentPage === totalPages ? "cursor-not-allowed opacity-60" : ""}`}
                onClick={currentPage === totalPages ? undefined : handleNext}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {isCreateOpen ? (
          <motion.div
            key="create-company"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl"
            >
              <div className="relative max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Add a new company</h3>
                    <p className="text-sm text-gray-500">Publish issuers to the shared directory.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close create company modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CompanyCreateForm
                  authToken={token ?? null}
                  onCreated={handleCompanyCreated}
                  withCard={false}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {viewCompany ? (
          <motion.div
            key="view-company"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl"
            >
              <div className="relative max-h-[90vh] space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">{viewCompany.name}</h3>
                    <p className="text-sm text-gray-500">{sectorLabel(viewCompany.sector)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewCompany(null)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close company details"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Share price" value={viewCompany.sharePrice ?? "—"} />
                  <DetailItem label="Closing price" value={viewCompany.closingPrice ?? "—"} />
                  <DetailItem label="Available shares" value={viewCompany.availableShares?.toLocaleString() ?? "—"} />
                  <DetailItem label="Total shares" value={viewCompany.totalShares?.toLocaleString() ?? "—"} />
                  <DetailItem label="Price change" value={viewCompany.priceChange ?? "—"} />
                  <DetailItem label="Traded volume" value={viewCompany.tradedVolume ?? "—"} />
                  <DetailItem label="Traded value" value={viewCompany.tradedValue ?? "—"} />
                  <DetailItem label="Snapshot date" value={formatSnapshot(viewCompany.snapshotDate)} />
                </div>

                {viewCompany.description ? (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-gray-600">Description</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{viewCompany.description}</p>
                  </div>
                ) : null}

                {viewCompany.contract ? (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-gray-600">Contract</h4>
                    <p className="wrap-break-word text-sm text-gray-500 leading-relaxed">{viewCompany.contract}</p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editCompany && config.canEdit ? (
          <motion.div
            key="edit-company"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl"
            >
              <div className="relative max-h-[90vh] space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Edit company</h3>
                    <p className="text-sm text-gray-500">{editCompany.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditCompany(null)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close edit company modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CompanyManageForm
                  company={editCompany}
                  authToken={token ?? null}
                  onUpdated={handleCompanyUpdated}
                  withCard={false}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && config.canDelete ? (
          <motion.div
            key="delete-company"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg"
            >
              <div className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Remove company</h3>
                    <p className="text-sm text-gray-500">
                      Are you sure you want to remove {pendingDelete.name}? This action cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(null)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close delete confirmation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPendingDelete(null)}
                    disabled={deletingId !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-500 bg-red-500 text-white hover:bg-red-600"
                    onClick={handleDeleteCompany}
                    disabled={deletingId !== null}
                  >
                    {deletingId !== null ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Removing...
                      </span>
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ReportModal
        isOpen={pdfReportOpen}
        onClose={() => setPdfReportOpen(false)}
        onGenerate={handleGenerateReport}
        title="Companies PDF"
        availableFields={companyReportFields}
        format="pdf"
      />

      <ReportModal
        isOpen={wordReportOpen}
        onClose={() => setWordReportOpen(false)}
        onGenerate={handleGenerateReport}
        title="Companies Word"
        availableFields={companyReportFields}
        format="word"
      />
    </DashboardLayout>
  );
}
