"use client";

import { useState, useMemo, useEffect, useCallback, type ChangeEvent, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, UserPlus, Search, Eye, RefreshCcw, Loader2, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { z } from "zod";
import {
  userCreationSchema,
  baseSignupSchema,
  validateDateOfBirth,
  validatePhoneNumber,
  validatePasswordConfirmation,
  GENDER_VALUES,
  validateProfileDetails,
  type UserCreationPayload,
} from "@/lib/validations/signupValidation";
import api, { authApi } from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "TELLER" | "COMPANY" | "CLIENT";

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

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<UserRow | null>(null);
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
      const response = await api.get<{ data: ApiUser[] }>("/user");
      const fetchedUsers = Array.isArray(response.data) ? response.data : [];
      // Filter only ADMIN users
      const adminUsers = fetchedUsers.filter(user => user.role === "ADMIN");
      setUsers(adminUsers);
      setCurrentPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load admin users";
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
      role: "Admin",
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

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const formatPhone = (user: ApiUser) => {
    if (!user.phoneCountryCode && !user.phone) return "—";
    return `${user.phoneCountryCode ?? ""}${user.phone ?? ""}`.trim();
  };

  return (
    <DashboardLayout userRole="super-admin" userName={displayName} userEmail={email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#004B5B]">Admin Users</h1>
            <p className="text-sm text-gray-500">Manage administrator accounts and permissions.</p>
          </div>
          <Button
            variant="secondary"
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#004B5B] border border-[#004B5B] hover:bg-[#004B5B]/10"
            onClick={() => void fetchUsers()}
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
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
              placeholder="Search admin users..."
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
                      Loading admin users...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No admin users found. Adjust your filters or refresh the list.
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
                  <h2 className="text-xl font-semibold text-[#004B5B]">Admin User Details</h2>
                  <p className="text-sm text-gray-500">Review the administrator profile information</p>
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
                    <li><span className="font-medium">Role:</span> Administrator</li>
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