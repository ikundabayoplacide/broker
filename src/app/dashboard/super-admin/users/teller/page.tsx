"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Eye, Users, Loader2, Shield, Mail, Phone, MapPin, Calendar } from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface TellerUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  dateOfBirth: string;
  city: string;
  country: string;
  occupation?: string;
  idNumber?: string;
  isVerified: boolean;
  csdNumber?: string;
  createdAt: string;
  notificationPreferences?: Record<string, boolean>;
}

interface ProcessedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  raw: TellerUser;
}

export default function TellerPage() {
  const [users, setUsers] = useState<ProcessedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewUser, setViewUser] = useState<ProcessedUser | null>(null);
  const rowsPerPage = 10;

  useEffect(() => {
    fetchTellerUsers();
  }, []);

  const fetchTellerUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users?role=teller");
      if (response.ok) {
        const data = await response.json();
        const processedUsers: ProcessedUser[] = data.users.map((user: TellerUser) => ({
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: "Teller",
          status: user.isVerified ? "Active" : "Inactive",
          raw: user,
        }));
        setUsers(processedUsers);
      }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPhone = (user: TellerUser) => {
    return `${user.countryCode} ${user.phoneNumber}`;
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
                  <td className="p-3 flex justify-center gap-3">
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                      onClick={() => setViewUser(user)}
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

        {/* View User Modal */}
        {viewUser && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#004B5B]">Teller User Details</h2>
                  <p className="text-sm text-gray-500">Review the teller profile information</p>
                </div>
                <Button variant="outline" className="px-3 py-1" onClick={() => setViewUser(null)}>
                  Close
                </Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
                    <Shield className="h-4 w-4" /> Identity
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li><span className="font-medium">Name:</span> {viewUser.raw.fullName}</li>
                    <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {viewUser.raw.email}</li>
                    <li className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> {formatDate(viewUser.raw.dateOfBirth)}</li>
                    <li><span className="font-medium">ID Number:</span> {viewUser.raw.idNumber || "—"}</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
                    <Phone className="h-4 w-4" /> Contact
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>{formatPhone(viewUser.raw)}</li>
                    <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> {viewUser.raw.city}, {viewUser.raw.country}</li>
                    <li><span className="font-medium">Occupation:</span> {viewUser.raw.occupation || "—"}</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
                    <Shield className="h-4 w-4" /> Access & Status
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li><span className="font-medium">Role:</span> Teller</li>
                    <li><span className="font-medium">Verified:</span> {viewUser.raw.isVerified ? "Yes" : "No"}</li>
                    <li><span className="font-medium">CSD Number:</span> {viewUser.raw.csdNumber ?? "—"}</li>
                    <li><span className="font-medium">Created:</span> {formatDate(viewUser.raw.createdAt)}</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                  <h3 className="mb-2 text-sm font-semibold text-[#004B5B]">Notification Preferences</h3>
                  <div className="text-sm text-gray-700">
                    {viewUser.raw.notificationPreferences ? (
                      <ul className="space-y-1">
                        {Object.entries(viewUser.raw.notificationPreferences).map(([key, value]) => (
                          <li key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                            <span className="font-medium">{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>No preferences set</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}