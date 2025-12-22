import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export interface AuthPayload {
  userId?: string;
  id?: string;  // Some tokens use 'id' instead of 'userId'
  role?: string;
  companyId?: string;
  [key: string]: unknown;
}

const extractBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader) return null;
  const parts = authorizationHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return authorizationHeader;
};

export const getAuthenticatedUser = async (req: NextRequest): Promise<AuthPayload | null> => {
  const headerToken = extractBearerToken(req.headers.get("authorization"));
  const cookieToken = req.cookies?.get?.("token")?.value;
  const token = headerToken || cookieToken;

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyToken<AuthPayload>(token);
    return {
      ...decoded,
      userId: decoded.userId || decoded.id,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

export const getAuthenticatedCompany = async (req: NextRequest): Promise<AuthPayload | null> => {
  const auth = await getAuthenticatedUser(req);
  if (!auth) return null;
  return { ...auth, companyId: auth.userId };
};
