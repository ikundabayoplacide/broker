"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Eye, Users, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/axios";

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  dateOfBirth: Date | null;
  city: string;
  country: string;
  occupation?: string | null;
  idNumber?: string | null;
  isVerified: boolean;
  csdNumber?: string | null;
  createdAt: Date;
  role: string;
  notificationPreferences?: Record<string, boolean> | null;
}

interface ProcessedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  raw: ApiUser;
}

export default function ClientsPage() {
  const [users, setUsers] = useState<ProcessedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const rowsPerPage = 10;

  useEffect(() => {
    fetchClientUsers();
  }, []);

  const fetchClientUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/user");
      const allUsers = Array.isArray(response.data) ? response.data : [];
      // Filter only CLIENT users
      const clientUsers = allUsers.filter((user: ApiUser) => user.role === "CLIENT");
      const processedUsers: ProcessedUser[] = clientUsers.map((user: ApiUser) => ({
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: "Client",
        status: user.isVerified ? "Active" : "Inactive",
        raw: user,
      }));
      setUsers(processedUsers);
    } catch (error) {
      console.error("Error fetching client users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };



  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#004B5B] flex items-center gap-2">
              <Users className="h-6 w-6" />
              Client Users
            </h1>
            <p className="text-gray-600 mt-1">Manage and monitor client accounts</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{filteredUsers.length}</span>
            <span>total clients</span>
          </div>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#004B5B]/60 h-4 w-4" />
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-full pl-9 pr-3 py-2 text-[#004B5B] bg-transparent outline-none border border-[#004B5B]/50 focus:border-[#004B5B]"
            />
          </div>
        </Card>

        {/* Table */}
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#004B5B]/10 text-[#004B5B] uppercase text-xs">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#004B5B]">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading client users...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No client users found. Adjust your filters or refresh the list.
                  </td>
                </tr>
              )}

              {paginatedUsers.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3 font-medium">{user.name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="p-3 flex justify-center gap-3">
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                      onClick={() => router.push(`/dashboard/super-admin/users/${user.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
            <div className="text-sm text-gray-500">
              {filteredUsers.length === 0 ? (
                "Showing 0 of 0"
              ) : (
                <>
                  Showing {(currentPage - 1) * rowsPerPage + 1}–
                  {Math.min(currentPage * rowsPerPage, filteredUsers.length)} of {filteredUsers.length}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={currentPage === 1 ? undefined : handlePrevious}
                className={`px-3 py-1 rounded-full text-white ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-[#004B5B]"}`}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {filteredUsers.length === 0 ? 0 : currentPage} of {filteredUsers.length === 0 ? 0 : totalPages}
              </span>
              <Button
                onClick={currentPage === totalPages ? undefined : handleNext}
                className={`px-3 py-1 rounded-full text-white ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-[#004B5B]"}`}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>


      </div>
    </DashboardLayout>
  );
}