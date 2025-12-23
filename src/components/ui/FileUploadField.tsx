"use client";

import { useState, type ChangeEvent, type FC } from "react";
import { UploadCloud, Loader2, Trash2, CheckCircle, Link } from "lucide-react";

interface FileUploadFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  accept?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  helperText?: string;
}

const toError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unable to upload file";
};

export const FileUploadField: FC<FileUploadFieldProps> = ({
  name,
  label,
  value,
  onChange,
  accept = "image/*",
  disabled = false,
  error,
  required,
  helperText,
}) => {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", name);

    const response = await fetch("/api/uploads/cloudinary", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to upload file");
    }

    if (!payload?.url || typeof payload.url !== "string") {
      throw new Error("Upload succeeded but no URL was returned");
    }

    return payload.url as string;
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];

    try {
      setUploading(true);
      setLocalError(null);
      const uploadedUrl = await uploadFile(file);
      onChange(uploadedUrl);
    } catch (err) {
      const message = toError(err);
      setLocalError(message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const showError = localError ?? error;
  const hasFile = Boolean(value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#004B5B]" htmlFor={`${name}-upload`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        className={`rounded-2xl border p-4 transition-all ${
          showError
            ? "border-red-500"
            : hasFile
              ? "border-green-400"
              : "border-dashed border-[#004B5B]/50 hover:border-[#004B5B]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#004B5B]/10 text-[#004B5B] flex-shrink-0">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-sm font-medium text-[#004B5B]">
                {uploading ? "Uploading..." : hasFile ? "File uploaded" : "Upload a file"}
              </p>
              <p className="text-xs text-gray-500 break-words">
                {helperText ?? "Accepted formats: images up to 10MB"}
              </p>
              {hasFile && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#004B5B] underline break-all"
                >
                  <Link className="h-3 w-3 flex-shrink-0" /> View uploaded file
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {hasFile && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={disabled}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-red-500 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
            <label
              htmlFor={`${name}-upload`}
              className={`w-full inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                uploading
                  ? "bg-gray-200 text-gray-600"
                  : "bg-[#004B5B] text-white hover:bg-[#006B85]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input
                id={`${name}-upload`}
                name={name}
                type="file"
                accept={accept}
                disabled={disabled || uploading}
                onChange={handleChange}
                className="hidden"
              />
              {hasFile && !uploading ? <CheckCircle className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? "Uploading" : hasFile ? "Replace" : "Choose file"}
            </label>
          </div>
        </div>
      </div>

      {showError && <p className="mt-1 text-sm text-red-500 ml-2">{showError}</p>}
    </div>
  );
};
