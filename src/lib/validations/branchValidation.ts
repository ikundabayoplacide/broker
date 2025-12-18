import { z } from "zod";

export const branchValidationSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters"),
  location: z.string().min(5, "Location must be at least 5 characters"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email format"),
  // Manager information
  managerName: z.string().min(2, "Manager name must be at least 2 characters"),
  managerEmail: z.string().email("Invalid manager email format"),
  managerPhone: z.string().min(10, "Manager phone must be at least 10 digits"),
  managerCountryCode: z.string().default("+250"),
  managerPassword: z.string().min(8, "Manager password must be at least 8 characters"),
  managerConfirmPassword: z.string().min(8, "Please confirm the manager password"),
  country: z.string().default("Rwanda"),
  services: z.array(z.string()).optional(),
}).refine((data) => data.managerPassword === data.managerConfirmPassword, {
  message: "Manager passwords don't match",
  path: ["managerConfirmPassword"],
});

export const branchUpdateSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters").optional(),
  location: z.string().min(5, "Location must be at least 5 characters").optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format").optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format").optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
  email: z.string().email("Invalid email format").optional(),
});

export type BranchFormData = z.infer<typeof branchValidationSchema>;
export type BranchUpdateData = z.infer<typeof branchUpdateSchema>;