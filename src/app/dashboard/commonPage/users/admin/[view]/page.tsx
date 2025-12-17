"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Building2, Users, TrendingUp, DollarSign, 
  MapPin, Phone, Mail, Globe, Shield, 
  Activity, BarChart3, PieChart, Settings, AlertTriangle 
} from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface BranchData {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  address: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  manager: {
    name: string;
    email: string;
    phone: string;
  };
  stats: {
    totalClients: number;
    activeClients: number;
    totalAssets: number;
    monthlyTransactions: number;
  };
  establishedDate: string;
  lastAudit: string;
}

export default function BranchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [branch, setBranch] = useState<BranchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const branchId = params.view as string;

  useEffect(() => {
    const mockBranch: BranchData = {
      id: branchId,
      name: "Bank of Kigali - Kimisagara Branch",
      code: "BK-KIM-001",
      type: "Full Service Branch",
      status: "Active",
      address: {
        street: "KN 3 Rd, Kimisagara",
        city: "Kigali",
        country: "Rwanda",
        postalCode: "00000"
      },
      contact: {
        phone: "+250 788 123 456",
        email: "kimisagara@bk.rw",
        website: "www.bk.rw"
      },
      manager: {
        name: "Jean Claude Uwimana",
        email: "j.uwimana@bk.rw",
        phone: "+250 788 654 321"
      },
      stats: {
        totalClients: 2847,
        activeClients: 2654,
        totalAssets: 45600000,
        monthlyTransactions: 15420
      },
      establishedDate: "2018-03-15",
      lastAudit: "2024-01-10"
    };

    setTimeout(() => {
      setBranch(mockBranch);
      setLoading(false);
    }, 500);
  }, [branchId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const mockClients = [
    { id: 1, name: "Alice Mukamana", email: "alice.m@email.com", status: "Active", joinDate: "2023-06-15", balance: 2500000 },
    { id: 2, name: "Robert Niyonzima", email: "robert.n@email.com", status: "Active", joinDate: "2023-08-20", balance: 1800000 },
    { id: 3, name: "Grace Uwimana", email: "grace.u@email.com", status: "Inactive", joinDate: "2023-05-10", balance: 950000 },
    { id: 4, name: "Patrick Habimana", email: "patrick.h@email.com", status: "Active", joinDate: "2023-09-05", balance: 3200000 }
  ];

  const mockTransactions = [
    { id: 1, type: "Deposit", amount: 500000, client: "Alice Mukamana", timestamp: "2024-01-15 14:30:25", status: "Completed" },
    { id: 2, type: "Withdrawal", amount: 200000, client: "Robert Niyonzima", timestamp: "2024-01-15 13:45:22", status: "Completed" },
    { id: 3, type: "Transfer", amount: 750000, client: "Grace Uwimana", timestamp: "2024-01-15 11:20:15", status: "Pending" },
    { id: 4, type: "Deposit", amount: 1200000, client: "Patrick Habimana", timestamp: "2024-01-14 16:30:45", status: "Completed" }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading branch details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!branch) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Branch not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-4 md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <Building2 className="h-5 w-5" /> Branch Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Branch Name</label>
                  <p className="text-gray-900 font-medium">{branch.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Branch Code</label>
                  <p className="text-gray-900">{branch.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900">{branch.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    {branch.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Established</label>
                  <p className="text-gray-900">{formatDate(branch.establishedDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Audit</label>
                  <p className="text-gray-900">{formatDate(branch.lastAudit)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <MapPin className="h-5 w-5" /> Contact & Location
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-gray-900">
                    {branch.address.street}<br />
                    {branch.address.city}, {branch.address.country}<br />
                    {branch.address.postalCode}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="flex items-center gap-2 text-gray-900">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {branch.contact.phone}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="flex items-center gap-2 text-gray-900">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {branch.contact.email}
                  </p>
                </div>
                {branch.contact.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Website</label>
                    <p className="flex items-center gap-2 text-gray-900">
                      <Globe className="h-4 w-4 text-gray-400" />
                      {branch.contact.website}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <Shield className="h-5 w-5" /> Branch Manager
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900 font-medium">{branch.manager.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{branch.manager.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{branch.manager.phone}</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Clients</p>
                    <p className="text-xl font-bold text-gray-900">{branch.stats.totalClients.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Assets</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(branch.stats.totalAssets)}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'clients':
        return (
          <Card className="p-4 md:p-6 overflow-hidden">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
              <Users className="h-5 w-5" /> Branch Clients
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left hidden sm:table-cell">Email</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left hidden md:table-cell">Join Date</th>
                    <th className="p-3 text-left">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {mockClients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{client.name}</td>
                      <td className="p-3 hidden sm:table-cell">{client.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell">{client.joinDate}</td>
                      <td className="p-3 font-medium">{formatCurrency(client.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );

      case 'performance':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-4 md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <BarChart3 className="h-5 w-5" /> Key Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Active Clients</span>
                  <span className="text-lg font-bold text-green-600">{branch.stats.activeClients}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Monthly Transactions</span>
                  <span className="text-lg font-bold text-blue-600">{branch.stats.monthlyTransactions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Client Retention Rate</span>
                  <span className="text-lg font-bold text-purple-600">94.2%</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <PieChart className="h-5 w-5" /> Growth Trends
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">New Clients (This Month)</span>
                  <span className="text-green-600 font-bold">+127</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Asset Growth (YoY)</span>
                  <span className="text-green-600 font-bold">+18.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Transaction Volume (MoM)</span>
                  <span className="text-blue-600 font-bold">+12.3%</span>
                </div>
              </div>
            </Card>
          </div>
        );

      case 'transactions':
        return (
          <Card className="p-4 md:p-6 overflow-hidden">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
              <Activity className="h-5 w-5" /> Recent Transactions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left hidden sm:table-cell">Client</th>
                    <th className="p-3 text-left hidden md:table-cell">Timestamp</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{transaction.type}</td>
                      <td className="p-3 font-medium">{formatCurrency(transaction.amount)}</td>
                      <td className="p-3 hidden sm:table-cell">{transaction.client}</td>
                      <td className="p-3 hidden md:table-cell">{transaction.timestamp}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );

      case 'settings':
        return (
          <Card className="p-4 md:p-6 border-orange-200">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-orange-600">
              <AlertTriangle className="h-5 w-5" /> Branch Management
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Update Branch Info</h4>
                <p className="text-sm text-blue-700 mb-3">Modify branch details and contact information.</p>
                <Button variant="outline" className="border-blue-500 text-blue-700 hover:bg-blue-100 w-full sm:w-auto">
                  Edit Details
                </Button>
              </div>
              
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Suspend Branch</h4>
                <p className="text-sm text-yellow-700 mb-3">Temporarily disable branch operations.</p>
                <Button variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 w-full sm:w-auto">
                  Suspend Branch
                </Button>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#004B5B]">{branch.name}</h1>
              <p className="text-sm sm:text-base text-gray-600">Branch Code: {branch.code}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Clients</p>
                <p className="text-xl font-bold text-gray-900">{branch.stats.totalClients.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Active Clients</p>
                <p className="text-xl font-bold text-gray-900">{branch.stats.activeClients.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Total Assets</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(branch.stats.totalAssets)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Monthly Transactions</p>
                <p className="text-xl font-bold text-gray-900">{branch.stats.monthlyTransactions.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#004B5B] text-[#004B5B]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}