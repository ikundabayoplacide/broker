import { Prisma } from "@prisma/client";

export const toDecimalOrUndefined = (value?: string | number | null) => {
  if (value === undefined || value === null) return undefined;
  const stringValue = typeof value === 'number' ? value.toString() : value;
  const normalized = stringValue.trim();
  if (!normalized) return undefined;
  
  // Check if it's a valid number
  const num = Number(normalized);
  if (isNaN(num)) {
    throw new Error(`Invalid number: ${normalized}`);
  }
  
  return new Prisma.Decimal(normalized);
};
