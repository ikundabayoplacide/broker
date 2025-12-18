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
  const cookieToken = req.cookies.get("token")?.value;
  const token = headerToken || cookieToken;

  console.log("Auth Debug:", {
    hasHeaderToken: !!headerToken,
    hasCookieToken: !!cookieToken,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  });

  if (!token) {
    console.log("No token found in request");
    return null;
  }

  try {
    const decoded = await verifyToken<AuthPayload>(token);
    
    // Handle both 'id' and 'userId' fields in token payload
    // Some tokens use 'id' while others use 'userId'
    const userId = decoded.userId || decoded.id;
    
    const result = {
      ...decoded,
      userId: userId
    };
    
    console.log("Token verified successfully:", { userId: result.userId, role: result.role });
    return result;
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
