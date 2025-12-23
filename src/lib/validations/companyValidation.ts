import { z } from "zod";
import { parsePhoneNumber } from "libphonenumber-js";

const numericString = z
  .union([z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "number") return value.toString();
    return value.toString().trim();
  })
  .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
    message: "Share price must be a valid positive number",
  });

const positiveInteger = z
  .number({ error: "Must be a number" })
  .int({ message: "Must be an integer" })
  .positive({ message: "Must be greater than zero" });

const nonNegativeInteger = z
  .number({ error: "Must be a number" })
  .int({ message: "Must be an integer" })
  .nonnegative({ message: "Must be zero or greater" });

const positiveBigInt = z
  .union([z.number(), z.string(), z.bigint()])
  .transform((value) => {
    if (typeof value === "bigint") return value;
    const num = typeof value === "string" ? value.replace(/[\s,]/g, "") : value;
    return BigInt(num);
  })
  .refine((value) => value > 0n, {
    message: "Must be greater than zero",
  });

const nonNegativeBigInt = z
  .union([z.number(), z.string(), z.bigint()])
  .transform((value) => {
    if (typeof value === "bigint") return value;
    const num = typeof value === "string" ? value.replace(/[\s,]/g, "") : value;
    return BigInt(num);
  })
  .refine((value) => value >= 0n, {
    message: "Must be zero or greater",
  });

const isoDateString = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.valueOf());
  }, "Snapshot date must be a valid date");

const baseCompanySchema = z
  .object({
    name: z.string().trim().min(1, "Company name is required"),
    email: z.string().email("Valid email is required"),
    phoneCountryCode: z.string().min(1, "Phone country code is required"),
    phone: z.string().min(1, "Phone number is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    symbol: z.string().trim().max(10).optional(),
    description: z.string().trim().max(5000).optional(),
    sector: z.string().trim().max(255).optional(),
    country: z.string().trim().min(1, "Country is required"),
    city: z.string().trim().min(1, "City is required"),
    documents: z.array(z.string().url("Each document must be a valid URL")).optional(),
    sharePrice: numericString.optional(),
    totalShares: positiveBigInt.optional(),
    availableShares: nonNegativeBigInt.optional(),
    contract: z.string().trim().max(5000).optional(),
  })
  .superRefine((value, ctx) => {
    // Validate phone number
    try {
      const phoneNumber = parsePhoneNumber(`${value.phoneCountryCode}${value.phone}`);
      if (!phoneNumber || !phoneNumber.isValid()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Invalid phone number",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Invalid phone number format",
      });
    }

    if (
      value.availableShares !== undefined &&
      value.totalShares !== undefined &&
      value.availableShares > value.totalShares
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availableShares"],
        message: "Available shares cannot exceed total shares",
      });
    }


  });

export const companyCreateSchema = baseCompanySchema;

export const companyUpdateSchema = baseCompanySchema
  .omit({ password: true }) // Password should be updated separately
  .partial()
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided",
  });

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
