"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import SettingsLayout, { type SettingsLayoutNavItem } from "@/components/ui/SettingsLayout";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import { Activity, ShieldCheck, Network, User, Loader2 } from "lucide-react";
import { FileUploadField } from "@/components/ui/FileUploadField";
// Local constants for form options
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const phoneCountryOptions = [
  { value: "+250", label: "+250 (Rwanda)" },
  { value: "+1", label: "+1 (US/Canada)" },
  { value: "+44", label: "+44 (UK)" },
];

const countryOptions = [
  { value: "RW", label: "Rwanda" },
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
];

const INVESTMENT_EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner (0-1 years)" },
  { value: "intermediate", label: "Intermediate (2-5 years)" },
  { value: "advanced", label: "Advanced (5+ years)" },
];

type OptionType = {
  value: string;
  label: string;
};

const navItems: SettingsLayoutNavItem[] = [
    {
      id: "profile",
      label: "Profile",
      description: "Update your personal details",
      icon: <User className="h-4 w-4" aria-hidden="true" />,
    },
  {
    id: "platform",
    label: "Platform controls",
    description: "Tune global preferences for all workspaces",
    icon: <Network className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: "security",
    label: "Security",
    description: "Set authentication and access rules",
    icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Choose what we track and how alerts trigger",
    icon: <Activity className="h-4 w-4" aria-hidden="true" />,
  },
];

type PlatformForm = {
  primaryContact: string;
  supportEmail: string;
  maintenanceWindow: string;
};

type SecurityForm = {
  enforceMfa: boolean;
  sessionTimeout: number;
  allowApiAccess: boolean;
};

type MonitoringForm = {
  rpo: string;
  rto: string;
  notifyChannels: Record<string, boolean>;
};

type ProfileForm = {
  fullName?: string;
  gender?: string;
  phoneCountryCode?: string;
  phone?: string;
  country?: string;
  city?: string;
  idNumber?: string;
  occupation?: string;
  dateOfBirth?: string;
  investmentExperience?: string;
  passportPhoto?: string;
  idDocument?: string;
};

type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;
type ProfileStatus = "idle" | "saving" | "success" | "error";

