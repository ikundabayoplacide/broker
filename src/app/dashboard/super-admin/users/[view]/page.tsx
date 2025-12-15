"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Shield, Mail, Phone, MapPin, Edit, Trash2, 
  Building2, Activity, Lock, AlertTriangle, User, Clock, 
  Globe, CheckCircle, XCircle, Settings, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import {
  baseSignupSchema,
  validateDateOfBirth,
  validatePhoneNumber,
  validatePasswordConfirmation,
  GENDER_VALUES,
  validateProfileDetails,
} from "@/lib/validations/signupValidation";
import { EditUserModal } from "@/components/models/UserModals";
import UserActions from "@/components/models/UserActions";

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
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

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "TELLER" | "COMPANY" | "CLIENT";

interface EditFormState {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  city: string;
  occupation: string;
  investmentExperience: string;
  passportPhoto: string;
  idDocument: string;
  role: ApiUserRole;
  isVerified: boolean;
  notificationPreferences: Record<string, boolean>;
}

const COUNTRY_CODES: Array<{ value: string; label: string }> = [
  { value: "+250", label: "Rwanda (+250)" },
  { value: "+1", label: "United States / Canada (+1)" },
  { value: "+44", label: "United Kingdom (+44)" },
  { value: "+91", label: "India (+91)" },
  { value: "+234", label: "Nigeria (+234)" },
  { value: "+254", label: "Kenya (+254)" },
  { value: "+256", label: "Uganda (+256)" },
  { value: "+27", label: "South Africa (+27)" },
  { value: "+61", label: "Australia (+61)" },
  { value: "+81", label: "Japan (+81)" },
];

const updateUserSchema = baseSignupSchema
  .extend({
    notificationPreferences: z.record(z.string(), z.boolean()).optional(),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "TELLER", "COMPANY", "CLIENT"]).optional(),
    isVerified: z.boolean().optional(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }

    if (data.password !== undefined) {
      if (data.confirmPassword === undefined) {
        ctx.addIssue({
          path: ["confirmPassword"],
          code: z.ZodIssueCode.custom,
          message: "Please confirm the new password",
        });
      } else {
        validatePasswordConfirmation(
          { password: data.password, confirmPassword: data.confirmPassword },
          ctx
        );
      }
    } else if (data.confirmPassword !== undefined) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: z.ZodIssueCode.custom,
        message: "Provide a new password when confirming",
      });
    }

    if (data.dateOfBirth !== undefined) {
      validateDateOfBirth({ dateOfBirth: data.dateOfBirth }, ctx);
    }

    const providedPhone = data.phone !== undefined;
    const providedCode = data.phoneCountryCode !== undefined;
    if (providedPhone || providedCode) {
      if (!data.phone || !data.phoneCountryCode) {
        ctx.addIssue({
          path: providedPhone ? ["phoneCountryCode"] : ["phone"],
          code: z.ZodIssueCode.custom,
          message: "Phone number and country code must be provided together",
        });
      } else {
        validatePhoneNumber(
          { phoneCountryCode: data.phoneCountryCode, phone: data.phone },
          ctx
        );
      }
    }

    validateProfileDetails(data, ctx);
  });

