"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  DollarSign,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [walletData, setWalletData] = useState({ balance: 0, lockedBalance: 0 });
  const [portfolioData, setPortfolioData] = useState({ totalValue: 0, totalInvested: 0, holdings: 0 });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [marketStatus, setMarketStatus] = useState<{ label: string; isOpen: boolean } | null>(null);

  const { displayName, email, dashboardRole } = useMemo((): {
    displayName: string;
    email: string;
    dashboardRole: "company";
  } => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "Company";

    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      dashboardRole: "company",
    };
  }, [user?.email, user?.fullName]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);

        // Fetch company details
        const companyRes = await fetch(`/api/company/details?companyId=${user.id}`);
        if (companyRes.ok) {
          const data = await companyRes.json();
          setCompanyData(data.company);
        }

        // Fetch wallet data
        const walletRes = await fetch(`/api/company/wallet`);
        if (walletRes.ok) {
          const data = await walletRes.json();
          setWalletData({
            balance: parseFloat(data.wallet?.balance || "0"),
            lockedBalance: parseFloat(data.wallet?.lockedBalance || "0"),
          });
        }

        // Fetch portfolio data
        const portfolioRes = await fetch(`/api/company/portfolio?userId=${user.id}`);
        if (portfolioRes.ok) {
          const data = await portfolioRes.json();
          setPortfolioData({
            totalValue: data.summary?.totalCurrentValue || 0,
            totalInvested: data.summary?.totalInvested || 0,
            holdings: data.summary?.totalHoldings || 0,
          });
        }

        // Fetch recent trades
        const tradesRes = await fetch(`/api/company/trade/history?limit=5`);
        if (tradesRes.ok) {
          const data = await tradesRes.json();
          setRecentTrades(data.trades || []);
        }

        // Fetch market status
        const marketRes = await fetch("/api/market-summary");
        if (marketRes.ok) {
          const data = await marketRes.json();
          if (data.marketStatus) {
            setMarketStatus({
              label: data.marketStatus.label,
              isOpen: data.marketStatus.isOpen,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  const priceChartData = useMemo(() => {
    const data = [];
    const basePrice = companyData?.sharePrice ? Number(companyData.sharePrice) : 250;
    for (let i = 0; i < 30; i++) {
      const variance = (Math.random() - 0.5) * 10;
      data.push({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        price: Math.max(0, basePrice + variance),
      });
    }
    return data;
  }, [companyData?.sharePrice]);

  const priceChange = companyData?.priceChange ? parseFloat(companyData.priceChange) : 0;
  const sharePrice = companyData?.sharePrice ? Number(companyData.sharePrice) : 0;
  const closingPrice = companyData?.closingPrice ? Number(companyData.closingPrice) : sharePrice;
  const marketCap = companyData?.marketCap ? Number(companyData.marketCap) : 0;
  const tradedVolume = companyData?.tradedVolume ? Number(companyData.tradedVolume) : 0;
  const availableShares = companyData?.availableShares ? Number(companyData.availableShares) : 0;



  if (loading) {
    return (
      <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">{companyData?.name || 'Company Dashboard'}</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">Monitor your stock performance and trading activity</p>
          </div>
          {marketStatus && (
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${marketStatus.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {marketStatus.isOpen ? '● Market Open' : '● Market Closed'}
            </span>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Share Price</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Rwf {sharePrice.toFixed(2)}</p>
                <div className="flex items-center gap-1 mt-2">
                  {priceChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-rose-500" />
                  )}
                  <span className={`text-sm font-semibold ${priceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Wallet Balance</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Rwf {walletData.balance.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2">Available funds</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Portfolio Value</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Rwf {portfolioData.totalValue.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2">{portfolioData.holdings} holdings</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <PieChart className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Available Shares</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{availableShares.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2">For trading</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Activity className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Price Chart */}
        <Card className="p-4 md:p-6" hover={false}>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Share Price Performance</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">Last 30 days</p>
            </div>
          </div>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceChartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#004B5B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#004B5B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(value) => `${value.toFixed(0)}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [`Rwf ${value.toFixed(2)}`, 'Share Price']}
                />
                <Area type="monotone" dataKey="price" stroke="#004B5B" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Trades */}
        <Card className="p-4 md:p-6" hover={false}>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900">Recent Trades</h2>
            <Link href="/dashboard/company/history">
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </div>
          {recentTrades.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Type</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Security</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Quantity</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Price</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Total</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${trade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-900">{trade.company?.symbol || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-900">{trade.quantity}</td>
                      <td className="py-2 px-3 text-slate-900">Rwf {parseFloat(trade.executedPrice || '0').toFixed(2)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">Rwf {parseFloat(trade.totalAmount).toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${trade.status === 'EXECUTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Link href="/dashboard/company/trade">
            <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer" hover={true}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Trade Stocks</p>
                  <p className="text-xs text-slate-500">Buy & sell shares</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/company/wallet">
            <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer" hover={true}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Manage Wallet</p>
                  <p className="text-xs text-slate-500">Deposits & withdrawals</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/company/investments">
            <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer" hover={true}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Portfolio</p>
                  <p className="text-xs text-slate-500">View investments</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/company/history">
            <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer" hover={true}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Trade History</p>
                  <p className="text-xs text-slate-500">View all trades</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