export default function SuperAdminSettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<string>(navItems[0]?.id ?? "platform");
  const [profileForm, setProfileForm] = useState<ProfileForm>({});
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [profileMessage, setProfileMessage] = useState<string>("");
  const [platformForm, setPlatformForm] = useState<PlatformForm>({
    primaryContact: "",
    supportEmail: "",
    maintenanceWindow: "Sunday 02:00 - 04:00 CAT",
  });
  const [securityForm, setSecurityForm] = useState<SecurityForm>({
    enforceMfa: true,
    sessionTimeout: 30,
    allowApiAccess: true,
  });
  const [monitoringForm, setMonitoringForm] = useState<MonitoringForm>({
    rpo: "15 minutes",
    rto: "1 hour",
    notifyChannels: {
      Email: true,
      SMS: false,
      PagerDuty: true,
      Slack: true,
    },
  });

  const handlePlatformChange = (field: keyof PlatformForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setPlatformForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecurityToggle = (field: keyof SecurityForm) => () => {
    if (field === "sessionTimeout") return;
    setSecurityForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSessionTimeoutChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(value)) {
      setSecurityForm((prev) => ({ ...prev, sessionTimeout: 30 }));
      return;
    }
    setSecurityForm((prev) => ({ ...prev, sessionTimeout: Math.max(5, value) }));
  };

  const toggleChannel = (channel: string) => {
    setMonitoringForm((prev) => ({
      ...prev,
      notifyChannels: {
        ...prev.notifyChannels,
        [channel]: !prev.notifyChannels[channel],
      },
    }));
  };

  const handleProfileInputChange = (field: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProfileSelectChange = (field: keyof ProfileForm) => (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProfileFileChange = (field: keyof ProfileForm) => (value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileStatus("saving");
    // Simulate API call
    setTimeout(() => {
      setProfileStatus("success");
      setProfileMessage("Profile updated successfully!");
    }, 1000);
  };


  const renderProfile = () => (
    <Card className="p-6" hover={false}>
      <form className="flex flex-col gap-6" onSubmit={handleProfileSubmit}>
        <header>
          <h2 className="text-xl font-semibold text-[#004B5B]">Personal details</h2>
          <p className="mt-1 text-base text-slate-600">
            Keep your contact information up to date and add any supporting documents required by our compliance team.
          </p>
        </header>

        {profileMessage && (
          <div
            className={`rounded-md border px-4 py-3 text-base ${
              profileStatus === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {profileMessage}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <InputField
            name="fullName"
            label="Full name"
            type="text"
            placeholder="Enter your full name"
            value={profileForm.fullName ?? ""}
            onChange={handleProfileInputChange("fullName")}
            error={profileErrors.fullName}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="gender" className="text-sm font-medium text-[#004B5B]">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={profileForm.gender ?? "male"}
              onChange={handleProfileSelectChange("gender")}
              className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                profileErrors.gender
                  ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
              }`}
            >
              {GENDER_OPTIONS.map((option: OptionType) => (
                <option key={option.value} value={option.value} className="text-[#004B5B]">
                  {option.label}
                </option>
              ))}
            </select>
            {profileErrors.gender && <p className="text-sm text-red-500 ml-2">{profileErrors.gender}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="phoneCountryCode" className="text-sm font-medium text-[#004B5B]">
              Phone country code
            </label>
            <select
              id="phoneCountryCode"
              name="phoneCountryCode"
              value={profileForm.phoneCountryCode ?? ""}
              onChange={handleProfileSelectChange("phoneCountryCode")}
              className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                profileErrors.phoneCountryCode
                  ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
              }`}
            >
              <option value="" disabled className="text-slate-400">
                Select code
              </option>
              {phoneCountryOptions.map((option: OptionType) => (
                <option key={option.value} value={option.value} className="text-[#004B5B]">
                  {option.label}
                </option>
              ))}
            </select>
            {profileErrors.phoneCountryCode && (
              <p className="text-sm text-red-500 ml-2">{profileErrors.phoneCountryCode}</p>
            )}
          </div>
          <InputField
            name="phone"
            label="Phone number"
            type="tel"
            placeholder="Add phone"
            value={profileForm.phone ?? ""}
            onChange={handleProfileInputChange("phone")}
            error={profileErrors.phone}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="country" className="text-sm font-medium text-[#004B5B]">
              Country of residence
            </label>
            <select
              id="country"
              name="country"
              value={profileForm.country ?? ""}
              onChange={handleProfileSelectChange("country")}
              className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                profileErrors.country
                  ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
              }`}
            >
              <option value="" disabled className="text-slate-400">
                Select country
              </option>
              {countryOptions.map((option: OptionType) => (
                <option key={option.value} value={option.value} className="text-[#004B5B]">
                  {option.label}
                </option>
              ))}
            </select>
            {profileErrors.country && <p className="text-sm text-red-500 ml-2">{profileErrors.country}</p>}
          </div>
          <InputField
            name="city"
            label="City"
            type="text"
            placeholder="Enter your city"
            value={profileForm.city ?? ""}
            onChange={handleProfileInputChange("city")}
            error={profileErrors.city}
          />
          <InputField
            name="idNumber"
            label="National ID number"
            type="text"
            placeholder="Enter your ID number"
            value={profileForm.idNumber ?? ""}
            onChange={handleProfileInputChange("idNumber")}
            error={profileErrors.idNumber}
          />
          <InputField
            name="occupation"
            label="Occupation"
            type="text"
            placeholder="What do you do?"
            value={profileForm.occupation ?? ""}
            onChange={handleProfileInputChange("occupation")}
            error={profileErrors.occupation}
          />
          <InputField
            name="dateOfBirth"
            label="Date of birth"
            type="date"
            value={profileForm.dateOfBirth ?? ""}
            onChange={handleProfileInputChange("dateOfBirth")}
            error={profileErrors.dateOfBirth}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="investmentExperience" className="text-sm font-medium text-[#004B5B]">
              Investment experience
            </label>
            <select
              id="investmentExperience"
              name="investmentExperience"
              value={profileForm.investmentExperience ?? ""}
              onChange={handleProfileSelectChange("investmentExperience")}
              className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                profileErrors.investmentExperience
                  ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
              }`}
            >
              {INVESTMENT_EXPERIENCE_OPTIONS.map((option: OptionType) => (
                <option key={option.value} value={option.value} className="text-[#004B5B]">
                  {option.label}
                </option>
              ))}
            </select>
            {profileErrors.investmentExperience && (
              <p className="text-sm text-red-500 ml-2">{profileErrors.investmentExperience}</p>
            )}
          </div>
        </div>

        <div className="md:grid-cols-2">
          <FileUploadField
            name="passportPhoto"
            label="Passport photo"
            value={profileForm.passportPhoto ?? ""}
            onChange={handleProfileFileChange("passportPhoto")}
            error={profileErrors.passportPhoto}
            accept="image/*"
            helperText="Upload a clear passport-style photo (JPEG, PNG, WEBP)"
          />
          <FileUploadField
            name="idDocument"
            label="Identification document"
            value={profileForm.idDocument ?? ""}
            onChange={handleProfileFileChange("idDocument")}
            error={profileErrors.idDocument}
            accept="image/*,application/pdf"
            helperText="Provide a copy of your ID document (image or PDF)"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            disabled={profileStatus === "saving"}
            className="min-w-40 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
          >
            {profileStatus === "saving" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Update profile"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );

  
  const renderPlatform = () => (
    <Card className="p-6" hover={false}>
      <h2 className="text-xl font-semibold text-[#004B5B]">Platform wide defaults</h2>
      <p className="mt-1 text-base text-slate-600">Set the baseline configuration all entities inherit unless overridden.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InputField
          name="primaryContact"
          label="Primary contact"
          type="text"
          placeholder="Name"
          value={platformForm.primaryContact}
          onChange={handlePlatformChange("primaryContact")}
        />
        <InputField
          name="supportEmail"
          label="Support email"
          type="email"
          placeholder="support@example.com"
          value={platformForm.supportEmail}
          onChange={handlePlatformChange("supportEmail")}
        />
        <InputField
          name="maintenanceWindow"
          label="Maintenance window"
          type="text"
          placeholder="Schedule"
          value={platformForm.maintenanceWindow}
          onChange={handlePlatformChange("maintenanceWindow")}
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline">Preview communication</Button>
        <Button>Publish defaults</Button>
      </div>
    </Card>
  );
  const renderSecurity = () => (
    <Card className="p-6" hover={false}>
      <h2 className="text-xl font-semibold text-[#004B5B]">Security posture</h2>
      <p className="mt-1 text-base text-slate-600">Apply consistent controls across all dashboards and service accounts.</p>
      <div className="mt-6 space-y-4 text-base text-slate-600">
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
          <span>Enforce multi-factor authentication</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={securityForm.enforceMfa}
            onChange={handleSecurityToggle("enforceMfa")}
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
          <span>Allow API access</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={securityForm.allowApiAccess}
            onChange={handleSecurityToggle("allowApiAccess")}
          />
        </label>
        <div className="rounded-2xl border border-slate-200 px-4 py-3">
          <span className="block text-base font-medium text-slate-700">Session timeout (minutes)</span>
          <input
            type="number"
            min={5}
            className="mt-2 w-32 rounded-full border border-slate-200 px-4 py-2 text-base text-slate-700 focus:border-[#004B5B] focus:outline-none"
            value={securityForm.sessionTimeout}
            onChange={handleSessionTimeoutChange}
          />
        </div>
      </div>
    </Card>
  );

  const renderMonitoring = () => (
    <Card className="p-6" hover={false}>
      <h2 className="text-xl font-semibold text-[#004B5B]">Monitoring & alerts</h2>
      <p className="mt-1 text-base text-slate-600">Track uptime and data objectives while keeping execs informed.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InputField
          name="rpo"
          label="Recovery point objective"
          type="text"
          placeholder="e.g. 15 minutes"
          value={monitoringForm.rpo}
          onChange={(event) =>
            setMonitoringForm((prev) => ({ ...prev, rpo: event.target.value }))
          }
        />
        <InputField
          name="rto"
          label="Recovery time objective"
          type="text"
          placeholder="e.g. 1 hour"
          value={monitoringForm.rto}
          onChange={(event) =>
            setMonitoringForm((prev) => ({ ...prev, rto: event.target.value }))
          }
        />
      </div>
      <div className="mt-6 space-y-3 text-base text-slate-600">
        {Object.keys(monitoringForm.notifyChannels).map((channel) => (
          <label key={channel} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <span>{channel}</span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={monitoringForm.notifyChannels[channel]}
              onChange={() => toggleChannel(channel)}
            />
          </label>
        ))}
      </div>
    </Card>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return renderProfile();
      case "platform":
        return renderPlatform();
      case "security":
        return renderSecurity();
      case "monitoring":
        return renderMonitoring();
      default:
        return renderProfile();
    }
  };

  return (
    <SettingsLayout
      title="Settings"
      description="Configure your profile and account settings."
      navItems={navItems}
      activeItem={activeSection}
      onItemSelect={setActiveSection}
      actions={<Button size="sm">Save changes</Button>}
    >
      {renderContent()}
    </SettingsLayout>
  );
}
