'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Building, MapPin, Phone, Mail, Users, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";

interface BranchFormData {
  name: string;
  location: string;
  phone: string;
  email: string;
  startTime: string;
  endTime: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  managerCountryCode: string;
  country: string;
  services: string[];
}

interface BranchCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BranchFormData) => void;
  managers: Array<{ id: string; name: string; email: string }>;
}

const availableServices = [
  "Trading",
  "Account Opening", 
  "Customer Support",
  "Investment Advisory",
  "Portfolio Management",
  "Market Research"
];

export default function BranchCreateModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  managers = []
}: BranchCreateModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BranchFormData>({
    name: "",
    location: "",
    phone: "",
    email: "",
    startTime: "08:00",
    endTime: "18:00",
    managerName: "",
    managerEmail: "",
    managerPhone: "",
    managerCountryCode: "+250",
    country: "Rwanda",
    services: ["Trading", "Customer Support"]
  });

  const [errors, setErrors] = useState<Partial<BranchFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof BranchFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<BranchFormData> = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = "Branch name is required";
      if (!formData.location.trim()) newErrors.location = "Location is required";
      if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
    }

    if (step === 2) {
      if (!formData.managerName.trim()) newErrors.managerName = "Manager name is required";
      if (!formData.managerEmail.trim()) newErrors.managerEmail = "Manager email is required";
      if (!formData.managerPhone.trim()) newErrors.managerPhone = "Manager phone is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(1)) {
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(2)) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        name: "",
        location: "",
        phone: "",
        email: "",
        startTime: "08:00",
        endTime: "18:00",
        managerName: "",
        managerEmail: "",
        managerPhone: "",
        managerCountryCode: "+250",
        country: "Rwanda",
        services: ["Trading", "Customer Support"]
      });
      setCurrentStep(1);
      onClose();
    } catch (error) {
      console.error("Error creating branch:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#004B5B] rounded-full flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#004B5B]">Create New Branch</h2>
                <p className="text-sm text-gray-500">Add a new branch location to the network</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 1 ? 'bg-[#004B5B] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${
                currentStep >= 2 ? 'bg-[#004B5B]' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 2 ? 'bg-[#004B5B] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-[#004B5B]">Branch Information</h3>
                  <p className="text-sm text-gray-500">Basic details and location information</p>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    name="name"
                    label="Branch Name"
                    type="text"
                    placeholder="e.g., Kigali Main Branch"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    error={errors.name}
                    required
                  />
                  <InputField
                    name="location"
                    label="Location"
                    type="text"
                    placeholder="e.g., Kigali, Rwanda"
                    value={formData.location}
                    onChange={handleInputChange("location")}
                    error={errors.location}
                    required
                  />
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    name="phone"
                    label="Phone Number"
                    type="tel"
                    placeholder="+250 788 123 456"
                    value={formData.phone}
                    onChange={handleInputChange("phone")}
                    error={errors.phone}
                    required
                  />
                  <InputField
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="branch@broker.rw"
                    value={formData.email}
                    onChange={handleInputChange("email")}
                    error={errors.email}
                    required
                  />
                </div>

                {/* Opening Hours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#004B5B]">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={handleInputChange("startTime")}
                      className="w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border border-[#004B5B]/50 focus:border-[#004B5B]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#004B5B]">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={handleInputChange("endTime")}
                      className="w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border border-[#004B5B]/50 focus:border-[#004B5B]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-[#004B5B]">Management & Services</h3>
                  <p className="text-sm text-gray-500">Assign manager and configure services</p>
                </div>

                {/* Manager Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    name="managerName"
                    label="Manager Name"
                    type="text"
                    placeholder="e.g., John Doe"
                    value={formData.managerName}
                    onChange={handleInputChange("managerName")}
                    error={errors.managerName}
                    required
                  />
                  <InputField
                    name="managerEmail"
                    label="Manager Email"
                    type="email"
                    placeholder="manager@broker.com"
                    value={formData.managerEmail}
                    onChange={handleInputChange("managerEmail")}
                    error={errors.managerEmail}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    name="managerPhone"
                    label="Manager Phone"
                    type="tel"
                    placeholder="0788123456"
                    value={formData.managerPhone}
                    onChange={handleInputChange("managerPhone")}
                    error={errors.managerPhone}
                    required
                  />
                  <InputField
                    name="managerCountryCode"
                    label="Country Code"
                    type="text"
                    placeholder="+250"
                    value={formData.managerCountryCode}
                    onChange={handleInputChange("managerCountryCode")}
                    error={errors.managerCountryCode}
                    required
                  />
                </div>

                {/* Services */}
                <div>
                  <h4 className="text-sm font-medium text-[#004B5B] mb-3">Services Offered</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableServices.map((service) => (
                      <label
                        key={service}
                        className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.services.includes(service)}
                          onChange={() => handleServiceToggle(service)}
                          className="w-4 h-4 text-[#004B5B] border-gray-300 rounded focus:ring-[#004B5B]"
                        />
                        <span className="text-sm font-medium text-gray-700">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-6 border-t">
              <div>
                {currentStep === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={isSubmitting}
                  >
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                {currentStep === 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="min-w-32"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-32"
                  >
                    {isSubmitting ? "Creating..." : "Create Branch"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}