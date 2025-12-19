"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Portal from "@/components/ui/portal";
import { InputField } from "@/components/ui/InputField";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { z } from "zod";
import {
  userCreationSchema,
  baseSignupSchema,
  GENDER_VALUES,
  type UserCreationPayload,
} from "@/lib/validations/signupValidation";
import api, { authApi } from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "COMPANY" | "CLIENT";
type AdminSignupFormData = z.input<typeof baseSignupSchema>;
type NotificationPreferences = Record<string, boolean>;

interface CreateExtras {
  role: ApiUserRole;
  notificationPreferences: NotificationPreferences;
  branchId?: string;
  createdById?: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (email: string, userId: string) => void;
  allowedCreateRoles: ApiUserRole[];
  defaultCreateRole: ApiUserRole;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
}

interface Teller {
  id: string;
  fullName: string;
  email: string;
  branchId?: string;
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

const ROLE_LABELS: Record<ApiUserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  TELLER: "Teller",
  COMPANY: "Company",
  CLIENT: "Client",
};

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

const createInitialExtras = (defaultRole: ApiUserRole): CreateExtras => ({
  role: defaultRole,
  notificationPreferences: {
    email: true,
    sms: false,
    push: true,
  },
  branchId: undefined,
  createdById: undefined,
});

// Role hierarchy for filtering
const getRolesByUserRole = (userRole: string): ApiUserRole[] => {
  switch (userRole) {
    case 'SUPER_ADMIN':
      return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TELLER', 'COMPANY', 'CLIENT'];
    case 'ADMIN':
    case 'MANAGER':
      return ['MANAGER', 'TELLER', 'CLIENT'];
    case 'TELLER':
      return ['CLIENT'];
    default:
      return ['CLIENT'];
  }
};

