"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Building2, Shield, CheckCircle, XCircle, Activity } from "lucide-react";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";

interface EditModalProps {
  editUser: any;
  editForm: any;
  editError: string | null;
  editErrors: any;
  savingEdit: boolean;
  closeEditModal: () => void;
  confirmEdit: () => void;
  handleEditTextChange: (field: string) => (event: any) => void;
  updateEditField: (field: string, value: any) => void;
  COUNTRY_CODES: Array<{ value: string; label: string }>;
}

interface DeleteModalProps {
  pendingDelete: any;
  deletingId: string | null;
  closeDeleteModal: () => void;
  confirmDelete: () => void;
}

interface CompanyModalProps {
  selectedCompany: any;
  closeCompanyModal: () => void;
}

export function EditUserModal({
  editUser,
  editForm,
  editError,
  editErrors,
  savingEdit,
  closeEditModal,
  confirmEdit,
  handleEditTextChange,
  updateEditField,
  COUNTRY_CODES,
}: EditModalProps) {
  if (!editUser || !editForm) return null;

  return (
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
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {editError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <form
            className="grid gap-4 lg:grid-cols-2 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              confirmEdit();
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
              name="country"
              label="Country"
              type="text"
              value={editForm.country ?? ""}
              onChange={handleEditTextChange("country")}
              placeholder="Enter country"
              disabled={savingEdit}
              error={editErrors.country}
            />

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
  );
}

export function DeleteUserModal({ pendingDelete, deletingId, closeDeleteModal, confirmDelete }: DeleteModalProps) {
  if (!pendingDelete) return null;

  return (
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
          Are you sure you want to delete <strong>{pendingDelete.name}</strong>? This action cannot be undone.
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
            onClick={confirmDelete}
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
  );
}

export function CompanyDetailsModal({ selectedCompany, closeCompanyModal }: CompanyModalProps) {
  if (!selectedCompany) return null;

  return (
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
            <h2 className="text-lg md:text-xl font-semibold text-[#004B5B]">Company Details</h2>
            <p className="text-sm text-gray-500 mt-1">View company assignment information</p>
          </div>
          <Button variant="outline" className="px-4 py-2 text-sm" onClick={closeCompanyModal}>
            Close
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
                <Building2 className="h-4 w-4" /> Company Information
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Company Name:</span>
                  <p className="text-gray-900">{selectedCompany.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">User Role:</span>
                  <p className="text-gray-900">{selectedCompany.role}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Join Date:</span>
                  <p className="text-gray-900">{selectedCompany.joinDate}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Status:</span>
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
                <Shield className="h-4 w-4" /> Permissions
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>View Company Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Manage Clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Generate Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Admin Settings</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#004B5B]">
              <Activity className="h-4 w-4" /> Recent Activity
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span>Last Login</span>
                <span className="text-gray-600">2024-01-15 14:30</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span>Last Action</span>
                <span className="text-gray-600">Updated client profile</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Total Sessions</span>
                <span className="text-gray-600">47 this month</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" className="px-4 py-2 w-full sm:w-auto">
              Remove Access
            </Button>
            <Button className="px-4 py-2 bg-[#004B5B] hover:bg-[#006B85] text-white w-full sm:w-auto">
              Edit Permissions
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function UserModals({
  editUser,
  editForm,
  editError,
  editErrors,
  savingEdit,
  closeEditModal,
  confirmEdit,
  handleEditTextChange,
  updateEditField,
  COUNTRY_CODES,
  pendingDelete,
  deletingId,
  closeDeleteModal,
  confirmDelete,
  selectedCompany,
  closeCompanyModal,
}: EditModalProps & DeleteModalProps & CompanyModalProps) {
  return (
    <AnimatePresence>
      {editUser && editForm && (
        <EditUserModal
          editUser={editUser}
          editForm={editForm}
          editError={editError}
          editErrors={editErrors}
          savingEdit={savingEdit}
          closeEditModal={closeEditModal}
          confirmEdit={confirmEdit}
          handleEditTextChange={handleEditTextChange}
          updateEditField={updateEditField}
          COUNTRY_CODES={COUNTRY_CODES}
        />
      )}

      {pendingDelete && (
        <DeleteUserModal
          pendingDelete={pendingDelete}
          deletingId={deletingId}
          closeDeleteModal={closeDeleteModal}
          confirmDelete={confirmDelete}
        />
      )}

      {selectedCompany && (
        <CompanyDetailsModal
          selectedCompany={selectedCompany}
          closeCompanyModal={closeCompanyModal}
        />
      )}
    </AnimatePresence>
  );
}