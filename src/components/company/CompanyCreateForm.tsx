"use client";

import { useState, useMemo, type ChangeEvent, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import Card from "@/components/ui/Card";
import RichTextEditor from "@/components/ui/RichTextEditor";
import toast from "react-hot-toast";
import { getData } from "country-list";
import { CountryCode, getCountryCallingCode } from "libphonenumber-js";

export interface CompanySummary {
  id: string;
  name: string;
  status:string;
  description: string | null;
  sector: string | null;
  sharePrice: string | null;
  totalShares: number | null;
  availableShares: number | null;

  contract: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CompanyCreateFormProps {
  authToken: string | null;
  onCancel?: () => void;
  onCreated?: (company: CompanySummary) => void;
  withCard?: boolean;
}

interface FormState {
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  password: string;
  country: string;
  city: string;
  symbol: string;
  description: string;
  sector: string;
  sectorOther: string;
  sharePrice: string;
  totalShares: string;
  availableShares: string;

  contract: string;
}

const sanitizeIntegerInput = (value: string) =>
  value
    .replace(/[\s,]/g, "")
    .replace(/[^0-9]/g, "")
    .trim();

const toIntegerOrUndefined = (value: string) => {
  const normalized = sanitizeIntegerInput(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const INITIAL_STATE: FormState = {
  name: "",
  email: "",
  phoneCountryCode: "+250",
  phone: "",
  password: "",
  country: "Rwanda",
  city: "",
  symbol: "",
  description: "",
  sector: "",
  sectorOther: "",
  sharePrice: "",
  totalShares: "",
  availableShares: "",

  contract: "",
};

export function CompanyCreateForm({ authToken, onCreated, onCancel, withCard = true }: CompanyCreateFormProps) {
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);

  const countryOptions = useMemo(() => {
    return getData()
      .map(({ name, code }) => {
        try {
          const dialCode = getCountryCallingCode(code as CountryCode);
          return {
            name,
            code,
            dialCode: `+${dialCode}`,
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is { name: string; code: string; dialCode: string } => Boolean(item))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleInputChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSelectChange = (field: keyof FormState) => (event: ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleContractChange = (value: string) => {
    setFormState((prev) => ({ ...prev, contract: value }));
  };

  const normalizeRichText = (value: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const textContent = trimmed.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim();
    if (!textContent) return undefined;

    return trimmed;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authToken) {
      toast.error("Missing authentication token. Please sign in again.");
      return;
    }

    if (!formState.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setSubmitting(true);

    const toIsoDate = (value: string) => {
      if (!value) return undefined;
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.valueOf())) return undefined;
      return date.toISOString();
    };

    const payload = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      phoneCountryCode: formState.phoneCountryCode.trim(),
      phone: formState.phone.trim(),
      password: formState.password,
      country: formState.country.trim(),
      city: formState.city.trim(),
      symbol: formState.symbol.trim() || undefined,
      description: formState.description.trim() || undefined,
      sector: formState.sector === "Other" && formState.sectorOther.trim() 
        ? formState.sectorOther.trim() 
        : formState.sector.trim() || undefined,
      sharePrice: formState.sharePrice.trim() || undefined,
      totalShares: toIntegerOrUndefined(formState.totalShares),
      availableShares: toIntegerOrUndefined(formState.availableShares),

      contract: normalizeRichText(formState.contract),
    };

    try {
      const response = await fetch("/api/company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const detailedError = Array.isArray(result?.errors)
          ? (result.errors as Array<{ path?: string; message?: string }>)
              .map((issue) => {
                const path = issue.path ? `${issue.path}: ` : "";
                return `${path}${issue.message ?? "Invalid value"}`;
              })
              .join("\n")
          : null;
        throw new Error(detailedError || result?.error || "Failed to create company");
      }

      toast.success("Company created successfully");
      setFormState(INITIAL_STATE);
      onCreated?.(result.data as CompanySummary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create company";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#004B5B]">Add a new company</h2>
          <p className="text-sm text-gray-500">Publish issuers to the shared directory.</p>
        </div>
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>
            Close
          </Button>
        )}
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Company Name"
            name="name"
            value={formState.name}
            onChange={handleInputChange("name")}
            required
            type="text"
          />
          <InputField
            label="Stock Symbol"
            name="symbol"
            value={formState.symbol}
            onChange={handleInputChange("symbol")}
            placeholder="e.g. MTN"
            type="text"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Email"
            name="email"
            value={formState.email}
            onChange={handleInputChange("email")}
            required
            type="email"
            placeholder="company@example.com"
          />
          <InputField
            label="Password"
            name="password"
            value={formState.password}
            onChange={handleInputChange("password")}
            required
            type="password"
            placeholder="Min 8 chars with uppercase, lowercase, number"
            showVisibilityToggle={true}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="grid md:grid-cols-3 gap-4">
            <select
              name="phoneCountryCode"
              value={formState.phoneCountryCode}
              onChange={handleSelectChange("phoneCountryCode")}
              disabled={submitting}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#004B5B] disabled:opacity-50"
            >
              {countryOptions.map(({ name, dialCode, code }) => (
                <option key={code} value={dialCode}>
                  {name} ({dialCode})
                </option>
              ))}
            </select>
            <div className="md:col-span-2">
              <input
                type="tel"
                name="phone"
                value={formState.phone}
                onChange={handleInputChange("phone")}
                disabled={submitting}
                required
                placeholder="788123456"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#004B5B] disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              name="country"
              value={formState.country}
              onChange={handleSelectChange("country")}
              disabled={submitting}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#004B5B] disabled:opacity-50"
            >
              {countryOptions.map(({ name, code }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <InputField
            label="City"
            name="city"
            value={formState.city}
            onChange={handleInputChange("city")}
            required
            type="text"
            placeholder="Kigali"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">Sector</label>
            <select
              name="sector"
              value={formState.sector}
              onChange={handleSelectChange("sector")}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#004B5B] disabled:opacity-50"
            >
              <option value="">Select sector</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Energy">Energy</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Telecommunications">Telecommunications</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Consumer Goods">Consumer Goods</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {formState.sector === "Other" && (
            <InputField
              label="Specify Sector"
              name="sectorOther"
              value={formState.sectorOther}
              onChange={handleInputChange("sectorOther")}
              placeholder="Enter sector name"
              type="text"
            />
          )}
          {formState.sector !== "Other" ? (
            <InputField
              label="Share Price"
              name="sharePrice"
              value={formState.sharePrice}
              onChange={handleInputChange("sharePrice")}
              placeholder="e.g. 125.50"
              type="number"
            />
          ) : null}
        </div>

        {formState.sector === "Other" && (
          <div className="grid md:grid-cols-2 gap-4">
            <InputField
              label="Share Price"
              name="sharePrice"
              value={formState.sharePrice}
              onChange={handleInputChange("sharePrice")}
              placeholder="e.g. 125.50"
              type="number"
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Total Shares"
            name="totalShares"
            value={formState.totalShares}
            onChange={handleInputChange("totalShares")}
            placeholder="e.g. 1000000"
            type="number"
          />
          <InputField
            label="Available Shares"
            name="availableShares"
            value={formState.availableShares}
            onChange={handleInputChange("availableShares")}
            placeholder="e.g. 250000"
            type="number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2" htmlFor="company-description">
            Description
          </label>
          <textarea
            id="company-description"
            name="description"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#004B5B]"
            rows={4}
            value={formState.description}
            onChange={handleChange("description")}
            placeholder="Optional overview or disclosure."
          />
        </div>

        <RichTextEditor
          label="Contract"
          value={formState.contract}
          onChange={handleContractChange}
          placeholder="Provide contract details, clauses, or include links."
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => setFormState(INITIAL_STATE)} disabled={submitting}>
            Reset
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create company"}
          </Button>
        </div>
      </form>
    </>
  );

  if (withCard) {
    return <Card className="p-6">{formContent}</Card>;
  }

  return <div>{formContent}</div>;
}
