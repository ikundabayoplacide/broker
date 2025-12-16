import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

type Role = "client" | "teller" | "admin" | "manager" | "super_admin" | "company";

const roleToDashboard: Record<Role, string> = {
  client: "/dashboard/client",
  teller: "/dashboard/teller",
  admin: "/dashboard/admin",
  manager: "/dashboard/manager",
  super_admin: "/dashboard/super-admin",
  company: "/dashboard/company",
};

const normalizeRole = (role?: unknown): Role | null => {
  if (typeof role !== "string") return null;
  const normalized = role.toLowerCase().replace(/-/g, "_");
  if (
    normalized === "client" ||
    normalized === "teller" ||
    normalized === "admin" ||
    normalized === "manager" ||
    normalized === "super_admin" ||
    normalized === "company"
  ) {
    return normalized as Role;
  }
  return null;
};

const extractDashboardRole = (pathname: string): Role | null => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "dashboard" || segments.length < 2) return null;
  return normalizeRole(segments[1]);
};

export async function middleware(request: NextRequest) {
  const tokenValue = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/auth");
  const openAuthPaths = new Set(["/auth/login", "/auth/signup"]);
  const isOpenAuthPage = openAuthPaths.has(pathname);
  const isDashboardPage = pathname.startsWith("/dashboard");

  // Skip logging for static assets and API routes
  const isStaticAsset = pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/);
  const isApiRoute = pathname.startsWith("/api");
  
  if (!isStaticAsset && !isApiRoute) {
    console.log('Middleware check:', {
      pathname,
      hasToken: !!tokenValue,
      isDashboardPage,
      isAuthPage
    });
  }

  const redirectToLogin = () => {
    const loginUrl = new URL("/auth/login", request.url);
    const existingRedirect = request.nextUrl.searchParams.get("redirect");

    if (existingRedirect) {
      loginUrl.searchParams.set("redirect", existingRedirect);
    } else {
      loginUrl.searchParams.set("redirect", pathname);
    }
    if (!isStaticAsset && !isApiRoute) {
      console.log('Redirecting to login from:', pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("token");
    return response;
  };

  if (!tokenValue) {
    if (!isStaticAsset && !isApiRoute) {
      console.log('No token found, checking if dashboard page...');
    }
    if (isDashboardPage) {
      return redirectToLogin();
    }
    return NextResponse.next();
  }

  try {
    const payload = await verifyToken<{ role?: string; type?: string }>(tokenValue);
    if (!isStaticAsset && !isApiRoute) {
      console.log('Token verified, payload type:', payload.type || 'user');
    }
    
    // If it's a company token, set role to 'company'
    const userRole = payload.type === "company" 
      ? normalizeRole("company") 
      : normalizeRole(payload.role);

    if (!isStaticAsset && !isApiRoute) {
      console.log('Determined user role:', userRole);
    }

    if (!userRole) {
      if (isDashboardPage) {
        return redirectToLogin();
      }
      const response = NextResponse.next();
      response.cookies.delete("token");
      return response;
    }

    if (isAuthPage && !isOpenAuthPage) {
      return NextResponse.redirect(new URL(roleToDashboard[userRole], request.url));
    }

    if (isDashboardPage) {
      const sharedRoutes = ["/dashboard/commonPage/companies", "/dashboard/commonPage/trade"];
      const isSharedRoute = sharedRoutes.some(route => pathname.startsWith(route));
      
      if (!isSharedRoute) {
        const requestedRole = extractDashboardRole(pathname);
        if (!requestedRole || requestedRole !== userRole) {
          return NextResponse.redirect(new URL(roleToDashboard[userRole], request.url));
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware token verification failed:", error);
    if (isDashboardPage) {
      return redirectToLogin();
    }
    const response = NextResponse.next();
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: ["/auth/:path*", "/dashboard/:path*"],
};