"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, UserCheck } from "lucide-react";
import Portal from "@/components/ui/portal";
import Button from "@/components/ui/Button";
import api from "@/lib/axios";

type ApiUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TELLER" | "COMPANY" | "CLIENT";

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  role: ApiUserRole;
}

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ApiUser | null;
  newRole: ApiUserRole;
  onRoleChanged: () => void;
}

const ROLE_LABELS: Record<ApiUserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  TELLER: "Teller",
  COMPANY: "Company",
  CLIENT: "Client",
};

export default function ChangeRoleModal({ isOpen, onClose, user, newRole, onRoleChanged }: ChangeRoleModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!user || confirmText !== "CONFIRM") return;

    setSubmitting(true);
    setError("");

    try {
      await api.patch(`/user/${user.id}`, { role: newRole });
      onRoleChanged();
      onClose();
      setConfirmText("");
    } catch (error) {
      console.error("Change role error:", error);
      setError("Failed to change user role. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <UserCheck className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Change Role</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-3">
                  You are about to change the role for{" "}
                  <span className="font-semibold text-gray-900">{user.fullName}</span> ({user.email}).
                </p>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm">
                    <span className="text-red-600 font-medium">Current role:</span> {ROLE_LABELS[user.role]}
                  </p>
                  <p className="text-sm">
                    <span className="text-green-600 font-medium">New role:</span> {ROLE_LABELS[newRole]}
                  </p>
                </div>
                <p className="text-amber-600 font-medium">
                  This will immediately change the user's access permissions.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "CONFIRM" to proceed:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || confirmText !== "CONFIRM"}
                  className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Changing...
                    </>
                  ) : (
                    "Change Role"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}