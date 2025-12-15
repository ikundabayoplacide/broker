"use client";

import { useState, useMemo, useEffect, useCallback, type ChangeEvent, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, RefreshCcw, Loader2, Mail, Phone, MapPin, Calendar, Shield, FileText } from "lucide-react";
import UserActions from "@/components/models/UserActions";
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
import ReportModal, { type ReportConfig } from "@/components/models/ReportModal";
import { ReportGenerator } from "@/utils/reportGenerator";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "COMPANY" | "CLIENT";

type ManagementMode = "SUPER_ADMIN" | "ADMIN" | "TELLER";

type UserDisplayRole = "Super Admin" | "Admin" | "Manager" | "Teller" | "Company" | "Client";
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
  role: UserDisplayRole;
  status: UserStatus;
  raw: ApiUser;
}

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

type NotificationPreferences = Record<string, boolean>;

const roleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "TELLER", "COMPANY", "CLIENT"]);

type AdminSignupFormData = z.input<typeof baseSignupSchema>;

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

const INVESTMENT_EXPERIENCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Select experience level" },
  { value: "beginner", label: "Beginner (0-1 years)" },
  { value: "intermediate", label: "Intermediate (1-5 years)" },
  { value: "experienced", label: "Experienced (5+ years)" },
];

const GENDER_LABELS: Record<(typeof GENDER_VALUES)[number], string> = {
  male: "Male",
  female: "Female",
};

const GENDER_OPTIONS = GENDER_VALUES.map((value) => ({ value, label: GENDER_LABELS[value] }));

const OTP_LENGTH = 6;

const ROLE_LABELS: Record<ApiUserRole, UserDisplayRole> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  TELLER: "Teller",
  COMPANY: "Company",
  CLIENT: "Client",
};

const ROLE_ORDER: ApiUserRole[] = ["SUPER_ADMIN", "ADMIN", "TELLER", "COMPANY", "CLIENT"];

type DashboardRole = "client" | "teller" | "admin" | "manager" | "super-admin" | "company";

interface ModeConfig {
  dashboardRole: DashboardRole;
  title: string;
  subtitle: string;
  addButtonLabel: string;
  itemNoun: string;
  itemPlural: string;
  allowedCreateRoles: ApiUserRole[];
  allowedEditRoles: ApiUserRole[];
  defaultCreateRole: ApiUserRole;
  lockedRoleTargets: ApiUserRole[];
  deleteBlockedRoles: ApiUserRole[];
}

const MODE_CONFIG: Record<ManagementMode, ModeConfig> = {
  SUPER_ADMIN: {
    dashboardRole: "super-admin",
    title: "User directory",
    subtitle: "Create accounts and assign roles across the platform.",
    addButtonLabel: "Add user",
    itemNoun: "user",
     itemPlural: "users",
    allowedCreateRoles: ROLE_ORDER,
    allowedEditRoles: ROLE_ORDER,
    defaultCreateRole: "CLIENT",
    lockedRoleTargets: [],
    deleteBlockedRoles: [],
  },
  ADMIN: {
    dashboardRole: "admin",
    title: "Manage users",
    subtitle: "Invite team members and keep client access up to date.",
    addButtonLabel: "Add user",
    itemNoun: "user",
    itemPlural: "users",
    allowedCreateRoles: ["ADMIN", "TELLER", "COMPANY", "CLIENT"],
    allowedEditRoles: ["ADMIN", "TELLER", "COMPANY", "CLIENT"],
    defaultCreateRole: "CLIENT",
    lockedRoleTargets: ["SUPER_ADMIN"],
    deleteBlockedRoles: ["SUPER_ADMIN"],
  },
  TELLER: {
    dashboardRole: "teller",
    title: "Manage clients",
    subtitle: "Onboard clients and keep their profiles current.",
    addButtonLabel: "Add client",
    itemNoun: "client",
  itemPlural: "clients",
    allowedCreateRoles: ["CLIENT"],
    allowedEditRoles: ["CLIENT"],
    defaultCreateRole: "CLIENT",
    lockedRoleTargets: ["SUPER_ADMIN", "ADMIN", "TELLER", "COMPANY"],
    deleteBlockedRoles: ["SUPER_ADMIN", "ADMIN", "TELLER", "COMPANY"],
  },
};

const normalizeAuthRole = (role?: string | null): ManagementMode => {
  const normalized = role?.toUpperCase().replace(/-/g, "_");
  switch (normalized) {
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "TELLER":
      return "TELLER";
    default:
      return "ADMIN";
  }
};

const MODE_LABEL: Record<ManagementMode, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TELLER: "Teller",
};