export default function ViewUserPage() {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editBaseline, setEditBaseline] = useState<EditFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditFormState, string>>>({});
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userId = params.view as string;

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/user/${userId}`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPhone = (user: User) => {
    return `${user.phone}`;
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'text-purple-700 bg-purple-100';
      case 'teller': return 'text-blue-700 bg-blue-100';
      case 'client': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'suspended': return 'text-yellow-700 bg-yellow-100';
      case 'deactivated': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  // Mock data for demonstration
  const mockData = {
    lastLogin: '2024-01-15 14:30:25',
    status: 'Active',
    activityLogs: [
      { id: 1, timestamp: '2024-01-15 14:25:10', action: 'Approved client KYC for John Doe', entity: 'Client KYC', ip: '192.168.1.100', status: 'Success' },
      { id: 2, timestamp: '2024-01-15 13:45:22', action: 'Edited company shares for Bank of Kigali', entity: 'Company Shares', ip: '192.168.1.100', status: 'Success' },
      { id: 4, timestamp: '2024-01-14 16:30:45', action: 'Placed trade override for Client #104', entity: 'Trade Override', ip: '192.168.1.100', status: 'Failed' }
    ],
    security: {
      twoFactorEnabled: true,
      lastPasswordChange: '2023-12-01',
      loginDevices: [
        { device: 'Chrome on Windows 11', lastUsed: '2024-01-15 14:30:25', location: 'Kigali, Rwanda' },
        { device: 'Safari on iPhone', lastUsed: '2024-01-14 18:45:12', location: 'Kigali, Rwanda' }
      ],
      loginHistory: [
        { ip: '192.168.1.100', location: 'Kigali, Rwanda', timestamp: '2024-01-15 14:30:25', status: 'Success' },
        { ip: '192.168.1.101', location: 'Kigali, Rwanda', timestamp: '2024-01-14 18:45:12', status: 'Success' },
        { ip: '10.0.0.50', location: 'Musanze, Rwanda', timestamp: '2024-01-13 09:15:30', status: 'Failed' }
      ]
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'activity', label: 'Activity Logs', icon: Activity },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">User not found</p>
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
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <Shield className="h-5 w-5" /> Identity Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">{user.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="flex items-center gap-2 text-gray-900">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {user.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="flex items-center gap-2 text-gray-900">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {formatPhone(user)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(mockData.status)}`}>
                    {mockData.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Login</label>
                  <p className="text-gray-900">{mockData.lastLogin}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Created</label>
                  <p className="text-gray-900">{formatDate(user.createdAt.toString())}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <MapPin className="h-5 w-5" /> Additional Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">{user.city}, {user.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-gray-900">{user.dateOfBirth ? formatDate(user.dateOfBirth.toString()) : "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">ID Number</label>
                  <p className="text-gray-900">{user.idNumber || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CSD Number</label>
                  <p className="text-gray-900">{user.csdNumber || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Occupation</label>
                  <p className="text-gray-900">{user.occupation || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Verification Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    user.isVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.isVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        );

      case 'activity':
        return (
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
              <Activity className="h-5 w-5" /> Activity Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">Entity</th>
                    <th className="p-3 text-left">IP Address</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockData.activityLogs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="p-3">{log.timestamp}</td>
                      <td className="p-3">{log.action}</td>
                      <td className="p-3">{log.entity}</td>
                      <td className="p-3">{log.ip}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#004B5B]">
                <Lock className="h-5 w-5" /> Security Settings
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <Button className="w-full" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                  <Button className="w-full" variant="outline">
                    <XCircle className="h-4 w-4 mr-2" />
                    Force Logout
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">2FA Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      mockData.security.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {mockData.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Password Change</span>
                    <span className="text-sm text-gray-600">{mockData.security.lastPasswordChange}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="mb-3 font-semibold text-gray-900">Login Device History</h4>
              <div className="space-y-3">
                {mockData.security.loginDevices.map((device, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{device.device}</p>
                      <p className="text-xs text-gray-600">{device.location}</p>
                    </div>
                    <span className="text-xs text-gray-500">{device.lastUsed}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="mb-3 font-semibold text-gray-900">Login IP History</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">IP Address</th>
                      <th className="p-2 text-left">Location</th>
                      <th className="p-2 text-left">Timestamp</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.security.loginHistory.map((login, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{login.ip}</td>
                        <td className="p-2">{login.location}</td>
                        <td className="p-2">{login.timestamp}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            login.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {login.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      case 'danger':
        return (
          <Card className="p-6 border-red-200">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-600">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Suspend Admin</h4>
                <p className="text-sm text-yellow-700 mb-3">Temporarily disable access while keeping the account.</p>
                <Button variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">
                  Suspend Account
                </Button>
              </div>
              
              <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">Deactivate Account</h4>
                <p className="text-sm text-orange-700 mb-3">Disable account access but preserve data.</p>
                <Button variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-100">
                  Deactivate Account
                </Button>
              </div>
              
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">Delete Admin</h4>
                <p className="text-sm text-red-700 mb-3">Permanently delete this admin account. This action cannot be undone.</p>
                <Button variant="outline" className="border-red-500 text-red-700 hover:bg-red-100 flex items-center">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
              
            
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  const buildEditForm = (user: User): EditFormState => {
    const prefs = user.notificationPreferences ?? {};
    const normalizedPrefs: Record<string, boolean> = Object.keys(prefs).reduce((acc, key) => {
      const value = prefs[key];
      acc[key] = Boolean(value);
      return acc;
    }, {} as Record<string, boolean>);

    return {
      fullName: user.fullName ?? "",
      email: user.email ?? "",
      phoneCountryCode: user.phoneCountryCode ?? "",
      phone: user.phone ?? "",
      idNumber: user.idNumber ?? "",
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : "",
      gender: "male",
      country: user.country ?? "",
      city: user.city ?? "",
      occupation: user.occupation ?? "",
      investmentExperience: "",
      passportPhoto: "",
      idDocument: "",
      role: user.role as ApiUserRole,
      isVerified: user.isVerified,
      notificationPreferences: normalizedPrefs,
    };
  };

  const openEditModal = () => {
    if (!user) return;
    const form = buildEditForm(user);
    setEditBaseline(form);
    setEditForm(form);
    setEditUser(user);
    setEditError(null);
    setEditErrors({});
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditUser(null);
    setEditForm(null);
    setEditBaseline(null);
    setEditError(null);
    setEditErrors({});
  };

  const openDeleteModal = () => {
    if (!user) return;
    setPendingDelete(user);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const userId = pendingDelete.id;
    setDeletingId(userId);

    try {
      await api.delete(`/user/${userId}`);
      setPendingDelete(null);
      router.push('/dashboard/super-admin/users');
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const updateEditField = (field: string, value: any) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next[field as keyof EditFormState];
      return next;
    });
  };

  const handleEditTextChange = (field: string) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateEditField(field as keyof EditFormState, event.target.value as any);
    };


  const confirmEdit = async () => {
    if (!editUser || !editForm || !editBaseline) return;

    const payload: Record<string, unknown> = {};

    const compareAndSet = (
      key: keyof EditFormState,
      transform: (value: EditFormState[typeof key]) => unknown = (value) => value
    ) => {
      const current = transform(editForm[key]);
      const baseline = transform(editBaseline[key]);
      if (JSON.stringify(current) !== JSON.stringify(baseline)) {
        payload[key] = current;
      }
    };

    compareAndSet("fullName", (value) => String(value ?? "").trim());
    compareAndSet("email", (value) => String(value ?? "").trim());
    compareAndSet("idNumber", (value) => String(value ?? "").trim());
    compareAndSet("country", (value) => String(value ?? "").trim());
    compareAndSet("city", (value) => String(value ?? "").trim());
    compareAndSet("gender", (value) => String(value ?? "").trim().toLowerCase());
    compareAndSet("occupation", (value) => String(value ?? "").trim());
    compareAndSet("investmentExperience", (value) => String(value ?? "").trim());
    compareAndSet("passportPhoto", (value) => String(value ?? "").trim());
    compareAndSet("idDocument", (value) => String(value ?? "").trim());
    compareAndSet("role", (value) => value);
    compareAndSet("isVerified", (value) => value);
    compareAndSet("dateOfBirth", (value) => (value ? new Date(value as string).toISOString() : undefined));
    compareAndSet("notificationPreferences", (value) => value);

    const phoneChanged =
      editForm.phone.trim() !== editBaseline.phone.trim() ||
      editForm.phoneCountryCode.trim() !== editBaseline.phoneCountryCode.trim();

    if (phoneChanged) {
      payload.phone = editForm.phone.trim();
      payload.phoneCountryCode = editForm.phoneCountryCode.trim();
    }

    // Handle email changes
    const emailChanged = editForm.email.trim() !== editBaseline.email.trim();
    if (emailChanged) {
      // Admin/Super-Admin override (keep active)
      const canOverride = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
      if (canOverride && editForm.isVerified) {
        payload.isVerified = true; // Override: keep account active
      }
    }

    if (Object.keys(payload).length === 0) {
      closeEditModal();
      return;
    }

    const validation = updateUserSchema.safeParse(payload);
    if (!validation.success) {
      const flattened = validation.error.flatten();
      const fieldErrors = Object.entries(flattened.fieldErrors).reduce<
        Partial<Record<keyof EditFormState, string>>
      >((acc, [key, messages]) => {
        if (messages && messages[0]) {
          acc[key as keyof EditFormState] = messages[0];
        }
        return acc;
      }, {});

      setEditErrors(fieldErrors);
      setEditError(flattened.formErrors[0] ?? validation.error.issues[0]?.message ?? "Please fix the highlighted fields");
      return;
    }

    const validatedPayload = validation.data;

    setSavingEdit(true);
    setEditError(null);
    setEditErrors({});

    try {
      const { data: updatedUser } = await api.patch<{ data: User }, { data: User }>(
        `/user/${editUser.id}`,
        validatedPayload
      );
      setUser(updatedUser);
      setEditUser(null);
      setEditForm(null);
      setEditBaseline(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setEditError(message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
              <h1 className="text-xl sm:text-2xl font-bold text-[#004B5B]">User Details</h1>
              <p className="text-sm sm:text-base text-gray-600">View and manage user information</p>
            </div>
          </div>
          
          {/* Actions */}
          <UserActions
            user={user as any}
            onUserUpdated={fetchUser}
            showView={false}
            showEdit={true}
            showDelete={true}
          />
        </div>

        {/* Overview Summary */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Left: User Overview */}
          <div className="md:col-span-2 lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">{user.fullName}</h2>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.isVerified ? 'Active' : 'Inactive')}`}>
                      {user.isVerified ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <p className="font-medium break-all">{formatPhone(user)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Login:</span>
                      <p className="font-medium text-xs sm:text-sm">{mockData.lastLogin}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Account Created:</span>
                      <p className="font-medium">{formatDate(user.createdAt.toString())}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Right: Quick Stats */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Account Status</p>
                  <p className="font-semibold">{user.isVerified ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Last Active</p>
                  <p className="font-semibold text-sm">{mockData.lastLogin}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
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
                  <span className="inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}