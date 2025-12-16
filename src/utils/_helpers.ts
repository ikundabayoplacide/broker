import { verifyToken } from "@/lib/auth";

export const USER_MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "TELLER",
  "COMPANY",
  "CLIENT",
] as const;

export type Role = (typeof USER_MANAGEMENT_ROLES)[number];

export class UnauthorizedError extends Error {
  status = 401;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export async function requireUserManagementRole(
  request: Request,
  allowedRoles: readonly Role[] = USER_MANAGEMENT_ROLES
): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization") ?? request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    throw new UnauthorizedError("Missing access token");
  }

  let payload: { id?: unknown; role?: unknown };

  try {
    payload = await verifyToken<{ id?: unknown; role?: unknown }>(token);
  } catch (error) {
    console.error("Token verification failed", error);
    throw new UnauthorizedError("Invalid or expired token");
  }

  const role = payload.role;
  const id = payload.id;

  if (typeof id !== "string") {
    throw new UnauthorizedError("Invalid token payload");
  }

  if (typeof role !== "string" || !(allowedRoles as readonly string[]).includes(role)) {
    throw new ForbiddenError("Insufficient permissions");
  }

  return { id, role: role as Role };
}
