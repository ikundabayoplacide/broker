'use client';

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, MapPin, Phone, Mail, Users, TrendingUp, 
  DollarSign, Activity, Clock, Building, Eye, Edit,
  BarChart3, PieChart, Calendar, AlertCircle
} from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

interface BranchDetails {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  manager: string;
  employeeCount: number;
  status: "Active" | "Inactive" | "Maintenance";
  openingHours: string;
  services: string[];
  createdAt: string;
  tradingStats: {
    dailyVolume: number;
    monthlyVolume: number;
    totalTrades: number;
    avgTradeSize: number;
  };
  clientStats: {
    totalClients: number;
    activeClients: number;
    newThisMonth: number;
    vipClients: number;
  };
  performance: {
    revenue: number;
    growth: number;
    satisfaction: number;
    efficiency: number;
  };
}

const mockBranchDetails: BranchDetails = {
  id: "1",
  name: "Kigali Main Branch",
  code: "KGL-001",
  address: "KN 4 Ave, Nyarugenge",
  city: "Kigali",
  country: "Rwanda",
  phone: "+250 788 123 456",
  email: "kigali.main@broker.rw",
  manager: "Jean Baptiste Uwimana",
  employeeCount: 25,
  status: "Active",
  openingHours: "8:00 AM - 6:00 PM",
  services: ["Trading", "Account Opening", "Customer Support", "Investment Advisory"],
  createdAt: "2023-01-15",
  tradingStats: {
    dailyVolume: 2500000,
    monthlyVolume: 75000000,
    totalTrades: 1250,
    avgTradeSize: 60000
  },
  clientStats: {
    totalClients: 450,
    activeClients: 380,
    newThisMonth: 25,
    vipClients: 45
  },
  performance: {
    revenue: 12500000,
    growth: 15.5,
    satisfaction: 4.7,
    efficiency: 92
  }
};

const recentTrades = [
  { id: "1", client: "John Doe", amount: 150000, type: "Buy", stock: "BK", time: "10:30 AM" },
  { id: "2", client: "Jane Smith", amount: 200000, type: "Sell", stock: "EQUITY", time: "11:15 AM" },
  { id: "3", client: "Bob Johnson", amount: 75000, type: "Buy", stock: "MTN", time: "2:45 PM" },
  { id: "4", client: "Alice Brown", amount: 300000, type: "Buy", stock: "BK", time: "3:20 PM" },
];

const topClients = [
  { id: "1", name: "Corporate Client A", trades: 45, volume: 5500000, status: "VIP" },
  { id: "2", name: "Investment Fund B", trades: 32, volume: 4200000, status: "VIP" },
  { id: "3", name: "Individual Investor C", trades: 28, volume: 2800000, status: "Premium" },
  { id: "4", name: "Pension Fund D", trades: 22, volume: 3100000, status: "VIP" },
];

