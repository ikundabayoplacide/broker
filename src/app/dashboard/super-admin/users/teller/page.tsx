"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Users, Loader2 } from "lucide-react";
import UserActions from "@/components/models/UserActions";
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

export default function TellerPage() {
  const [users, setUsers] = useState<ProcessedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    fetchTellerUsers();
  }, []);

  const fetchTellerUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/user");
      const allUsers = Array.isArray(response.data) ? response.data : [];
      // Filter only TELLER users
      const tellerUsers = allUsers.filter((user: ApiUser) => user.role === "TELLER");
      const processedUsers: ProcessedUser[] = tellerUsers.map((user: ApiUser) => ({
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: "Teller",
        status: user.isVerified ? "Active" : "Inactive",
        raw: user,
      }));
      setUsers(processedUsers);
    } catch (error) {
      console.error("Error fetching teller users:", error);
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
              Teller Users
            </h1>
            <p className="text-gray-600 mt-1">Manage and monitor teller accounts</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{filteredUsers.length}</span>
            <span>total tellers</span>
          </div>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#004B5B]/60 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tellers by name or email..."
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
                      Loading teller users...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No teller users found. Adjust your filters or refresh the list.
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
                  <td className="p-3">
                    <UserActions
                      user={user.raw}
                      onUserUpdated={fetchTellerUsers}
                    />
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