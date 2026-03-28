"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import SettingsLayout, { type SettingsLayoutNavItem } from "@/components/ui/SettingsLayout";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import { Activity, ShieldCheck, Network, User, Loader2 } from "lucide-react";
import { FileUploadField } from "@/components/ui/FileUploadField";
import api from "@/lib/axios";

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

const getNavItems = (userRole?: string): SettingsLayoutNavItem[] => {
  const baseItems: SettingsLayoutNavItem[] = [
    {
      id: "profile",
      label: "Profile",
      description: "Update your personal details",
      icon: <User className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  const adminItems: SettingsLayoutNavItem[] = [
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

  return userRole === "admin" || userRole === "super-admin" 
    ? [...baseItems, ...adminItems] 
    : baseItems;
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

export default function UserProfileSettings() {
  const { user } = useAuth();
  console.log('UserProfileSettings component mounted done');
  const navItems = getNavItems(user?.role);
  const [activeSection, setActiveSection] = useState<string>(navItems[0]?.id ?? "profile");
  const [profileForm, setProfileForm] = useState<ProfileForm>({});
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [profileMessage, setProfileMessage] = useState<string>("");

  // Initialize form with user data
  useEffect(() => {
    console.log('UserProfileSettings - user from useAuth:', user);
    if (user?.id) {
      // Fetch complete user data from API
      const fetchUserData = async () => {
        try {
          const { data: fullUserData } = await api.get(`/user/${user.id}`);
          console.log('UserProfileSettings - Full user data from API:', fullUserData);
          
          setProfileForm({
            fullName: fullUserData.fullName || "",
            gender: fullUserData.gender || "male",
            phoneCountryCode: fullUserData.phoneCountryCode || "+250",
            phone: fullUserData.phone || "",
            country: fullUserData.country || "RW",
            city: fullUserData.city || "",
            idNumber: fullUserData.idNumber || "",
            occupation: fullUserData.occupation || "",
            dateOfBirth: fullUserData.dateOfBirth ? fullUserData.dateOfBirth.split('T')[0] : "",
            investmentExperience: fullUserData.investmentExperience || "beginner",
            passportPhoto: fullUserData.passportPhoto || "",
            idDocument: fullUserData.idDocument || "",
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
    } else {
      console.log('UserProfileSettings - No user found from useAuth');
    }
  }, [user]);

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

  const validateForm = (): boolean => {
    const errors: ProfileErrors = {};
    
    if (!profileForm.fullName?.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!profileForm.phone?.trim()) {
      errors.phone = "Phone number is required";
    }
    if (!profileForm.city?.trim()) {
      errors.city = "City is required";
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setProfileStatus("error");
      setProfileMessage("Please fix the errors above");
      return;
    }

    if (!user?.id) {
      setProfileStatus("error");
      setProfileMessage("User not found");
      return;
    }

    setProfileStatus("saving");
    setProfileMessage("");
    
    try {
      const { data: updatedUser } = await api.patch(`/user/${user.id}`, profileForm);
      setProfileStatus("success");
      setProfileMessage("Profile updated successfully!");
    } catch (error: any) {
      setProfileStatus("error");
      setProfileMessage(error.message || "Failed to update profile. Please try again.");
    }
  };

  const renderPlatform = () => (
    <Card className="p-6" hover={false}>
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-[#004B5B]">Platform Controls</h2>
        <p className="mt-1 text-base text-slate-600">
          Manage global platform settings and preferences.
        </p>
      </header>
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-[#004B5B] mb-2">System Maintenance</h3>
          <p className="text-sm text-gray-600">Configure maintenance windows and system updates.</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-[#004B5B] mb-2">Global Settings</h3>
          <p className="text-sm text-gray-600">Manage platform-wide configurations and defaults.</p>
        </div>
      </div>
    </Card>
  );

  const renderSecurity = () => (
    <Card className="p-6" hover={false}>
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-[#004B5B]">Security Settings</h2>
        <p className="mt-1 text-base text-slate-600">
          Configure authentication rules and access controls.
        </p>
      </header>
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-[#004B5B] mb-2">Authentication</h3>
          <p className="text-sm text-gray-600">Manage login requirements and session settings.</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-[#004B5B] mb-2">Access Control</h3>
          <p className="text-sm text-gray-600">Define user roles and permissions.</p>
        </div>
      </div>
    </Card>
  );

  const renderMonitoring = () => (
    <Card className="p-6" hover={false}>
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-[#004B5B]">Monitoring Settings</h2>
        <p className="mt-1 text-base text-slate-600">
          Configure system monitoring and alert preferences.
        </p>
      </header>
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-[#004B5B] mb-2">System Alerts</h3>
          <p className="text-sm text-gray-600">Set up notifications for system events and errors.</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-[#004B5B] mb-2">Performance Tracking</h3>
          <p className="text-sm text-gray-600">Monitor system performance and usage metrics.</p>
        </div>
      </div>
    </Card>
  );

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
              value={profileForm.phoneCountryCode ?? "+250"}
              onChange={handleProfileSelectChange("phoneCountryCode")}
              className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                profileErrors.phoneCountryCode
                  ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
              }`}
            >
              {phoneCountryOptions.map((option: OptionType) => (
                <option key={option.value} value={option.value} className="text-[#004B5B]">
                  {option.label}
                </option>
              ))}
            </select>
            {profileErrors.phoneCountryCode && <p className="text-sm text-red-500 ml-2">{profileErrors.phoneCountryCode}</p>}
          </div>
          <InputField
            name="phone"
            label="Phone number"
            type="tel"
            placeholder="Enter your phone number"
            value={profileForm.phone ?? ""}
            onChange={handleProfileInputChange("phone")}
            error={profileErrors.phone}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="country" className="text-sm font-medium text-[#004B5B]">
              Country
            </label>
            <select
              id="country"
              name="country"
              value={profileForm.country ?? "RW"}
              onChange={handleProfileSelectChange("country")}
              className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
                profileErrors.country
                  ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : "border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80"
              }`}
            >
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
            label="ID Number"
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
            placeholder="Enter your occupation"
            value={profileForm.occupation ?? ""}
            onChange={handleProfileInputChange("occupation")}
            error={profileErrors.occupation}
          />
          <InputField
            name="dateOfBirth"
            label="Date of Birth"
            type="date"
            value={profileForm.dateOfBirth ?? ""}
            onChange={handleProfileInputChange("dateOfBirth")}
            error={profileErrors.dateOfBirth}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="investmentExperience" className="text-sm font-medium text-[#004B5B]">
              Investment Experience
            </label>
            <select
              id="investmentExperience"
              name="investmentExperience"
              value={profileForm.investmentExperience ?? "beginner"}
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
            {profileErrors.investmentExperience && <p className="text-sm text-red-500 ml-2">{profileErrors.investmentExperience}</p>}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FileUploadField
            name="passportPhoto"
            label="Passport Photo"
            accept="image/*"
            value={profileForm.passportPhoto ?? ""}
            onChange={handleProfileFileChange("passportPhoto")}
            error={profileErrors.passportPhoto}
          />
          <FileUploadField
            name="idDocument"
            label="ID Document"
            accept="image/*,application/pdf"
            value={profileForm.idDocument ?? ""}
            onChange={handleProfileFileChange("idDocument")}
            error={profileErrors.idDocument}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={profileStatus === "saving"}
            className="min-w-32"
          >
            {profileStatus === "saving" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
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
    >
      {renderContent()}
    </SettingsLayout>
  );
}