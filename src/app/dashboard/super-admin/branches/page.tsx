'use client';

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Eye, MapPin, Users, Building, RefreshCcw, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import BranchCreateModal from "@/components/models/branchesModels";

interface BranchFormData {
  name: string;
  location: string;
  phone: string;
  email: string;
  startTime: string;
  endTime: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  managerCountryCode: string;
  managerPassword: string;
  managerConfirmPassword: string;
  country: string;
  services: string[];
}

interface Branch {
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
  startTime: string;
  endTime: string;
  services: string[];
  createdAt: string;
}



export default function BranchesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const rowsPerPage = 6;

  // Load branches on component mount
  useEffect(() => {
    refreshBranches();
  }, []);

  const { displayName, email } = useMemo(() => {
    const fullName = typeof user?.fullName === "string" ? user.fullName.trim() : "";
    const fallback = user?.email ? user.email.split("@")[0] : "Super Admin";
    return {
      displayName: fullName || fallback,
      email: user?.email ?? "",
    };
  }, [user?.fullName, user?.email]);

  const showSuccessToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const refreshBranches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        // Transform API data to match frontend interface
        const transformedBranches = data.map((branch: any) => {
          const statusMap: Record<string, string> = {
            'ACTIVE': 'Active',
            'INACTIVE': 'Inactive', 
            'MAINTENANCE': 'Maintenance'
          };
          
          return {
            ...branch,
            manager: branch.manager?.fullName || 'No Manager',
            employeeCount: branch._count?.employees || 0,
            status: statusMap[branch.status] || 'Active'
          };
        });
        setBranches(transformedBranches);
      }
    } catch (error) {
      console.error('Failed to refresh branches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBranches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return branches.filter((branch) => {
      const matchSearch =
        normalizedSearch.length === 0 ||
        branch.name.toLowerCase().includes(normalizedSearch) ||
        branch.city.toLowerCase().includes(normalizedSearch) ||
        branch.manager.toLowerCase().includes(normalizedSearch) ||
        branch.code.toLowerCase().includes(normalizedSearch);
      const matchStatus = statusFilter === "All" || branch.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, branches]);

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / rowsPerPage));
  const paginatedBranches = filteredBranches.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handlePrevious = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  const handleCreateBranch = async (branchData: BranchFormData) => {
    try {      
      const apiData = {
        name: branchData.name,
        location: branchData.location,
        phone: branchData.phone,
        email: branchData.email,
        startTime: branchData.startTime,
        endTime: branchData.endTime,
        managerName: branchData.managerName,
        managerEmail: branchData.managerEmail,
        managerPhone: branchData.managerPhone,
        managerCountryCode: branchData.managerCountryCode,
        managerPassword: branchData.managerPassword,
        managerConfirmPassword: branchData.managerConfirmPassword,
        country: branchData.country,
        services: branchData.services
      };
      
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Failed to create branch';
        
        if (Array.isArray(errorData.error)) {
          errorMessage = errorData.error.map((e: any) => e.message).join(', ');
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        throw new Error(errorMessage);
      }
      showSuccessToast("Branch created successfully! Notifications sent to manager and admins.");
      setShowCreateModal(false);
      await refreshBranches();
      
    } catch (error) {
      console.error("Error creating branch:", error);
      alert(`Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-200 text-green-800";
      case "Inactive":
        return "bg-red-100 text-red-800";
      case "Maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatOpeningHours = (startTime: string, endTime: string) => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const branchStats = useMemo(() => {
    const total = branches.length;
    const active = branches.filter(b => b.status === "Active").length;
    const totalEmployees = branches.reduce((sum, b) => sum + b.employeeCount, 0);
    const cities = new Set(branches.map(b => b.city)).size;
    return { total, active, totalEmployees, cities };
  }, [branches]);

  return (
    <DashboardLayout userRole="super-admin" userName={displayName} userEmail={email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#004B5B]">Branch Management</h1>
            <p className="text-sm text-gray-500">Manage and monitor all branch locations across the network.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#004B5B] border border-[#004B5B] hover:bg-[#004B5B]/10"
              onClick={refreshBranches}
              disabled={isLoading}
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button 
              className="flex items-center gap-2 px-4 py-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" /> Add Branch
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-700">{branchStats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Branches</p>
                <p className="text-2xl font-semibold text-gray-700">{branchStats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-700">{branchStats.totalEmployees}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cities Covered</p>
                <p className="text-2xl font-semibold text-gray-700">{branchStats.cities}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-4 flex-wrap justify-center w-full md:w-auto">
            <select
              className="border border-[#004B5B]/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#004B5B]"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-3 text-gray-500 h-4 w-4" />
            <motion.input
              whileFocus={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200 }}
              type="text"
              placeholder="Search branches..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-full pl-9 pr-3 py-2 text-[#004B5B] bg-transparent outline-none border border-[#004B5B]/50 focus:border-[#004B5B]"
            />
          </div>
        </Card>

        {/* Branches Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading branches...</p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedBranches.map((branch) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#004B5B]">{branch.name}</h3>
                    <p className="text-sm text-gray-500">{branch.code}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(branch.status)}`}>
                    {branch.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{branch.address}, {branch.city}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{branch.manager} • {branch.employeeCount} employees</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Hours:</strong> {formatOpeningHours(branch.startTime, branch.endTime)}</p>
                    <p><strong>Contact:</strong> {branch.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {branch.services.slice(0, 2).map((service) => (
                      <span key={service} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {service}
                      </span>
                    ))}
                    {branch.services.length > 2 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{branch.services.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                    onClick={() => router.push(`/dashboard/super-admin/branches/${branch.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                {Math.min(currentPage * rowsPerPage, filteredBranches.length)} of {filteredBranches.length} branches
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm bg-[#004B5B] text-white rounded">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Branch Create Modal */}
        <BranchCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBranch}
        />
      </div>
    </DashboardLayout>
  );
}