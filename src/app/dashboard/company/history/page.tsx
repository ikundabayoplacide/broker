"use client";

import { useMemo, useState, useEffect } from "react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import axios from "@/lib/axios";
import {
    History,
    ArrowDownToLine,
    ArrowUpFromLine,
    ShoppingCart,
    TrendingDown,
    Filter,
    Download,
    Search,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    RefreshCw
} from "lucide-react";

type HistoryFilter = "all" | "trades" | "transactions";
type StatusFilter = "all" | "completed" | "pending" | "failed";

interface HistoryItem {
    id: string;
    type: string;
    category: string;
    security?: string;
    description: string;
    amount: number;
    quantity?: number;
    price?: number;
    status: string;
    date: string;
}

export default function CompanyHistoryPage() {
    const { user, token } = useAuth();
    const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { displayName, dashboardRole } = useMemo(() => {
        const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
        const fallbackName = user?.email ? user.email.split("@")[0] : "Company";
        return {
            displayName: fullName || fallbackName,
            dashboardRole: "company" as const,
        };
    }, [user]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/company/history?limit=100');
            const data = await response.json();

            if (data.success) {
                const transactions = (data.transactions || []).map((t: any) => ({
                    id: t.id,
                    type: t.type.toLowerCase(),
                    category: 'transaction',
                    description: t.description || `${t.type} transaction`,
                    amount: parseFloat(t.amount),
                    status: t.status.toLowerCase(),
                    date: new Date(t.createdAt).toLocaleString(),
                }));

                const trades = (data.trades || []).map((t: any) => ({
                    id: t.id,
                    type: t.type.toLowerCase(),
                    category: 'trade',
                    security: t.Company_CompanyTrade_targetCompanyIdToCompany?.symbol || 'N/A',
                    description: `${t.type === 'BUY' ? 'Bought' : 'Sold'} ${t.quantity} shares${t.Company_CompanyTrade_targetCompanyIdToCompany?.name ? ` of ${t.Company_CompanyTrade_targetCompanyIdToCompany.name}` : ''}`,
                    amount: parseFloat(t.totalAmount),
                    quantity: t.quantity,
                    price: parseFloat(t.executedPrice || '0'),
                    status: t.status === 'EXECUTED' ? 'completed' : t.status.toLowerCase(),
                    date: new Date(t.createdAt).toLocaleString(),
                }));

                const combined = [...transactions, ...trades].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                setAllHistory(combined);
            }
        } catch (err) {
            console.error('Error fetching company history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const filteredHistory = useMemo(() => {
        const filtered = allHistory.filter((item) => {
            if (historyFilter !== "all") {
                if (historyFilter === "trades" && item.category !== "trade") return false;
                if (historyFilter === "transactions" && item.category !== "transaction") return false;
            }
            if (statusFilter !== "all" && item.status !== statusFilter) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesId = item.id.toLowerCase().includes(query);
                const matchesDesc = item.description.toLowerCase().includes(query);
                const matchesSecurity = item.security?.toLowerCase().includes(query);
                if (!matchesId && !matchesDesc && !matchesSecurity) return false;
            }
            if (dateFrom && new Date(item.date) < new Date(dateFrom)) return false;
            if (dateTo && new Date(item.date) > new Date(dateTo)) return false;
            return true;
        });

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filtered.slice(startIndex, endIndex);
    }, [allHistory, historyFilter, statusFilter, searchQuery, dateFrom, dateTo, currentPage]);

    const totalFilteredCount = useMemo(() => {
        return allHistory.filter((item) => {
            if (historyFilter !== "all") {
                if (historyFilter === "trades" && item.category !== "trade") return false;
                if (historyFilter === "transactions" && item.category !== "transaction") return false;
            }
            if (statusFilter !== "all" && item.status !== statusFilter) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesId = item.id.toLowerCase().includes(query);
                const matchesDesc = item.description.toLowerCase().includes(query);
                const matchesSecurity = item.security?.toLowerCase().includes(query);
                if (!matchesId && !matchesDesc && !matchesSecurity) return false;
            }
            if (dateFrom && new Date(item.date) < new Date(dateFrom)) return false;
            if (dateTo && new Date(item.date) > new Date(dateTo)) return false;
            return true;
        }).length;
    }, [allHistory, historyFilter, statusFilter, searchQuery, dateFrom, dateTo]);

    const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);

    const getTypeIcon = (category: string, type: string) => {
        switch (category) {
            case "trade":
                return type === "buy" ? <ShoppingCart className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />;
            case "deposit":
                return <ArrowDownToLine className="h-5 w-5" />;
            case "withdrawal":
                return <ArrowUpFromLine className="h-5 w-5" />;
            default:
                return <History className="h-5 w-5" />;
        }
    };

    const getTypeColor = (category: string, type: string) => {
        switch (category) {
            case "trade":
                return type === "buy" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";
            case "deposit":
                return "bg-blue-100 text-blue-700";
            case "withdrawal":
                return "bg-purple-100 text-purple-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="h-4 w-4" />;
            case "pending":
                return <Clock className="h-4 w-4" />;
            case "failed":
                return <XCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-emerald-100 text-emerald-700";
            case "pending":
                return "bg-amber-100 text-amber-700";
            case "failed":
                return "bg-rose-100 text-rose-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const refreshHistory = async () => {
        await fetchHistory();
    };

    const exportHistory = () => {
        console.log("Exporting history...");
        // Implementation for CSV/PDF export
    };

    return (
        <DashboardLayout userRole={dashboardRole} userName={displayName}>
            <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Company History</h1>
                        <p className="text-sm md:text-base text-slate-600 mt-1">View all company transactions and trading activity</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={refreshHistory}
                            variant="outline"
                            className="flex items-center gap-2 text-xs md:text-sm shrink-0 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={exportHistory} variant="outline" className="flex items-center gap-2 mr-1 text-xs md:text-sm shrink-0 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                    <Card className="p-2 md:p-4" hover={false}>
                        <div className="flex items-center gap-1.5 md:gap-3">
                            <div className="h-7 w-7 md:h-10 md:w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <History className="h-3.5 w-3.5 md:h-5 md:w-5 text-slate-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] md:text-sm font-medium text-slate-600 truncate">Total</p>
                                {loading ? (
                                    <div className="animate-pulse bg-slate-200 h-4 md:h-6 w-8 md:w-12 rounded mt-1"></div>
                                ) : (
                                    <p className="text-sm md:text-xl font-bold text-slate-900">{allHistory.length}</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-2 md:p-4" hover={false}>
                        <div className="flex items-center gap-1.5 md:gap-3">
                            <div className="h-7 w-7 md:h-10 md:w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <ShoppingCart className="h-3.5 w-3.5 md:h-5 md:w-5 text-emerald-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] md:text-sm font-medium text-slate-600 truncate">Trades</p>
                                {loading ? (
                                    <div className="animate-pulse bg-slate-200 h-4 md:h-6 w-8 md:w-12 rounded mt-1"></div>
                                ) : (
                                    <p className="text-sm md:text-xl font-bold text-slate-900">
                                        {allHistory.filter((h) => h.category === "trade").length}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-2 md:p-4" hover={false}>
                        <div className="flex items-center gap-1.5 md:gap-3">
                            <div className="h-7 w-7 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <History className="h-3.5 w-3.5 md:h-5 md:w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] md:text-sm font-medium text-slate-600 truncate">Transactions</p>
                                {loading ? (
                                    <div className="animate-pulse bg-slate-200 h-4 md:h-6 w-8 md:w-12 rounded mt-1"></div>
                                ) : (
                                    <p className="text-sm md:text-xl font-bold text-slate-900">
                                        {allHistory.filter((h) => h.category === "transaction").length}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="p-3 md:p-6" hover={false}>
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <Filter className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
                        <h2 className="text-sm md:text-lg font-semibold text-slate-900">Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
                        {/* Category Filter */}
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">Category</label>
                            <select
                                value={historyFilter}
                                onChange={(e) => setHistoryFilter(e.target.value as HistoryFilter)}
                                className="w-full rounded-lg md:rounded-xl border border-slate-300 px-2 md:px-3 py-1.5 md:py-2.5 text-xs md:text-sm text-slate-900 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
                            >
                                <option value="all">All</option>
                                <option value="trades">Trades Only</option>
                                <option value="transactions">Transactions Only</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="w-full rounded-lg md:rounded-xl border border-slate-300 px-2 md:px-3 py-1.5 md:py-2.5 text-xs md:text-sm text-slate-900 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
                            >
                                <option value="all">All</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="ID or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 md:pl-10 pr-2 md:pr-3 py-1.5 md:py-2.5 rounded-lg md:rounded-xl border border-slate-300 text-xs md:text-sm focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
                                />
                            </div>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">From</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full pl-8 md:pl-10 pr-2 md:pr-3 py-1.5 md:py-2.5 rounded-lg md:rounded-xl border border-slate-300 text-xs md:text-sm focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
                                />
                            </div>
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">To</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full pl-8 md:pl-10 pr-2 md:pr-3 py-1.5 md:py-2.5 rounded-lg md:rounded-xl border border-slate-300 text-xs md:text-sm focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Count */}
                    {(historyFilter !== "all" || statusFilter !== "all" || searchQuery || dateFrom || dateTo) && (
                        <div className="mt-3 md:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <p className="text-xs md:text-sm text-slate-600">
                                Showing {totalFilteredCount} of {allHistory.length} transactions
                            </p>
                            <button
                                onClick={() => {
                                    setHistoryFilter("all");
                                    setStatusFilter("all");
                                    setSearchQuery("");
                                    setDateFrom("");
                                    setDateTo("");
                                    setCurrentPage(1);
                                }}
                                className="text-xs md:text-sm font-medium text-[#004B5B] hover:underline"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </Card>

                {/* History Table */}
                <Card className="p-3 md:p-6 overflow-hidden" hover={false}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mb-4"></div>
                            <p className="text-slate-600 font-medium">Loading transaction history...</p>
                            <p className="text-sm text-slate-500 mt-1">Please wait while we fetch your data</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-3 md:mx-0">
                            <div className="inline-block min-w-full align-middle px-3 md:px-0">
                                <div className="overflow-hidden">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-2 md:py-3 px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700">ID</th>
                                                <th className="text-left py-2 md:py-3 px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700">Type</th>
                                                <th className="text-left py-2 md:py-3 px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700 hidden lg:table-cell">Description</th>
                                                <th className="text-right py-2 md:py-3 px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700">Amount</th>
                                                <th className="text-left py-2 md:py-3 px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700">Status</th>
                                                <th className="text-left py-2 md:py-3 px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700 hidden md:table-cell">Date</th>
                                                <th className="text-center py-2 md:py-3 px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700 hidden sm:table-cell">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="py-12 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <History className="h-10 w-10 md:h-12 md:w-12 text-slate-300" />
                                                            <p className="text-sm md:text-base text-slate-500">No transactions found</p>
                                                            <p className="text-xs md:text-sm text-slate-400">Try adjusting your filters</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredHistory.map((item, index) => (
                                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                        <td className="py-2 md:py-4 px-1.5 md:px-2 text-xs md:text-base font-medium text-slate-900">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                        <td className="py-2 md:py-4 px-1.5 md:px-2">
                                                            <div className={`inline-flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold ${getTypeColor(item.category, item.type)}`}>
                                                                <span className="hidden sm:inline">{getTypeIcon(item.category, item.type)}</span>
                                                                <span className="capitalize">{item.type}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 md:py-4 px-1.5 md:px-2 hidden lg:table-cell">
                                                            <p className="text-sm md:text-base text-slate-900">{item.description}</p>
                                                            {item.security && (
                                                                <p className="text-xs md:text-sm text-slate-500">
                                                                    {item.quantity} shares @ Rwf {item.price}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className={`text-right py-2 md:py-4 px-1.5 md:px-2 text-xs md:text-base font-semibold whitespace-nowrap ${item.type === "deposit" || item.type === "sell"
                                                                ? "text-emerald-600"
                                                                : "text-slate-900"
                                                            }`}>
                                                            {item.type === "deposit" || item.type === "sell" ? "+" : ""}
                                                            Rwf {item.amount.toLocaleString()}
                                                        </td>
                                                        <td className="py-2 md:py-4 px-1.5 md:px-2">
                                                            <div className={`inline-flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold ${getStatusColor(item.status)}`}>
                                                                <span className="hidden sm:inline">{getStatusIcon(item.status)}</span>
                                                                <span className="capitalize">{item.status}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 md:py-4 px-1.5 md:px-2 text-xs md:text-sm text-slate-600 whitespace-nowrap hidden md:table-cell">{item.date}</td>
                                                        <td className="py-2 md:py-4 px-1.5 md:px-2 text-center hidden sm:table-cell">
                                                            <Button size="sm" variant="outline" className="text-[10px] md:text-xs px-2 md:px-3 py-1 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200">
                                                                View
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalFilteredCount > 0 && (
                        <div className="mt-4 md:mt-6 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200 pt-4 gap-3">
                            <p className="text-xs md:text-sm text-slate-600">
                                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalFilteredCount)} of {totalFilteredCount} transactions
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="text-xs md:text-sm hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                                >
                                    Previous
                                </Button>
                                <span className="text-xs md:text-sm text-slate-600 px-3 py-2">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="text-xs md:text-sm hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