export default function AddUserModal({ 
  isOpen, 
  onClose, 
  onUserCreated, 
  allowedCreateRoles, 
  defaultCreateRole 
}: AddUserModalProps) {
  const { user } = useAuth();
  const [createForm, setCreateForm] = useState<AdminSignupFormData>(createInitialForm());
  const [createExtras, setCreateExtras] = useState<CreateExtras>(() => createInitialExtras(defaultCreateRole));
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof AdminSignupFormData, string>>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tellers, setTellers] = useState<Teller[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingTellers, setLoadingTellers] = useState(false);

  // Get filtered roles based on current user's role
  const filteredRoles = getRolesByUserRole(user?.role || '').filter(role => 
    allowedCreateRoles.includes(role)
  );

  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const response = await api.get('/branches');
      setBranches(Array.isArray(response) ? response : []);
    } catch (error) {
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchTellers = async (branchId?: string) => {
    if (!branchId) {
      setTellers([]);
      return;
    }
    setLoadingTellers(true);
    try {
      const response = await api.get<{data: Teller[]}>(`/user?role=TELLER&branchId=${branchId}`);
      setTellers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching tellers:', error);
      setTellers([]);
    } finally {
      setLoadingTellers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  useEffect(() => {
    setCreateExtras((prev) => {
      if (filteredRoles.includes(prev.role)) {
        return prev;
      }
      return {
        ...prev,
        role: filteredRoles[0] || defaultCreateRole,
      };
    });
  }, [filteredRoles, defaultCreateRole]);

  // Fetch tellers when branch changes for CLIENT role
  useEffect(() => {
    if (createExtras.role === 'CLIENT' && createExtras.branchId) {
      fetchTellers(createExtras.branchId);
    } else {
      setTellers([]);
    }
  }, [createExtras.role, createExtras.branchId]);

  // Calculate field visibility
  const showBranchField = (createExtras.role === 'CLIENT' || createExtras.role === 'TELLER') && branches.length > 0;
  const showTellerField = createExtras.role === 'CLIENT';

  // Auto-select branch if user only has access to one branch
  useEffect(() => {
    if (branches.length === 1 && !createExtras.branchId && (createExtras.role === 'CLIENT' || createExtras.role === 'TELLER')) {
      setCreateExtras(prev => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches, createExtras.branchId, createExtras.role]);

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
    if (!filteredRoles.includes(value)) {
      return;
    }
    setCreateExtras((prev) => ({ 
      ...prev, 
      role: value,
      branchId: undefined, // Reset branch when role changes
      createdById: undefined // Reset teller when role changes
    }));
  };

  const handleBranchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const branchId = event.target.value || undefined;
    setCreateExtras((prev) => ({ 
      ...prev, 
      branchId,
      createdById: undefined // Reset teller when branch changes
    }));
  };

  const handleTellerChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const createdById = event.target.value || undefined;
    setCreateExtras((prev) => ({ ...prev, createdById }));
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

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      payload.role = filteredRoles.includes(createExtras.role)
        ? createExtras.role
        : (filteredRoles[0] || defaultCreateRole);
    }

    // Add branch and teller associations
    if (createExtras.branchId) {
      payload.branchId = createExtras.branchId;
    }
    if (createExtras.createdById) {
      payload.createdById = createExtras.createdById;
    }

    payload.isVerified = false;

    setCreating(true);

    try {
      const { data: newUser } = await api.post<{ data: any }, { data: any }>('/user', payload);
      
      // Reset form
      setCreateForm(createInitialForm());
      setCreateExtras(createInitialExtras(filteredRoles[0] || defaultCreateRole));
      setCreateErrors({});
      setCreateError(null);
      setBranches([]);
      setTellers([]);
      
      // Close modal and notify parent
      onClose();
      onUserCreated(newUser.email, newUser.id);
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

  const handleClose = () => {
    if (creating) return;
    setCreateForm(createInitialForm());
    setCreateExtras(createInitialExtras(filteredRoles[0] || defaultCreateRole));
    setCreateErrors({});
    setCreateError(null);
    setBranches([]);
    setTellers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex w-full max-w-[85vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
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
              <Button variant="outline" className="px-4 py-2 text-sm" onClick={handleClose} disabled={creating}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {createError && (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                    disabled={creating || filteredRoles.length <= 1}
                    className="w-full rounded-md border border-[#004B5B]/50 bg-transparent px-4 py-2 text-sm text-[#004B5B] outline-none transition-all focus:border-[#004B5B]"
                  >
                    {filteredRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  {filteredRoles.length <= 1 && (
                    <p className="text-xs text-gray-500">{`Role is fixed to ${ROLE_LABELS[filteredRoles[0] || defaultCreateRole]}.`}</p>
                  )}
                </div>

                {showBranchField && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#004B5B]">
                      Branch {createExtras.role === 'TELLER' ? '(Work Location)' : '(Optional)'}
                    </label>
                    <select
                      value={createExtras.branchId || ''}
                      onChange={handleBranchChange}
                      disabled={creating || loadingBranches}
                      className="w-full rounded-md border border-[#004B5B]/50 bg-transparent px-4 py-2 text-sm text-[#004B5B] outline-none transition-all focus:border-[#004B5B]"
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.address}
                        </option>
                      ))}
                    </select>
                    {loadingBranches && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading branches...
                      </p>
                    )}

                  </div>
                )}

                {showTellerField && createExtras.branchId && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#004B5B]">
                      Supporting Teller (Optional)
                    </label>
                    <select
                      value={createExtras.createdById || ''}
                      onChange={handleTellerChange}
                      disabled={creating || loadingTellers}
                      className="w-full rounded-md border border-[#004B5B]/50 bg-transparent px-4 py-2 text-sm text-[#004B5B] outline-none transition-all focus:border-[#004B5B]"
                    >
                      <option value="">Select a teller</option>
                      {tellers.map((teller) => (
                        <option key={teller.id} value={teller.id}>
                          {teller.fullName} - {teller.email}
                        </option>
                      ))}
                    </select>
                    {loadingTellers && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading tellers...
                      </p>
                    )}
                    {tellers.length === 0 && !loadingTellers && createExtras.branchId && (
                      <p className="text-xs text-gray-500">No tellers available in this branch</p>
                    )}
                  </div>
                )}

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
                  <Button variant="outline" className="px-6 py-2.5 w-full sm:w-auto" onClick={handleClose} disabled={creating}>
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
      </AnimatePresence>
    </Portal>
  );
}