const updateUserSchema = baseSignupSchema
  .extend({
    notificationPreferences: z.record(z.string(), z.boolean()).optional(),
    role: roleEnum.optional(),
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

const createInitialForm = (): AdminSignupFormData => ({
  fullName: "",
  email: "",
  phoneCountryCode: "+250",
  phone: "",
  password: "",
  confirmPassword: "",
  gender: "male",
  country: "",
  city: "",
  idNumber: "",
  passportPhoto: "",
  idDocument: "",
  dateOfBirth: "",
  occupation: "",
  investmentExperience: "",
});

interface CreateExtras {
  role: ApiUserRole;
  notificationPreferences: NotificationPreferences;
}

const createInitialExtras = (defaultRole: ApiUserRole): CreateExtras => ({
  role: defaultRole,
  notificationPreferences: {
    email: true,
    sms: false,
    push: true,
  },
});

export default function UserManagementPage() {
  const { user } = useAuth();
  const actorMode = useMemo<ManagementMode>(() => normalizeAuthRole(user?.role), [user?.role]);
  const config = MODE_CONFIG[actorMode];

  const { displayName, email } = useMemo(() => {
    const fullName = typeof user?.fullName === "string" ? user.fullName.trim() : "";
    const fallback = user?.email ? user.email.split("@")[0] : MODE_LABEL[actorMode];
    return {
      displayName: fullName || fallback || MODE_LABEL[actorMode],
      email: user?.email ?? "",
    };
  }, [user?.fullName, user?.email, actorMode]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editBaseline, setEditBaseline] = useState<EditFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditFormState, string>>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AdminSignupFormData>(createInitialForm());
  const [createExtras, setCreateExtras] = useState<CreateExtras>(() => createInitialExtras(config.defaultCreateRole));
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof AdminSignupFormData, string>>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpContext, setOtpContext] = useState<{ email: string; userId: string | null }>({ email: "", userId: null });
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormat, setReportFormat] = useState<'pdf' | 'word'>('pdf');
  const rowsPerPage = 5;

  useEffect(() => {
    setCreateExtras((prev) => {
      if (config.allowedCreateRoles.includes(prev.role)) {
        return prev;
      }
      return {
        ...prev,
        role: config.defaultCreateRole,
      };
    });
  }, [config.allowedCreateRoles, config.defaultCreateRole]);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const formatPhone = (user: ApiUser) => {
    if (!user.phone) return "—";
    return user.phone.trim();
  };

  const roleLabel = (role: ApiUserRole): UserRow["role"] => ROLE_LABELS[role];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<{ data: ApiUser[] }>("/user");
      const fetchedUsers = Array.isArray(response.data) ? response.data : [];
      setUsers(fetchedUsers);
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
      role: roleLabel(user.role),
      status: user.isVerified ? "Active" : "Inactive",
      raw: user,
    }));
  }, [users]);

  const availableRoleFilters = useMemo<UserDisplayRole[]>(() => {
    const currentRoles = new Set<UserDisplayRole>();
    for (const row of userRows) {
      currentRoles.add(row.role);
    }
    return ROLE_ORDER.map((role) => ROLE_LABELS[role]).filter((label) => currentRoles.has(label as UserDisplayRole)) as UserDisplayRole[];
  }, [userRows]);

  const editRoleOptions = useMemo<ApiUserRole[]>(() => {
    if (!editForm) {
      return config.allowedEditRoles;
    }
    const unique = new Set<ApiUserRole>([editForm.role, ...config.allowedEditRoles]);
    return Array.from(unique);
  }, [editForm, config.allowedEditRoles]);

  const userStats = useMemo(() => {
    const stats = {
      total: users.length,
      active: 0,
      inactive: 0,
      byRole: {} as Record<ApiUserRole, number>,
    };

    users.forEach((user) => {
      if (user.isVerified) stats.active++;
      else stats.inactive++;
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
    });

    return stats;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return userRows.filter((user) => {
      const matchSearch =
        normalizedSearch.length === 0 ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchRole = roleFilter === "All" || user.role === roleFilter;
      const matchStatus = statusFilter === "All" || user.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [userRows, search, roleFilter, statusFilter]);

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

  const openDeleteModal = (user: UserRow) => {
    setPendingDelete(user);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const userId = pendingDelete.id;

    if (config.deleteBlockedRoles.includes(pendingDelete.raw.role)) {
      setError(`You don't have permission to delete ${ROLE_LABELS[pendingDelete.raw.role]} accounts.`);
      setPendingDelete(null);
      return;
    }

    setDeletingId(userId);
    setError(null);

    try {
      await api.delete(`/user/${userId}`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setPendingDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = () => {
    setCreateForm(createInitialForm());
    setCreateExtras(createInitialExtras(config.defaultCreateRole));
    setCreateErrors({});
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setIsCreateOpen(false);
    setCreateForm(createInitialForm());
    setCreateExtras(createInitialExtras(config.defaultCreateRole));
    setCreateErrors({});
    setCreateError(null);
  };

  const buildEditForm = (user: UserRow): EditFormState => {
    const raw = user.raw;
    const prefs = raw.notificationPreferences ?? {};
    const normalizedPrefs: Record<string, boolean> = Object.keys(prefs).reduce((acc, key) => {
      const value = prefs[key];
      acc[key] = Boolean(value);
      return acc;
    }, {} as Record<string, boolean>);

    return {
      fullName: raw.fullName ?? "",
      email: raw.email ?? "",
      phoneCountryCode: raw.phoneCountryCode ?? "",
      phone: raw.phone ?? "",
      idNumber: raw.idNumber ?? "",
      dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth).toISOString().slice(0, 10) : "",
      gender: raw.gender ?? "male",
      country: raw.country ?? "",
      city: raw.city ?? "",
      occupation: raw.occupation ?? "",
      investmentExperience: raw.investmentExperience ?? "",
      passportPhoto: raw.passportPhoto ?? "",
      idDocument: raw.idDocument ?? "",
      role: raw.role,
      isVerified: raw.isVerified,
      notificationPreferences: normalizedPrefs,
    };
  };

  const openEditModal = (user: UserRow) => {
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

  const updateEditField = <K extends keyof EditFormState>(field: K, value: EditFormState[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleEditTextChange = <K extends keyof EditFormState>(field: K) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateEditField(field, event.target.value as EditFormState[K]);
    };

  const handleEditCheckboxChange = <K extends keyof EditFormState>(field: K) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateEditField(field, event.target.checked as EditFormState[K]);
    };

  const handleNotificationPreferenceChange = (key: string) => (checked: boolean) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notificationPreferences: {
          ...prev.notificationPreferences,
          [key]: checked,
        },
      };
    });
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next.notificationPreferences;
      return next;
    });
  };

  const handleEditRoleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as ApiUserRole;
    if (!config.allowedEditRoles.includes(value)) {
      return;
    }
    updateEditField("role", value);
  };

  const handleEditFileUpload = (field: "passportPhoto" | "idDocument") => (value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setEditError(null);
  };

  const handleCreateInputChange = (field: keyof AdminSignupFormData) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setCreateForm((prev) => ({ ...prev, [field]: value }));
      setCreateErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setCreateError(null);
    };

  const handleCreateFileUpload = (field: "passportPhoto" | "idDocument") => (value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setCreateError(null);
  };

  const handleCreateSelectChange = (field: keyof AdminSignupFormData) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      setCreateForm((prev) => ({ ...prev, [field]: value }));
      setCreateErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setCreateError(null);
    };

  const handleCreateRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as ApiUserRole;
    if (!config.allowedCreateRoles.includes(value)) {
      return;
    }
    setCreateExtras((prev) => ({ ...prev, role: value }));
  };

  const handleCreateNotificationChange = (key: string) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setCreateExtras((prev) => ({
        ...prev,
        notificationPreferences: {
          ...prev.notificationPreferences,
          [key]: checked,
        },
      }));
    };

  const openOtpModal = (email: string, userId: string) => {
    setOtpContext({ email, userId });
    setOtpCode("");
    setOtpError(null);
    setOtpInfo(null);
    setIsOtpModalOpen(true);
  };

  const closeOtpModal = (force = false) => {
    if (verifyingOtp && !force) return;
    setIsOtpModalOpen(false);
    setOtpContext({ email: "", userId: null });
    setOtpCode("");
    setOtpError(null);
    setOtpInfo(null);
  };

  const handleOtpCodeChange = (value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtpCode(sanitized);
    setOtpError(null);
  };

  const handleResendOtp = async () => {
    if (!otpContext.email) return;
    setResendingOtp(true);
    setOtpError(null);
    setOtpInfo(null);

    try {
      const response = await authApi.resendOtp(otpContext.email);
      setOtpInfo(response.message ?? `A new verification code was sent to ${otpContext.email}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend verification code";
      setOtpError(message);
    } finally {
      setResendingOtp(false);
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!otpContext.email || !otpContext.userId) return;

    if (otpCode.length !== OTP_LENGTH) {
      setOtpError(`Enter the ${OTP_LENGTH}-digit code sent to ${otpContext.email}.`);
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
  const response = await authApi.verifyOtp({ email: otpContext.email, otp: otpCode });
  const successMessage = `${response.message ?? "User verified successfully."} Generated CSD number: ${response.csdNumber}.`;
      setUsers((prev) =>
        prev.map((user) =>
          user.id === otpContext.userId ? { ...user, isVerified: true } : user
        )
      );
      setFlashMessage({ type: "success", message: successMessage });
      closeOtpModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify OTP";
      setOtpError(message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;

    setCreateError(null);

  const validation = userCreationSchema.safeParse(createForm);
    if (!validation.success) {
      const flattened = validation.error.flatten();
      const fieldErrors = Object.entries(flattened.fieldErrors).reduce<
        Partial<Record<keyof AdminSignupFormData, string>>
      >((acc, [key, messages]) => {
        if (messages && messages[0]) {
          acc[key as keyof AdminSignupFormData] = messages[0];
        }
        return acc;
      }, {});

      setCreateErrors(fieldErrors);
      setCreateError(flattened.formErrors[0] ?? "Please fix the highlighted fields");
      return;
    }

  const normalized: UserCreationPayload = validation.data;

    const payload: Record<string, unknown> = {
      ...normalized,
    };

    if (Object.keys(createExtras.notificationPreferences).length > 0) {
      payload.notificationPreferences = createExtras.notificationPreferences;
    }

    if (createExtras.role) {
      payload.role = config.allowedCreateRoles.includes(createExtras.role)
        ? createExtras.role
        : config.defaultCreateRole;
    }

    payload.isVerified = false;

    setCreating(true);

    try {
      const { data: newUser } = await api.post<{ data: ApiUser }, { data: ApiUser }>('/user', payload);
      setUsers((prev) => [newUser, ...prev]);
      setCurrentPage(1);

      let otpSendError: string | null = null;
      let resendMessage: string | null = null;
      try {
        const resendResponse = await authApi.resendOtp(newUser.email);
        resendMessage = resendResponse.message ?? `Verification code sent to ${newUser.email}.`;
      } catch (otpErr) {
        otpSendError = otpErr instanceof Error ? otpErr.message : "Failed to send verification OTP";
      }

      setIsCreateOpen(false);
      setCreateForm(createInitialForm());
  setCreateExtras(createInitialExtras(config.defaultCreateRole));
      setCreateErrors({});
      setCreateError(null);
      openOtpModal(newUser.email, newUser.id);

      if (otpSendError) {
        setOtpError(otpSendError);
        setFlashMessage({
          type: "error",
          message: `User created, but sending verification OTP failed: ${otpSendError}`,
        });
      } else {
        setOtpInfo(resendMessage ?? `Verification code sent to ${newUser.email}.`);
        setFlashMessage({
          type: "success",
          message: `User created. Enter the OTP sent to ${newUser.email} to activate their account.`,
        });
      }
    } catch (err) {
      const enrichedError = err as Error & {
        fieldErrors?: Array<{ field?: string; message: string }>;
      };

      if (Array.isArray(enrichedError.fieldErrors)) {
        const fieldErrors = enrichedError.fieldErrors.reduce<
          Partial<Record<keyof AdminSignupFormData, string>>
        >((acc, issue) => {
          if (issue.field) {
            acc[issue.field as keyof AdminSignupFormData] = issue.message;
          }
          return acc;
        }, {});
        setCreateErrors(fieldErrors);
        setCreateError("Please fix the highlighted fields and try again.");
      } else {
        setCreateError(enrichedError.message || "Failed to create user");
      }
    } finally {
      setCreating(false);
    }
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

    // Handle email changes - Admin/Super-Admin override
    const emailChanged = editForm.email.trim() !== editBaseline.email.trim();
    if (emailChanged) {
      const canOverride = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
      if (canOverride && editForm.isVerified) {
        payload.isVerified = true; // Override: keep account active
      }
    }

    if (Object.keys(payload).length === 0) {
      closeEditModal();
      return;
    }

    if ("role" in payload) {
      const requestedRole = payload.role as ApiUserRole;
      if (!config.allowedEditRoles.includes(requestedRole) || (editUser && config.lockedRoleTargets.includes(editUser.raw.role))) {
        delete payload.role;
      }
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
      const { data: updatedUser } = await api.patch<{ data: ApiUser }, { data: ApiUser }>(
        `/user/${editUser.id}`,
        validatedPayload
      );
      setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setViewUser((prev) => {
        if (!prev || prev.id !== updatedUser.id) return prev;
        return {
          id: updatedUser.id,
          name: updatedUser.fullName?.trim() || updatedUser.email,
          email: updatedUser.email,
          role: roleLabel(updatedUser.role),
          status: updatedUser.isVerified ? "Active" : "Inactive",
          raw: updatedUser,
        };
      });
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

  const availableReportFields = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'country', label: 'Country' },
    { key: 'city', label: 'City' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'investmentExperience', label: 'Investment Experience' },
    { key: 'isVerified', label: 'Verified Status' },
    { key: 'csdNumber', label: 'CSD Number' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleReportGenerate = async (config: ReportConfig) => {
    try {
      // Filter users by date range
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      endDate.setHours(23, 59, 59, 999); // Include full end date
      
      const filteredData = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= startDate && userDate <= endDate;
      });

      // Transform data for report
      const reportData = filteredData.map(user => ({
        fullName: user.fullName || '',
        email: user.email || '',
        role: ROLE_LABELS[user.role] || '',
        status: user.isVerified ? 'Active' : 'Inactive',
        phone: formatPhone(user),
        country: user.country || '',
        city: user.city || '',
        dateOfBirth: formatDate(user.dateOfBirth),
        occupation: user.occupation || '',
        investmentExperience: user.investmentExperience || '',
        isVerified: user.isVerified ? 'Yes' : 'No',
        csdNumber: user.csdNumber || '',
        createdAt: formatDate(user.createdAt),
      }));

      const reportInfo = {
        title: 'Users Report',
        data: reportData,
        fields: availableReportFields,
        dateRange: { start: config.startDate, end: config.endDate }
      };

      if (config.format === 'pdf') {
        await ReportGenerator.generatePDF(reportInfo, config);
      } else {
        await ReportGenerator.generateWord(reportInfo, config);
      }

      setFlashMessage({
        type: 'success',
        message: `${config.format.toUpperCase()} report generated successfully!`
      });
    } catch (error) {
      setFlashMessage({
        type: 'error',
        message: `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  return (
    <DashboardLayout userRole={config.dashboardRole} userName={displayName} userEmail={email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-[#004B5B]">{config.title}</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">{config.subtitle}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#004B5B] border border-[#004B5B] hover:bg-[#004B5B]/10 text-sm font-medium rounded-lg transition-colors"
              onClick={() => void fetchUsers()}
            >
              <RefreshCcw className="h-4 w-4" /> 
              <span>Refresh</span>
            </Button>
            <Button
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#004B5B] text-white hover:bg-[#006B85] rounded-lg text-sm font-medium transition-colors"
              onClick={openCreateModal}
            >
              <UserPlus className="h-4 w-4" /> 
              <span>{config.addButtonLabel}</span>
            </Button>
          </div>
        </div>



        {flashMessage && (
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm ${
              flashMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span>{flashMessage.message}</span>
            <Button
              variant="outline"
              className="px-3 py-1"
              onClick={() => setFlashMessage(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

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
        <Card className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 flex-1">
              <select
                className="border border-[#004B5B]/50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#004B5B] focus:ring-2 focus:ring-[#004B5B]/20 transition-all bg-white min-w-0 flex-1 sm:flex-none sm:min-w-[140px]"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All roles</option>
                <option value="Teller">Teller</option>
                <option value="Client">Client</option>
                {availableRoleFilters.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="border border-[#004B5B]/50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#004B5B] focus:ring-2 focus:ring-[#004B5B]/20 transition-all bg-white min-w-0 flex-1 sm:flex-none sm:min-w-[140px]"
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

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReportFormat('word');
                  setShowReportModal(true);
                }}
                className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4" />
                Word
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#004B5B] bg-white outline-none border border-[#004B5B]/50 focus:border-[#004B5B] focus:ring-2 focus:ring-[#004B5B]/20 transition-all"
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden p-3">
          {/* Mobile Card View */}
          <div className="block lg:hidden">
            {loading && (
              <div className="p-8 text-center text-[#004B5B]">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading users...
                </div>
              </div>
            )}

            {!loading && paginatedUsers.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {`No ${config.itemPlural} found. Adjust your filters or refresh the list.`}
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {paginatedUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 mt-1 truncate">{user.email}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-gray-600">{user.role}</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserActions
                        user={user.raw}
                        onUserUpdated={fetchUsers}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#004B5B]/10 text-[#004B5B] uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#004B5B]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading users...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      {`No ${config.itemPlural} found. Adjust your filters or refresh the list.`}
                    </td>
                  </tr>
                )}

                {paginatedUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-medium text-sm text-gray-900">{user.name}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{user.email}</td>
                    <td className="p-4 text-sm text-gray-600">{user.role}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <UserActions
                          user={user.raw}
                          onUserUpdated={fetchUsers}
                        />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

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

        <AnimatePresence>
          {isCreateOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
                  <div className="flex-1">
                    <h2 className="text-lg md:text-xl font-semibold text-[#004B5B]">Add new user</h2>
                    <p className="text-sm text-gray-500 mt-1">Fill in the required information to create a user account</p>
                  </div>
                  <Button variant="outline" className="px-4 py-2 text-sm" onClick={closeCreateModal} disabled={creating}>
                    Close
                  </Button>
                </div>

                {createError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {createError}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto">
                  <form className="grid gap-4 lg:grid-cols-2 p-6" onSubmit={handleCreateSubmit}>
                    <InputField
                      name="fullName"
                      label="Full name"
                      type="text"
                      value={createForm.fullName ?? ""}
                      onChange={handleCreateInputChange("fullName")}
                      placeholder="Enter full name"
                      disabled={creating}
                      error={createErrors.fullName}
                      required
                    />

                    <InputField
                      name="email"
                      label="Email"
                      type="email"
                      value={createForm.email}
                      onChange={handleCreateInputChange("email")}
                      placeholder="Enter email"
                      disabled={creating}
                      error={createErrors.email}
                    />

                    <InputField
                      name="idNumber"
                      label="ID number"
                      type="text"
                      value={createForm.idNumber ?? ""}
                      onChange={handleCreateInputChange("idNumber")}
                      placeholder="Enter ID number"
                      disabled={creating}
                      error={createErrors.idNumber}
                    />

                    <FileUploadField
                      name="passportPhoto"
                      label="Passport photo"
                      value={createForm.passportPhoto ?? ""}
                      onChange={handleCreateFileUpload("passportPhoto")}
                      accept="image/*"
                      disabled={creating}
                      error={createErrors.passportPhoto}
                      helperText="Upload a clear passport-style photo (image up to 10MB)"
                    />

                    <FileUploadField
                      name="idDocument"
                      label="Identification document"
                      value={createForm.idDocument ?? ""}
                      onChange={handleCreateFileUpload("idDocument")}
                      accept="image/*,application/pdf"
                      disabled={creating}
                      error={createErrors.idDocument}
                      helperText="Upload the ID document (image or PDF up to 10MB)"
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#004B5B]" htmlFor="create-phoneCountryCode">
                        Phone country code
                      </label>
                      <select
                        id="create-phoneCountryCode"
                        name="phoneCountryCode"
                        value={createForm.phoneCountryCode}
                        onChange={handleCreateSelectChange("phoneCountryCode")}
                        disabled={creating}
                        className="w-full rounded-md border border-[#004B5B]/50 bg-transparent px-4 py-2 text-sm text-[#004B5B] outline-none transition-all focus:border-[#004B5B]"
                      >
                        {COUNTRY_CODES.map((code) => (
                          <option key={code.value} value={code.value}>
                            {code.label}
                          </option>
                        ))}
                      </select>
                      {createErrors.phoneCountryCode && (
                        <p className="text-sm text-red-600 ml-2">{createErrors.phoneCountryCode}</p>
                      )}
                    </div>

                    <InputField
                      name="phone"
                      label="Phone number"
                      type="text"
                      value={createForm.phone ?? ""}
                      onChange={handleCreateInputChange("phone")}
                      placeholder="Enter phone number"
                      disabled={creating}
                      error={createErrors.phone}
                    />

                    <InputField
                      name="dateOfBirth"
                      label="Date of birth"
                      type="date"
                      value={createForm.dateOfBirth ?? ""}
                      onChange={handleCreateInputChange("dateOfBirth")}
                      disabled={creating}
                      error={createErrors.dateOfBirth}
                    />

                    <InputField
                      name="country"
                      label="Country"
                      type="text"
                      value={createForm.country ?? ""}
                      onChange={handleCreateInputChange("country")}
                      placeholder="Enter country"
                      disabled={creating}
                      error={createErrors.country}
                    />

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-[#004B5B]" htmlFor="create-gender">
                          Gender
                        </label>
                        <select
                          id="create-gender"
                          name="gender"
                          value={createForm.gender}
                          onChange={handleCreateSelectChange("gender")}
                          disabled={creating}
                          className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                            createErrors.gender
                              ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                              : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
                          } ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {GENDER_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        {createErrors.gender && (
                          <p className="text-sm text-red-600 ml-2">{createErrors.gender}</p>
                        )}
                      </div>

                    <InputField
                      name="city"
                      label="City"
                      type="text"
                      value={createForm.city ?? ""}
                      onChange={handleCreateInputChange("city")}
                      placeholder="Enter city"
                      disabled={creating}
                      error={createErrors.city}
                    />

                    <InputField
                      name="occupation"
                      label="Occupation"
                      type="text"
                      value={createForm.occupation ?? ""}
                      onChange={handleCreateInputChange("occupation")}
                      placeholder="Enter occupation"
                      disabled={creating}
                      error={createErrors.occupation}
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#004B5B]" htmlFor="create-investmentExperience">
                        Investment experience
                      </label>
                      <select
                        id="create-investmentExperience"
                        name="investmentExperience"
                        value={createForm.investmentExperience ?? ""}
                        onChange={handleCreateSelectChange("investmentExperience")}
                        disabled={creating}
                        className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                          createErrors.investmentExperience
                            ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                            : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
                        } ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {INVESTMENT_EXPERIENCE_OPTIONS.map((option) => (
                          <option
                            key={option.value || "placeholder"}
                            value={option.value}
                            disabled={option.value === ""}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {createErrors.investmentExperience && (
                        <p className="text-sm text-red-600 ml-2">{createErrors.investmentExperience}</p>
                      )}
                    </div>

                    <InputField
                      name="password"
                      label="Password"
                      type="password"
                      value={createForm.password}
                      onChange={handleCreateInputChange("password")}
                      placeholder="Enter password"
                      disabled={creating}
                      showVisibilityToggle
                      error={createErrors.password}
                    />

                    <InputField
                      name="confirmPassword"
                      label="Confirm password"
                      type="password"
                      value={createForm.confirmPassword}
                      onChange={handleCreateInputChange("confirmPassword")}
                      placeholder="Confirm password"
                      disabled={creating}
                      showVisibilityToggle
                      error={createErrors.confirmPassword}
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#004B5B]">Role</label>
                      <select
                        value={createExtras.role}
                        onChange={handleCreateRoleChange}
                        disabled={creating || config.allowedCreateRoles.length <= 1}
                        className="w-full rounded-md border border-[#004B5B]/50 bg-transparent px-4 py-2 text-sm text-[#004B5B] outline-none transition-all focus:border-[#004B5B]"
                      >
                        {config.allowedCreateRoles.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      {config.allowedCreateRoles.length <= 1 && (
                        <p className="text-xs text-gray-500">{`Role is fixed to ${ROLE_LABELS[config.defaultCreateRole]}.`}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <h3 className="text-sm font-semibold text-[#004B5B]">Notification preferences</h3>
                      <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {Object.entries(createExtras.notificationPreferences).map(([key, value]) => (
                          <label key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={handleCreateNotificationChange(key)}
                              disabled={creating}
                              className="h-4 w-4 rounded border-gray-300 text-[#004B5B] focus:ring-[#004B5B]"
                            />
                            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                      <Button variant="outline" className="px-6 py-2.5 w-full sm:w-auto" onClick={closeCreateModal} disabled={creating}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="px-6 py-2.5 bg-[#004B5B] hover:bg-[#006B85] text-white w-full sm:w-auto font-medium"
                        disabled={creating}
                      >
                        {creating ? (
                          <span className="flex items-center gap-2 justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating...
                          </span>
                        ) : (
                          "Create user"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}

          {editUser && editForm && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
                  <div className="flex-1">
                    <h2 className="text-lg md:text-xl font-semibold text-[#004B5B]">Edit user</h2>
                    <p className="text-sm text-gray-500 mt-1">Update profile details and access permissions</p>
                  </div>
                  <Button variant="outline" className="px-4 py-2 text-sm" onClick={closeEditModal} disabled={savingEdit}>
                    Close
                  </Button>
                </div>

                {editError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {editError}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto">
                  <form
                    className="grid gap-4 lg:grid-cols-2 p-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void confirmEdit();
                    }}
                  >
                  <InputField
                    name="fullName"
                    label="Full name"
                    type="text"
                    value={editForm.fullName}
                    onChange={handleEditTextChange("fullName")}
                    placeholder="Enter full name"
                    disabled={savingEdit}
                    error={editErrors.fullName}
                  />

                  <InputField
                    name="email"
                    label="Email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditTextChange("email")}
                    placeholder="Enter email"
                    disabled={savingEdit}
                    error={editErrors.email}
                  />

                  <InputField
                    name="idNumber"
                    label="ID number"
                    type="text"
                    value={editForm.idNumber ?? ""}
                    onChange={handleEditTextChange("idNumber")}
                    placeholder="Enter ID number"
                    disabled={savingEdit}
                    error={editErrors.idNumber}
                  />

                  <FileUploadField
                    name="passportPhoto"
                    label="Passport photo"
                    value={editForm.passportPhoto ?? ""}
                    onChange={handleEditFileUpload("passportPhoto")}
                    accept="image/*"
                    disabled={savingEdit}
                    error={editErrors.passportPhoto}
                    helperText="Upload a clear passport-style photo (image up to 10MB)"
                  />

                  <FileUploadField
                    name="idDocument"
                    label="Identification document"
                    value={editForm.idDocument ?? ""}
                    onChange={handleEditFileUpload("idDocument")}
                    accept="image/*,application/pdf"
                    disabled={savingEdit}
                    error={editErrors.idDocument}
                    helperText="Upload the ID document (image or PDF up to 10MB)"
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#004B5B]" htmlFor="edit-phoneCountryCode">
                      Phone country code
                    </label>
                    <select
                      id="edit-phoneCountryCode"
                      name="phoneCountryCode"
                      value={editForm.phoneCountryCode}
                      onChange={(event) => updateEditField("phoneCountryCode", event.target.value)}
                      disabled={savingEdit}
                      className="w-full rounded-md border border-[#004B5B]/50 bg-transparent px-4 py-2 text-sm text-[#004B5B] outline-none transition-all focus:border-[#004B5B]"
                    >
                      {COUNTRY_CODES.map((code) => (
                        <option key={code.value} value={code.value}>
                          {code.label}
                        </option>
                      ))}
                    </select>
                    {editErrors.phoneCountryCode && (
                      <p className="text-sm text-red-600 ml-2">{editErrors.phoneCountryCode}</p>
                    )}
                  </div>

                  <InputField
                    name="phone"
                    label="Phone number"
                    type="text"
                    value={editForm.phone ?? ""}
                    onChange={handleEditTextChange("phone")}
                    placeholder="Enter phone number"
                    disabled={savingEdit}
                    error={editErrors.phone}
                  />

                  <InputField
                    name="dateOfBirth"
                    label="Date of birth"
                    type="date"
                    value={editForm.dateOfBirth ?? ""}
                    onChange={handleEditTextChange("dateOfBirth")}
                    disabled={savingEdit}
                    error={editErrors.dateOfBirth}
                  />

                  <InputField
                    name="country"
                    label="Country"
                    type="text"
                    value={editForm.country ?? ""}
                    onChange={handleEditTextChange("country")}
                    placeholder="Enter country"
                    disabled={savingEdit}
                    error={editErrors.country}
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#004B5B]" htmlFor="edit-gender">
                      Gender
                    </label>
                    <select
                      id="edit-gender"
                      name="gender"
                      value={editForm.gender || "male"}
                      onChange={(event) => updateEditField("gender", event.target.value)}
                      disabled={savingEdit}
                      className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                        editErrors.gender
                          ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                          : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
                      } ${savingEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {GENDER_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {editErrors.gender && (
                      <p className="text-sm text-red-600 ml-2">{editErrors.gender}</p>
                    )}
                  </div>

                  <InputField
                    name="city"
                    label="City"
                    type="text"
                    value={editForm.city ?? ""}
                    onChange={handleEditTextChange("city")}
                    placeholder="Enter city"
                    disabled={savingEdit}
                    error={editErrors.city}
                  />

                  <InputField
                    name="occupation"
                    label="Occupation"
                    type="text"
                    value={editForm.occupation ?? ""}
                    onChange={handleEditTextChange("occupation")}
                    placeholder="Enter occupation"
                    disabled={savingEdit}
                    error={editErrors.occupation}
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#004B5B]" htmlFor="edit-investmentExperience">
                      Investment experience
                    </label>
                    <select
                      id="edit-investmentExperience"
                      name="investmentExperience"
                      value={editForm.investmentExperience || ""}
                      onChange={(event) => updateEditField("investmentExperience", event.target.value)}
                      disabled={savingEdit}
                      className={`w-full rounded-md px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                        editErrors.investmentExperience
                          ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                          : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
                      } ${savingEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {INVESTMENT_EXPERIENCE_OPTIONS.map((option) => (
                        <option
                          key={option.value || "placeholder"}
                          value={option.value}
                          disabled={option.value === ""}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {editErrors.investmentExperience && (
                      <p className="text-sm text-red-600 ml-2">{editErrors.investmentExperience}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#004B5B]">Role</label>
                    <select
                      value={editForm.role}
                      onChange={handleEditRoleSelect}
                      disabled={savingEdit || (editUser ? config.lockedRoleTargets.includes(editUser.raw.role) : false)}
                      className="w-full rounded-md border border-[#004B5B]/50 bg-transparent px-4 py-2 text-sm text-[#004B5B] outline-none transition-all focus:border-[#004B5B]"
                    >
                      {editRoleOptions.map((role) => (
                        <option key={role} value={role} disabled={!config.allowedEditRoles.includes(role)}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    {editErrors.role && <p className="text-sm text-red-600">{editErrors.role}</p>}
                    {editUser && config.lockedRoleTargets.includes(editUser.raw.role) && (
                      <p className="text-xs text-gray-500">You can&apos;t change the role of {ROLE_LABELS[editUser.raw.role]} accounts.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-6">
                    <input
                      id="isVerified"
                      type="checkbox"
                      checked={editForm.isVerified}
                      onChange={handleEditCheckboxChange("isVerified")}
                      disabled={savingEdit}
                      className="h-4 w-4 rounded border-gray-300 text-[#004B5B] focus:ring-[#004B5B]"
                    />
                    <label htmlFor="isVerified" className="text-sm text-gray-700">
                      Mark as verified
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <h3 className="text-sm font-semibold text-[#004B5B]">Notification preferences</h3>
                    {editErrors.notificationPreferences && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.notificationPreferences}</p>
                    )}
                    {Object.keys(editForm.notificationPreferences).length > 0 ? (
                      <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {Object.entries(editForm.notificationPreferences).map(([key, value]) => (
                          <label key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => handleNotificationPreferenceChange(key)(e.target.checked)}
                              disabled={savingEdit}
                              className="h-4 w-4 rounded border-gray-300 text-[#004B5B] focus:ring-[#004B5B]"
                            />
                            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">No notification preferences set for this user.</p>
                    )}
                  </div>

                    <div className="lg:col-span-2 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                      <Button variant="outline" className="px-6 py-2.5 w-full sm:w-auto" onClick={closeEditModal} disabled={savingEdit}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="px-6 py-2.5 bg-[#004B5B] hover:bg-[#006B85] text-white w-full sm:w-auto font-medium"
                        disabled={savingEdit}
                      >
                        {savingEdit ? (
                          <span className="flex items-center gap-2 justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          "Save changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}

          {viewUser && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl rounded-2xl bg-white shadow-xl max-h-[95vh] overflow-y-auto"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
                  <div className="flex-1">
                    <h2 className="text-lg md:text-xl font-semibold text-[#004B5B]">User details</h2>
                    <p className="text-sm text-gray-500 mt-1">Review the full profile information</p>
                  </div>
                  <Button variant="outline" className="px-4 py-2 text-sm" onClick={() => setViewUser(null)}>
                    Close
                  </Button>
                </div>

                <div className="p-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
                      <Shield className="h-4 w-4" /> Identity
                    </h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li><span className="font-medium">Name:</span> {viewUser.raw.fullName}</li>
                      <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {viewUser.raw.email}</li>
                      <li className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> {formatDate(viewUser.raw.dateOfBirth)}</li>
                      <li><span className="font-medium">ID Number:</span> {viewUser.raw.idNumber || "—"}</li>
                      <li>
                        <span className="font-medium">Passport Photo:</span>{" "}
                        {viewUser.raw.passportPhoto ? (
                          <a
                            href={viewUser.raw.passportPhoto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#004B5B] underline"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </li>
                      <li>
                        <span className="font-medium">ID Document:</span>{" "}
                        {viewUser.raw.idDocument ? (
                          <a
                            href={viewUser.raw.idDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#004B5B] underline"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </li>
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
                      <li><span className="font-medium">Experience:</span> {viewUser.raw.investmentExperience || "—"}</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
                      <Shield className="h-4 w-4" /> Access & status
                    </h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li><span className="font-medium">Role:</span> {viewUser.role}</li>
                      <li><span className="font-medium">Verified:</span> {viewUser.raw.isVerified ? "Yes" : "No"}</li>
                      <li><span className="font-medium">CSD Number:</span> {viewUser.raw.csdNumber ?? "—"}</li>
                      <li><span className="font-medium">Created:</span> {formatDate(viewUser.raw.createdAt)}</li>
                      <li><span className="font-medium">Updated:</span> {formatDate(viewUser.raw.updatedAt)}</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                    <h3 className="mb-2 text-sm font-semibold text-[#004B5B]">Notification preferences</h3>
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

          {pendingDelete && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-white p-6 shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <h2 className="text-xl font-semibold text-[#004B5B]">Delete user</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Are you sure you want to delete <strong>{pendingDelete.name}</strong>? This action cannot be
                  undone.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="px-4 py-2"
                    onClick={closeDeleteModal}
                    disabled={Boolean(deletingId)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => void confirmDelete()}
                    disabled={Boolean(deletingId)}
                  >
                    {deletingId === pendingDelete.id ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </span>
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isOtpModalOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeOtpModal()}
            >
              <motion.div
                className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-white p-6 shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                onClick={(event) => event.stopPropagation()}
              >
                <h2 className="text-xl font-semibold text-[#004B5B]">Verify new account</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Enter the {OTP_LENGTH}-digit verification code sent to <strong>{otpContext.email}</strong> to
                  activate their access.
                </p>

                <form className="mt-6 space-y-4" onSubmit={handleOtpSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-[#004B5B]" htmlFor="otp-code">
                      Verification code
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      value={otpCode}
                      onChange={(event) => handleOtpCodeChange(event.target.value)}
                      disabled={verifyingOtp}
                      className="mt-2 w-full rounded-xl border border-[#004B5B]/40 px-4 py-3 text-lg tracking-[0.5em] text-center text-[#004B5B] placeholder:text-gray-400 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/30"
                      placeholder={"•".repeat(OTP_LENGTH)}
                    />
                  </div>

                  {otpError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {otpError}
                    </div>
                  )}

                  {otpInfo && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {otpInfo}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => void handleResendOtp()}
                      disabled={resendingOtp || verifyingOtp}
                      className="text-sm font-semibold text-[#004B5B] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resendingOtp ? "Sending a new code..." : "Resend verification code"}
                    </button>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        className="px-4 py-2"
                        onClick={() => closeOtpModal()}
                        disabled={verifyingOtp}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="px-4 py-2 bg-[#004B5B] hover:bg-[#006B85] text-white"
                        disabled={verifyingOtp}
                      >
                        {verifyingOtp ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {showReportModal && (
            <ReportModal
              isOpen={showReportModal}
              onClose={() => {
                setShowReportModal(false);
                setReportFormat('pdf');
              }}
              onGenerate={handleReportGenerate}
              title="Users"
              availableFields={availableReportFields}
              format={reportFormat}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