export default function BranchDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [branchDetails, setBranchDetails] = useState<BranchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch branch details on component mount
  useEffect(() => {
    const fetchBranchDetails = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/branches');
        if (response.ok) {
          const branches = await response.json();
          const branch = branches.find((b: any) => b.id === params.id);
          
          if (branch) {
            // Transform API data to match interface
            const transformedBranch: BranchDetails = {
              id: branch.id,
              name: branch.name,
              code: branch.code,
              address: branch.address,
              city: branch.city,
              country: branch.country,
              phone: branch.phone,
              email: branch.email,
              manager: branch.manager?.fullName || 'No Manager',
              employeeCount: branch._count?.employees || 0,
              status: branch.status || 'Active',
              openingHours: `${branch.startTime} - ${branch.endTime}`,
              services: branch.services || [],
              createdAt: branch.createdAt,
              // Mock data for stats (you can add these to your API later)
              tradingStats: {
                dailyVolume: 2500000,
                monthlyVolume: 75000000,
                totalTrades: 1250,
                avgTradeSize: 60000
              },
              clientStats: {
                totalClients: 450,
                activeClients: 380,
                newThisMonth: 25,
                vipClients: 45
              },
              performance: {
                revenue: 12500000,
                growth: 15.5,
                satisfaction: 4.7,
                efficiency: 92
              }
            };
            setBranchDetails(transformedBranch);
          } else {
            setError('Branch not found');
          }
        } else {
          setError('Failed to fetch branch details');
        }
      } catch (err) {
        setError('Error loading branch details');
        console.error('Error fetching branch details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchBranchDetails();
    }
  }, [params.id]);

  const { displayName, email } = useMemo(() => {
    const fullName = typeof user?.fullName === "string" ? user.fullName.trim() : "";
    const fallback = user?.email ? user.email.split("@")[0] : "Super Admin";
    return {
      displayName: fullName || fallback,
      email: user?.email ?? "",
    };
  }, [user?.fullName, user?.email]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-red-100 text-red-800";
      case "Maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="super-admin" userName={displayName} userEmail={email}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading branch details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !branchDetails) {
    return (
      <DashboardLayout userRole="super-admin" userName={displayName} userEmail={email}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">{error || 'Branch not found'}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="super-admin" userName={displayName} userEmail={email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[#004B5B]">{branchDetails.name}</h1>
              <p className="text-sm text-gray-500">{branchDetails.code} • {branchDetails.city}, {branchDetails.country}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(branchDetails.status)}`}>
              {branchDetails.status}
            </span>
            <Button size="sm" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Branch
            </Button>
          </div>
        </div>

        {/* Branch Info Card */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{branchDetails.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{branchDetails.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Manager</p>
                <p className="font-medium">{branchDetails.manager}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Hours</p>
                <p className="font-medium">{branchDetails.openingHours}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Daily Volume</p>
                <p className="text-2xl font-semibold text-gray-700">{formatCurrency(branchDetails.tradingStats.dailyVolume)}</p>
                <p className="text-sm text-green-600">+12.5% from yesterday</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-2xl font-semibold text-gray-700">{branchDetails.clientStats.totalClients}</p>
                <p className="text-sm text-blue-600">{branchDetails.clientStats.activeClients} active</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-semibold text-gray-700">{formatCurrency(branchDetails.performance.revenue)}</p>
                <p className="text-sm text-green-600">+{branchDetails.performance.growth}% growth</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Efficiency</p>
                <p className="text-2xl font-semibold text-gray-700">{mockBranchDetails.performance.efficiency}%</p>
                <p className="text-sm text-orange-600">Operational score</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "trading", label: "Trading Activity", icon: TrendingUp },
              { id: "clients", label: "Client Management", icon: Users },
              { id: "performance", label: "Performance", icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-[#004B5B] text-[#004B5B]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Services Offered</h3>
                <div className="grid grid-cols-2 gap-3">
                  {mockBranchDetails.services.map((service) => (
                    <div key={service} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">{service}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Branch Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Employee Count</span>
                    <span className="font-semibold">{mockBranchDetails.employeeCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <span className="font-semibold">{mockBranchDetails.performance.satisfaction}/5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Operational Efficiency</span>
                    <span className="font-semibold">{mockBranchDetails.performance.efficiency}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Established</span>
                    <span className="font-semibold">{new Date(mockBranchDetails.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "trading" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Trades</h4>
                  <p className="text-2xl font-semibold">{mockBranchDetails.tradingStats.totalTrades}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Monthly Volume</h4>
                  <p className="text-2xl font-semibold">{formatCurrency(mockBranchDetails.tradingStats.monthlyVolume)}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Avg Trade Size</h4>
                  <p className="text-2xl font-semibold">{formatCurrency(mockBranchDetails.tradingStats.avgTradeSize)}</p>
                </Card>
              </div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Recent Trades</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Client</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Stock</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrades.map((trade) => (
                        <tr key={trade.id} className="border-b">
                          <td className="p-3 font-medium">{trade.client}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs rounded ${
                              trade.type === "Buy" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="p-3">{trade.stock}</td>
                          <td className="p-3">{formatCurrency(trade.amount)}</td>
                          <td className="p-3 text-gray-500">{trade.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "clients" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Clients</h4>
                  <p className="text-2xl font-semibold">{mockBranchDetails.clientStats.totalClients}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Active Clients</h4>
                  <p className="text-2xl font-semibold">{mockBranchDetails.clientStats.activeClients}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">New This Month</h4>
                  <p className="text-2xl font-semibold">{mockBranchDetails.clientStats.newThisMonth}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">VIP Clients</h4>
                  <p className="text-2xl font-semibold">{mockBranchDetails.clientStats.vipClients}</p>
                </Card>
              </div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Top Clients</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Client Name</th>
                        <th className="text-left p-3">Total Trades</th>
                        <th className="text-left p-3">Volume</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.map((client) => (
                        <tr key={client.id} className="border-b">
                          <td className="p-3 font-medium">{client.name}</td>
                          <td className="p-3">{client.trades}</td>
                          <td className="p-3">{formatCurrency(client.volume)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs rounded ${
                              client.status === "VIP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Revenue Growth</span>
                      <span className="text-sm font-semibold">{mockBranchDetails.performance.growth}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${mockBranchDetails.performance.growth}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Customer Satisfaction</span>
                      <span className="text-sm font-semibold">{mockBranchDetails.performance.satisfaction}/5.0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(mockBranchDetails.performance.satisfaction / 5) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Operational Efficiency</span>
                      <span className="text-sm font-semibold">{mockBranchDetails.performance.efficiency}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${mockBranchDetails.performance.efficiency}%` }}></div>
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Monthly Targets</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Revenue Target</span>
                    <span className="text-sm text-green-600 font-semibold">Achieved</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Client Acquisition</span>
                    <span className="text-sm text-blue-600 font-semibold">On Track</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium">Trading Volume</span>
                    <span className="text-sm text-yellow-600 font-semibold">Behind</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}