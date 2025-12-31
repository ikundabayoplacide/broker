"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMarketSync } from "@/hooks/useMarketSync";
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
  Building2,
  Share,
  Calculator,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function CompanyDashboard() {
  const { user } = useAuth();
  useMarketSync();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [walletData, setWalletData] = useState({ balance: 0, lockedBalance: 0 });
  const [portfolioData, setPortfolioData] = useState({ totalValue: 0, totalInvested: 0, holdings: 0 });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [marketStatus, setMarketStatus] = useState<{ label: string; isOpen: boolean } | null>(null);
  const [tradingData, setTradingData] = useState<any[]>([]);
  const [yearlyTradingData, setYearlyTradingData] = useState<any[]>([]);

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
        const companyRes = await fetch(`/api/company/details`);
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
        const portfolioRes = await fetch(`/api/company/portfolio`);
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

        // Fetch trading analytics for both periods
        const monthlyRes = await fetch(`/api/company/analytics?period=month`);
        if (monthlyRes.ok) {
          const data = await monthlyRes.json();
          setTradingData(data.data || []);
        }

        const yearlyRes = await fetch(`/api/company/analytics?period=year`);
        if (yearlyRes.ok) {
          const data = await yearlyRes.json();
          setYearlyTradingData(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  const priceChange = companyData?.priceChange ? parseFloat(companyData.priceChange) : 0;
  const sharePrice = companyData?.sharePrice ? Number(companyData.sharePrice) : 0;
  const closingPrice = companyData?.closingPrice ? Number(companyData.closingPrice) : sharePrice;
  const marketCap = companyData?.marketCap ? Number(companyData.marketCap) : 0;
  const tradedVolume = companyData?.tradedVolume ? Number(companyData.tradedVolume) : 0;
  const tradedValue = companyData?.tradedValue ? Number(companyData.tradedValue) : 0;
  const availableShares = companyData?.availableShares ? Number(companyData.availableShares) : 0;
  const peRatio = companyData?.peRatio ? Number(companyData.peRatio) : 0;
  const weekHigh52 = companyData?.weekHigh52 ? Number(companyData.weekHigh52) : 0;
  const weekLow52 = companyData?.weekLow52 ? Number(companyData.weekLow52) : 0;



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
                <p className="text-sm font-medium text-slate-600">Company Wallet</p>
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
                <p className="text-sm font-medium text-slate-600">Market Cap</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Rwf {(marketCap / 1000000).toFixed(1)}</p>
                <p className="text-sm text-slate-500 mt-2">Company valuation</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
              </div>
            </div>
          </Card>

       


          <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Shares</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{(companyData?.totalShares || 0).toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2">Outstanding shares</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <Share className="h-5 w-5 md:h-6 md:w-6 text-cyan-600" />
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

        

            <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Trading Volume</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{tradedVolume.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2">Shares traded today</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Traded Value</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Rwf {(tradedValue / 1000000).toFixed(1)}</p>
                <p className="text-sm text-slate-500 mt-2">Total value traded</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-violet-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-violet-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">P/E Ratio</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{peRatio.toFixed(2)}</p>
                <p className="text-sm text-slate-500 mt-2">Price to earnings</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Calculator className="h-5 w-5 md:h-6 md:w-6 text-teal-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Trading Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Monthly Chart */}
          <Card className="p-4 md:p-6" hover={false}>
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Monthly Trading Performance</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">This month</p>
            </div>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tradingData}>
                  <defs>
                    <linearGradient id="colorVolumeMonth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#004B5B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#004B5B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number | undefined, name?: string) => {
                      if (name === 'totalVolume') return [`${value || 0} shares`, 'Trading Volume'];
                      if (name === 'totalValue') return [`Rwf ${(value || 0).toLocaleString()}`, 'Trading Value'];
                      return [value, name || ''];
                    }}
                  />
                  <Area type="monotone" dataKey="totalVolume" stroke="#004B5B" strokeWidth={2} fillOpacity={1} fill="url(#colorVolumeMonth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Yearly Chart */}
          <Card className="p-4 md:p-6" hover={false}>
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Yearly Trading Performance</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">This year</p>
            </div>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyTradingData}>
                  <defs>
                    <linearGradient id="colorVolumeYear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number | undefined, name?: string) => {
                      if (name === 'totalVolume') return [`${value || 0} shares`, 'Trading Volume'];
                      if (name === 'totalValue') return [`Rwf ${(value || 0).toLocaleString()}`, 'Trading Value'];
                      return [value, name || ''];
                    }}
                  />
                  <Area type="monotone" dataKey="totalVolume" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorVolumeYear)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

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
