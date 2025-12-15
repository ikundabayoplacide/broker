"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Portal from "@/components/ui/portal";
import { InputField } from "@/components/ui/InputField";
import api from "@/lib/axios";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "COMPANY" | "CLIENT";

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

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ApiUser | null;
  onUserUpdated: () => void;
}

const COUNTRY_CODES = [
  { value: "+250", label: "Rwanda (+250)" },
  { value: "+1", label: "United States / Canada (+1)" },
  { value: "+44", label: "United Kingdom (+44)" },
];

export default function EditUserModal({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) {
  const [editForm, setEditForm] = useState<any>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setEditForm({
        fullName: user.fullName || "",
        email: user.email || "",
        phoneCountryCode: user.phoneCountryCode || "+250",
        phone: user.phone || "",
        idNumber: user.idNumber || "",
        dateOfBirth: user.dateOfBirth || "",
        gender: user.gender || "male",
        country: user.country || "",
        city: user.city || "",
        occupation: user.occupation || "",
        role: user.role,
        isVerified: user.isVerified,
      });
      setEditErrors({});
    }
  }, [isOpen, user]);

  const handleEditInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (!editForm) return;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setEditForm({ ...editForm, [name]: checked });
    } else {
      setEditForm({ ...editForm, [name]: value });
    }

    if (editErrors[name]) {
      setEditErrors({ ...editErrors, [name]: "" });
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editForm || !user) return;

    setEditSubmitting(true);
    setEditErrors({});

    try {
      await api.patch(`/user/${user.id}`, editForm);
      onUserUpdated();
      onClose();
    } catch (error) {
      console.error("Edit user error:", error);
      setEditErrors({ submit: "Failed to update user. Please try again." });
    } finally {
      setEditSubmitting(false);
    }
  };

  if (!isOpen || !editForm) return null;

  return (
    <Portal>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col my-auto mx-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
            <h2 className="text-xl font-semibold text-[#004B5B] select-none">Edit User</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 transition-colors duration-200 ease-in-out p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004B5B] focus:ring-opacity-50"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#6B7280'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {editErrors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {editErrors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Full Name"
                name="fullName"
                type="text"
                value={editForm.fullName}
                onChange={handleEditInputChange}
                error={editErrors.fullName}
                required
              />

              <InputField
                label="Email"
                name="email"
                type="email"
                value={editForm.email}
                onChange={handleEditInputChange}
                error={editErrors.email}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Country Code</label>
                <select
                  name="phoneCountryCode"
                  value={editForm.phoneCountryCode}
                  onChange={handleEditInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004B5B] focus:border-[#004B5B] transition-colors duration-200"
                >
                  {COUNTRY_CODES.map((code) => (
                    <option key={code.value} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
              </div>

              <InputField
                label="Phone"
                name="phone"
                type="text"
                value={editForm.phone}
                onChange={handleEditInputChange}
                error={editErrors.phone}
              />

              <InputField
                label="Country"
                name="country"
                type="text"
                value={editForm.country}
                onChange={handleEditInputChange}
                error={editErrors.country}
                required
              />

              <InputField
                label="City"
                name="city"
                type="text"
                value={editForm.city}
                onChange={handleEditInputChange}
                error={editErrors.city}
                required
              />

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isVerified"
                  checked={editForm.isVerified}
                  onChange={handleEditInputChange}
                  className="h-4 w-4 text-[#004B5B] focus:ring-[#004B5B] border-gray-300 rounded transition-colors duration-200"
                />
                <label className="text-sm font-medium text-gray-700 select-none">Verified User</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 bg-white sticky bottom-0 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSubmitting}
                className="bg-[#004B5B] text-white"
              >
                {editSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update User"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </Portal>
  );
}