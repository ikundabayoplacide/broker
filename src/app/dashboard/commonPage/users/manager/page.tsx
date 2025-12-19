"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCcw, Loader2, Users } from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import UserActions from "@/components/models/UserActions";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "CLIENT";

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  idNumber?: string | null;
  passportPhoto?: string | null;
  idDocument?: string | null;
  dateOfBirth?: string | null;
  gender: string;
  country: string;
  city: string;
  occupation?: string | null;
  investmentExperience?: string | null;
  notificationPreferences: Record<string, unknown> | null;
  role: ApiUserRole;
  isVerified: boolean;
  csdNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

type UserStatus = "Active" | "Inactive";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  raw: ApiUser;
}

export default function ManagerUsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowsPerPage = 5;

  const { displayName, email } = useMemo(() => {
    const fullName = typeof user?.fullName === "string" ? user.fullName.trim() : "";
    const fallback = user?.email ? user.email.split("@")[0] : "Super Admin";
    return {
      displayName: fullName || fallback,
      email: user?.email ?? "",
    };
  }, [user?.fullName, user?.email]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/user");
      // API responses may be in the shape: ApiUser[] OR { data: ApiUser[] }
      const raw = response.data;
      const fetchedUsers: ApiUser[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      // Filter to show only MANAGER users
      const managerUsers = fetchedUsers.filter(user => user.role === "MANAGER");
      setUsers(managerUsers);
      setCurrentPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const userRows = useMemo<UserRow[]>(() => {
    return users.map((user) => ({
      id: user.id,
      name: user.fullName?.trim() || user.email,
      email: user.email,
      role: "Manager",
      status: user.isVerified ? "Active" : "Inactive",
      raw: user,
    }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return userRows.filter((user) => {
      const matchSearch =
        normalizedSearch.length === 0 ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchStatus = statusFilter === "All" || user.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [userRows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePrevious = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  return (
    <DashboardLayout userRole="super-admin" userName={displayName} userEmail={email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#004B5B] flex items-center gap-2">
              <Users className="h-6 w-6" />
              Manager Users
            </h1>
            <p className="text-gray-600 mt-1">Manage and monitor manager accounts</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium">{filteredUsers.length}</span>
              <span>total managers</span>
            </div>
            <Button
              variant="secondary"
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#004B5B] border border-[#004B5B] hover:bg-[#004B5B]/10"
              onClick={() => void fetchUsers()}
            >
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="p-4 bg-red-50 border border-red-200 text-red-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>{error}</span>
              <Button
                variant="outline"
                className="sm:w-auto w-full px-4 py-2"
                onClick={() => void fetchUsers()}
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

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
            </select>
          </div>

          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-3 text-gray-500 h-4 w-4" />
            <motion.input
              whileFocus={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200 }}
              type="text"
              placeholder="Search managers by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
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
                <th className="p-3">N0 </th>
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
                      Loading manager users...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No manager users found. Adjust your filters or refresh the list.
                  </td>
                </tr>
              )}

              {paginatedUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3">{index + 1}</td>
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
                      onUserUpdated={fetchUsers}
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