'use client';

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, MapPin, Phone, Mail, Users, TrendingUp, 
  DollarSign, Activity, Clock, Building, Eye, Edit,
  BarChart3, PieChart, Calendar, AlertCircle, Trash2, Printer
} from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BranchCreateModal, { type BranchFormData } from "@/components/models/branchesModels";
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
  managerData?: { id: string; fullName: string; email: string; phone: string; phoneCountryCode: string };
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
    tellerCount: number;
  };
}

interface RecentTrade {
  id: string;
  client: string;
  amount: number;
  type: string;
  stock: string;
  time: string;
}

interface TopClient {
  id: string;
  name: string;
  trades: number;
  volume: number;
  status: "Active" | "Inactive" | "maintenance" | string;
}

interface BranchTeller {
  id: string;
  name: string;
  email: string;
  phone: string;
  clientsServed: number;
  tradesProcessed: number;
  efficiency: number;
  status: string;
  joinDate: string;
}

export default function BranchDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [branchDetails, setBranchDetails] = useState<BranchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [branchTellers, setBranchTellers] = useState<BranchTeller[]>([]);
  const [tradingStats, setTradingStats] = useState({
    dailyVolume: 0,
    monthlyVolume: 0,
    totalTrades: 0,
    avgTradeSize: 0
  });

  // Fetch branch details and related data
  useEffect(() => {
    const fetchBranchDetails = async () => {
      try {
        setIsLoading(true);
        const [branchResponse, clientsResponse, tellersResponse, dailyVolumeResponse] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/user?role=CLIENT'),
          fetch('/api/user?role=TELLER'),
          fetch('/api/trading/daily-volume')
        ]);
        
        if (branchResponse.ok) {
          const branches = await branchResponse.json();
          const branch = branches.find((b: any) => b.id === params.id);
          
          if (branch) {
            // Get clients and tellers data
            const clientsData = clientsResponse.ok ? await clientsResponse.json() : { users: [] };
            const tellersData = tellersResponse.ok ? await tellersResponse.json() : { users: [] };
            const dailyVolumeData = dailyVolumeResponse.ok ? await dailyVolumeResponse.json() : null;
            
            // Filter by branch
            const branchClients = clientsData.users?.filter((user: any) => user.branchId === branch.id) || [];
            const branchTellersData = tellersData.users?.filter((user: any) => user.branchId === branch.id) || [];
            
            // Fetch trades for this branch
            const tradesResponse = await fetch('/api/trade/history');
            let allTrades: any[] = [];
            let branchTrades: any[] = [];
            
            if (tradesResponse.ok) {
              const tradesData = await tradesResponse.json();
              allTrades = tradesData.trades || [];
              // Filter trades by branch users
              const branchUserIds = [...branchClients.map((c: any) => c.id), ...branchTellersData.map((t: any) => t.id)];
              branchTrades = allTrades.filter((trade: any) => branchUserIds.includes(trade.userId));
            }
            
            // Calculate trading statistics
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            
            const todayTrades = branchTrades.filter((trade: any) => 
              new Date(trade.createdAt) >= startOfDay && trade.status === 'EXECUTED'
            );
            const monthTrades = branchTrades.filter((trade: any) => 
              new Date(trade.createdAt) >= startOfMonth && trade.status === 'EXECUTED'
            );
            
            const dailyVolume = todayTrades.reduce((sum: number, trade: any) => sum + Number(trade.totalAmount || 0), 0);
            const monthlyVolume = monthTrades.reduce((sum: number, trade: any) => sum + Number(trade.totalAmount || 0), 0);
            const totalTrades = branchTrades.filter((trade: any) => trade.status === 'EXECUTED').reduce((sum: number, trade: any) => sum + Number(trade.executedQuantity || trade.quantity || 0), 0);
            const avgTradeSize = totalTrades > 0 ? monthlyVolume / totalTrades : 0;
            
            // Set trading stats
            setTradingStats({
              dailyVolume,
              monthlyVolume,
              totalTrades,
              avgTradeSize
            });
            
            // Set recent trades (last 10)
            const recentTradesData = branchTrades
              .filter((trade: any) => trade.status === 'EXECUTED')
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 10)
              .map((trade: any) => ({
                id: trade.id,
                client: trade.User?.fullName || 'Unknown Client',
                amount: Number(trade.totalAmount || 0),
                type: trade.type,
                stock: trade.Company?.symbol || 'N/A',
                time: new Date(trade.createdAt).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              }));
            setRecentTrades(recentTradesData);
            
            // Calculate top clients - combine branch clients + trading clients
            const branchClientStats = branchClients.map((client: any) => {
              const clientTrades = allTrades.filter((trade: any) => trade.userId === client.id && trade.status === 'EXECUTED');
              const volume = clientTrades.reduce((sum: number, trade: any) => sum + Number(trade.totalAmount || 0), 0);
              const totalTrades = clientTrades.reduce((sum: number, trade: any) => sum + Number(trade.executedQuantity || trade.quantity || 0), 0);
              return {
                id: client.id,
                name: client.fullName || 'Unknown Client',
                trades: totalTrades,
                volume,
                status: client.isVerified ? 'ACTIVE' : 'INACTIVE'
              };
            });
            
            // Add trading clients not in branch (only CLIENT role)
            const tradingClientIds = [...new Set(allTrades.map((trade: any) => trade.userId))];
            const nonBranchTradingClients = tradingClientIds
              .filter(userId => !branchClients.some((client: any) => client.id === userId))
              .map((userId: string) => {
                const clientTrades = allTrades.filter((trade: any) => trade.userId === userId && trade.status === 'EXECUTED');
                const volume = clientTrades.reduce((sum: number, trade: any) => sum + Number(trade.totalAmount || 0), 0);
                const totalTrades = clientTrades.reduce((sum: number, trade: any) => sum + Number(trade.executedQuantity || trade.quantity || 0), 0);
                const clientName = clientTrades[0]?.User?.fullName || clientTrades[0]?.user?.fullName || 'Unknown Client';
                const userRole = clientTrades[0]?.User?.role || clientTrades[0]?.user?.role;
                return {
                  id: userId,
                  name: clientName,
                  trades: totalTrades,
                  volume,
                  status: 'ACTIVE',
                  role: userRole
                };
              })
              .filter(client => client.role === 'CLIENT'); // Only include CLIENT role
            
            const clientTradeStats = [...branchClientStats, ...nonBranchTradingClients]
              .sort((a: TopClient, b: TopClient) => b.volume - a.volume);
            setTopClients(clientTradeStats);
            
            // Set tellers data with trade processing stats
            const tellersWithStats = branchTellersData.map((teller: any) => {
              const tellerTrades = branchTrades.filter((trade: any) => 
                trade.notes && trade.notes.includes(teller.fullName)
              );
              return {
                id: teller.id,
                name: teller.fullName || 'Unknown Teller',
                email: teller.email || '',
                phone: teller.phone || '',
                clientsServed: branchClients.filter((c: any) => 
                  branchTrades.some((t: any) => t.userId === c.id && t.notes && t.notes.includes(teller.fullName))
                ).length,
                tradesProcessed: tellerTrades.length,
                efficiency: Math.min(95, Math.max(75, 85 + Math.random() * 15)), // Simulated efficiency
                status: teller.isVerified ? 'Active' : 'Inactive',
                joinDate: new Date(teller.createdAt).toLocaleDateString()
              };
            });
            setBranchTellers(tellersWithStats);
            
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
              services: branch.services || ['Trading', 'Account Opening', 'Customer Support'],
              createdAt: branch.createdAt,
              managerData: branch.manager,
              // Real trading stats
              tradingStats: {
                dailyVolume,
                monthlyVolume,
                totalTrades,
                avgTradeSize
              },
              // Real client stats
              clientStats: {
                totalClients: branchClients.length,
                activeClients: branchClients.filter((c: any) => c.isVerified === true).length,
                newThisMonth: branchClients.filter((c: any) => {
                  const createdDate = new Date(c.createdAt);
                  const now = new Date();
                  return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
                }).length,
                vipClients: 0 // No VIP classification in user table
              },
              performance: {
                revenue: monthlyVolume * 0.01, // Assuming 1% commission
                growth: dailyVolumeData?.data?.percentageChange || 0,
                satisfaction: 4.2 + Math.random() * 0.6, // Simulated satisfaction score
                efficiency: Math.round(tellersWithStats.reduce((sum: number, t: BranchTeller) => sum + t.efficiency, 0) / Math.max(tellersWithStats.length, 1)),
                tellerCount: branchTellersData.length
              }
            };
            
            setBranchDetails(transformedBranch);
          } else {
            setError('Branch not found');
          }
        } else {
          setError('Failed to fetch branch details');
        }
      } catch (error) {
        setError('Error loading branch details');
        console.error('Error fetching branch details:', error);
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

  const handleDeleteBranch = async () => {
    if (!branchDetails || deleteConfirmName !== branchDetails.name) {
      setDeleteError(`Please type "${branchDetails?.name}" to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/branches/${branchDetails.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard/super-admin/branches');
      } else {
        setDeleteError('Failed to delete branch');
      }
    } catch (err) {
      setDeleteError('Error deleting branch');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName("");
    setDeleteError(null);
  };

  const handleEditSubmit = async (formData: any) => {
    try {
      const updateData: any = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.location) updateData.location = formData.location;
      if (formData.phone) updateData.phone = formData.phone;
      if (formData.email) updateData.email = formData.email;
      if (formData.startTime) updateData.startTime = formData.startTime;
      if (formData.endTime) updateData.endTime = formData.endTime;
      if (formData.managerName) updateData.managerName = formData.managerName;
      if (formData.managerEmail) updateData.managerEmail = formData.managerEmail;
      if (formData.managerPhone) updateData.managerPhone = formData.managerPhone;
      if (formData.managerCountryCode) updateData.managerCountryCode = formData.managerCountryCode;
      
      const response = await fetch(`/api/branches/${branchDetails?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedBranch = await response.json();
        setBranchDetails(prev => prev ? {
          ...prev,
          name: updatedBranch.name,
          address: updatedBranch.address,
          phone: updatedBranch.phone,
          email: updatedBranch.email,
          openingHours: `${updatedBranch.startTime} - ${updatedBranch.endTime}`,
          manager: updatedBranch.manager?.fullName || prev.manager,
          managerData: updatedBranch.manager
        } : null);
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating branch:', error);
    }
  };

  const getEditFormData = (): BranchFormData | undefined => {
    if (!branchDetails) return undefined;
    return {
      name: branchDetails.name,
      location: branchDetails.address,
      phone: branchDetails.phone,
      email: branchDetails.email,
      startTime: branchDetails.openingHours.split(' - ')[0] || '08:00',
      endTime: branchDetails.openingHours.split(' - ')[1] || '18:00',
      managerName: branchDetails.managerData?.fullName || branchDetails.manager,
      managerEmail: branchDetails.managerData?.email || '',
      managerPhone: branchDetails.managerData?.phone || '',
      managerCountryCode: branchDetails.managerData?.phoneCountryCode || '+250',
      managerPassword: '',
      managerConfirmPassword: '',
      country: branchDetails.country,
      services: branchDetails.services || []
    };
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
            <Button onClick={() => router.back()} className="mt-4 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200">
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="super-admin" userName={displayName} userEmail={email}>
      <div className="space-y-6 print:space-y-4">
        <div className="hidden print:block print:mb-4 text-right">
          <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
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
            <span className={`px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full ${getStatusColor(branchDetails.status)}`}>
              {branchDetails.status}
            </span>
            <div className="print:hidden flex items-center gap-3">
              <Button 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                onClick={() => alert('Analytics coming soon')}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button 
                size="sm" 
                className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="w-4 h-4" />
                Edit 
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-800 hover:bg-red-900 hover:border-red-800 transition-all duration-200"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
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
                <p className="text-sm text-gray-500">Manager's Phone</p>
                <p className="font-medium">{branchDetails.managerData?.phone || branchDetails.phone || 'Not available'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Manager</p>
                <p className="font-medium">{branchDetails.managerData?.fullName}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-2">
       
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
                <p className="text-sm font-medium text-gray-500">Total Teller</p>
                <p className="text-2xl font-semibold text-gray-700">{branchDetails.performance.tellerCount}</p>
                <p className="text-sm text-blue-600">Supporting tellers</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
             <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Daily Volume</p>
                <p className="text-2xl font-semibold text-gray-700">{formatCurrency(tradingStats.dailyVolume)}</p>
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
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-semibold text-gray-700">{formatCurrency(branchDetails?.performance.revenue || 0)}</p>
                <p className="text-sm text-green-600">+{branchDetails?.performance.growth.toFixed(1) || '0.0'}% growth</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
         
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 print:hidden">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "trading", label: "Trading Activity", icon: TrendingUp },
              { id: "clients", label: "Client Management", icon: Users },
              { id: "tellers", label: "Tellers", icon: Users },
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

        {/* Print-only: All Tab Content */}
        <div className="hidden print:block space-y-6">
          {/* Overview Section */}
          <div>
            <h2 className="text-xl font-semibold text-[#004B5B] mb-4 border-b pb-2">Branch Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-4">
              <Card className="p-6 print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Services Offered</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(branchDetails?.services || []).map((service) => (
                    <div key={service} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">{service}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6 print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Branch Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Employee Count</span>
                    <span className="font-semibold">{branchDetails?.employeeCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <span className="font-semibold">{branchDetails?.performance.satisfaction.toFixed(1) || '0.0'}/5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Operational Efficiency</span>
                    <span className="font-semibold">{branchDetails?.performance.efficiency || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Established</span>
                    <span className="font-semibold">{branchDetails?.createdAt ? new Date(branchDetails.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Trading Activity Section */}
          <div>
            <h2 className="text-xl font-semibold text-[#004B5B] mb-4 border-b pb-2">Trading Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-2 mb-6">
              <Card className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Total Trades</h4>
                <p className="text-2xl font-semibold">{tradingStats.totalTrades}</p>
              </Card>
              <Card className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Monthly Volume</h4>
                <p className="text-2xl font-semibold">{formatCurrency(tradingStats.monthlyVolume)}</p>
              </Card>
              <Card className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Avg Trade Size</h4>
                <p className="text-2xl font-semibold">{formatCurrency(tradingStats.avgTradeSize)}</p>
              </Card>
            </div>
            <Card className="p-6 print:break-inside-avoid">
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

          {/* Tellers Section */}
          <div>
            <h2 className="text-xl font-semibold text-[#004B5B] mb-4 border-b pb-2">Teller Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-2 print:gap-2 mb-6">
              <Card className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Total Tellers</h4>
                <p className="text-2xl font-semibold">{branchTellers.length}</p>
              </Card>
              <Card className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Active Tellers</h4>
                <p className="text-2xl font-semibold">{branchTellers.filter(t => t.status === "Active").length}</p>
              </Card>
              <Card className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Avg Efficiency</h4>
                <p className="text-2xl font-semibold">{branchTellers.length > 0 ? Math.round(branchTellers.reduce((acc, t) => acc + t.efficiency, 0) / branchTellers.length) : 0}%</p>
              </Card>
              <Card className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Total Trades</h4>
                <p className="text-2xl font-semibold">{branchTellers.reduce((acc, t) => acc + t.tradesProcessed, 0)}</p>
              </Card>
            </div>
            <Card className="p-6 print:break-inside-avoid">
              <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Teller Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Teller Name</th>
                      <th className="text-left p-3">Clients Served</th>
                      <th className="text-left p-3">Trades Processed</th>
                      <th className="text-left p-3">Efficiency</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchTellers.map((teller) => (
                      <tr key={teller.id} className="border-b">
                        <td className="p-3 font-medium">{teller.name}</td>
                        <td className="p-3">{teller.clientsServed}</td>
                        <td className="p-3">{teller.tradesProcessed}</td>
                        <td className="p-3">{teller.efficiency}%</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            teller.status === "Active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {teller.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Interactive Tab Content (Screen Only) */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="print:hidden"
        >
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-4">
              <Card className="p-6 print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Services Offered</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(branchDetails?.services || []).map((service) => (
                    <div key={service} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">{service}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6 print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Branch Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Employee Count</span>
                    <span className="font-semibold">{branchDetails?.employeeCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <span className="font-semibold">{branchDetails?.performance.satisfaction.toFixed(1) || '0.0'}/5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Operational Efficiency</span>
                    <span className="font-semibold">{branchDetails?.performance.efficiency || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Established</span>
                    <span className="font-semibold">{branchDetails?.createdAt ? new Date(branchDetails.createdAt).toLocaleDateString() : 'N/A'}</span>
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
                  <p className="text-2xl font-semibold">{tradingStats.totalTrades}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Monthly Volume</h4>
                  <p className="text-2xl font-semibold">{formatCurrency(tradingStats.monthlyVolume)}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Avg Trade Size</h4>
                  <p className="text-2xl font-semibold">{formatCurrency(tradingStats.avgTradeSize)}</p>
                </Card>
              </div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Recent Trades</h3>
                {recentTrades.length > 0 ? (
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
                                trade.type === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No trades found for this branch</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "clients" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Clients</h4>
                  <p className="text-2xl font-semibold">{branchDetails?.clientStats.totalClients || 0}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Active Clients</h4>
                  <p className="text-2xl font-semibold">{branchDetails?.clientStats.activeClients || 0}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">New This Month</h4>
                  <p className="text-2xl font-semibold">{branchDetails?.clientStats.newThisMonth || 0}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">VIP Clients</h4>
                  <p className="text-2xl font-semibold">{branchDetails?.clientStats.vipClients || 0}</p>
                </Card>
              </div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Top Clients</h3>
                {topClients.length > 0 ? (
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
                                client.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No clients found for this branch</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "tellers" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Tellers</h4>
                  <p className="text-2xl font-semibold">{branchTellers.length}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Active Tellers</h4>
                  <p className="text-2xl font-semibold">{branchTellers.filter(t => t.status === "Active").length}</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Avg Efficiency</h4>
                  <p className="text-2xl font-semibold">{branchTellers.length > 0 ? Math.round(branchTellers.reduce((acc, t) => acc + t.efficiency, 0) / branchTellers.length) : 0}%</p>
                </Card>
                <Card className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Trades</h4>
                  <p className="text-2xl font-semibold">{branchTellers.reduce((acc, t) => acc + t.tradesProcessed, 0)}</p>
                </Card>
              </div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Teller Performance</h3>
                {branchTellers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3">Teller Name</th>
                          <th className="text-left p-3">Email</th>
                          <th className="text-left p-3">Clients Served</th>
                          <th className="text-left p-3">Trades Processed</th>
                          <th className="text-left p-3">Efficiency</th>
                          <th className="text-left p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchTellers.map((teller) => (
                          <tr key={teller.id} className="border-b">
                            <td className="p-3 font-medium">{teller.name}</td>
                            <td className="p-3 text-gray-600">{teller.email}</td>
                            <td className="p-3">{teller.clientsServed}</td>
                            <td className="p-3">{teller.tradesProcessed}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span>{Math.round(teller.efficiency)}%</span>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${teller.efficiency}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 text-xs rounded ${
                                teller.status === "Active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {teller.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No tellers found for this branch</p>
                  </div>
                )}
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
                      <span className="text-sm font-semibold">{branchDetails?.performance.growth.toFixed(1) || '0.0'}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.abs(branchDetails?.performance.growth || 0)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Customer Satisfaction</span>
                      <span className="text-sm font-semibold">{branchDetails?.performance.satisfaction.toFixed(1) || '0.0'}/5.0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((branchDetails?.performance.satisfaction || 0) / 5) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Operational Efficiency</span>
                      <span className="text-sm font-semibold">{branchDetails?.performance.efficiency || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${branchDetails?.performance.efficiency || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#004B5B] mb-4">Monthly Targets</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Revenue Target</span>
                    <span className="text-sm text-green-600 font-semibold">{(branchDetails?.performance.revenue || 0) > 1000000 ? 'Achieved' : 'In Progress'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Client Acquisition</span>
                    <span className="text-sm text-blue-600 font-semibold">{(branchDetails?.clientStats.newThisMonth || 0) > 5 ? 'On Track' : 'Behind'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium">Trading Volume</span>
                    <span className="text-sm text-yellow-600 font-semibold">{tradingStats.monthlyVolume > 10000000 ? 'On Track' : 'Behind'}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && branchDetails && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Delete Branch</h2>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Are you sure you want to delete <strong>{branchDetails.name}</strong>? 
                    This will permanently remove the branch and all associated data.
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    To confirm, please type <strong>{branchDetails.name}</strong> in the field below:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => {
                      setDeleteConfirmName(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder={`Type "${branchDetails.name}" to confirm`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={isDeleting}
                  />
                  {deleteError && (
                    <p className="text-sm text-red-600 mt-2">{deleteError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteBranch}
                    disabled={isDeleting || deleteConfirmName !== branchDetails.name}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? "Deleting..." : "Delete Branch"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <BranchCreateModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          initialData={getEditFormData()}
          isEdit={true}
        />
      </div>
    </DashboardLayout>
  );
}