"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertTriangle } from "lucide-react";
import Portal from "@/components/ui/portal";
import Button from "@/components/ui/Button";
import api from "@/lib/axios";

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ApiUser | null;
  onUserDeleted: () => void;
}

export default function DeleteUserModal({ isOpen, onClose, user, onUserDeleted }: DeleteUserModalProps) {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteSubmit = async () => {
    if (!user || deleteConfirm !== user.fullName) return;

    setDeleteSubmitting(true);
    setDeleteError("");

    try {
      await api.delete(`/user/${user.id}`);
      onUserDeleted();
      onClose();
      setDeleteConfirm("");
    } catch (error) {
      console.error("Delete user error:", error);
      setDeleteError("Failed to delete user. Please try again.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleClose = () => {
    setDeleteConfirm("");
    setDeleteError("");
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
        className="fixed inset-0 z-[9999] bg-black/60  z-50 flex items-center justify-center p-4"
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
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Delete User</h2>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-3">
                You are about to permanently delete the user account for{" "}
                <span className="font-semibold text-gray-900">{user.fullName}</span> ({user.email}).
              </p>
              <p className="mb-4 text-red-600 font-medium">
                This action cannot be undone. All user data will be permanently removed.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type the user's full name to confirm deletion:
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={user.fullName}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={deleteSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSubmit}
                disabled={deleteSubmitting || deleteConfirm !== user.fullName}
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete User"
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