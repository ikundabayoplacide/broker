"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiBarChart2,
  FiBriefcase,
  FiTrendingUp,
  FiCreditCard,
  FiClipboard,
  FiSettings,
  FiUsers,
  FiZap,
  FiDollarSign,
  FiHome,
  FiMenu,
  FiHelpCircle,
  FiSearch,
  FiChevronDown,
  FiShield,
  FiUserCheck,
  FiUser,
  FiMapPin
} from "react-icons/fi";
import { BsHousesFill } from "react-icons/bs";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from '@/components/ui/NotificationBell';


type DashboardRole = "client" | "teller" | "manager" | "admin" | "super-admin" | "company";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: DashboardRole;
  userName?: string;
  userEmail?: string;
}

const toDashboardRole = (role?: string | null): DashboardRole => {
  const normalized = role?.toUpperCase().replace(/-/g, "_");

  switch (normalized) {
    case "CLIENT":
      return "client";
    case "TELLER":
      return "teller";
    case "ADMIN":
      return "admin";
    case "MANAGER":
      return "manager";
    case "SUPER_ADMIN":
      return "super-admin";
    case "COMPANY":
      return "company";
    default:
      console.warn('Unknown role:', role, 'normalized:', normalized);
      return "client";
  }
};

export default function DashboardLayout({
  children,
  userRole,
  userName,
  userEmail,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [managerUsersOpen, setManagerUsersOpen] = useState(false);
  // notification dropdown is handled by `NotificationBell`
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isAuthenticated } = useAuth();

  // `NotificationBell` component fetches and renders notifications for the current user

  useEffect(() => {
    if (loading || isAuthenticated) {
      return;
    }

    const logoutFlagKey = "santech:logoutRedirect";
    const hasWindow = typeof window !== "undefined";
    const shouldGoHome = hasWindow && sessionStorage.getItem(logoutFlagKey) === "true";

    if (shouldGoHome) {
      sessionStorage.removeItem(logoutFlagKey);
      router.replace("/");
      return;
    }

    const redirectSuffix = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
    router.replace(`/auth/login${redirectSuffix}`);
  }, [loading, isAuthenticated, pathname, router]);

  const derivedRole = useMemo(() => {
    if (userRole) {
      return userRole;
    }
    const role = toDashboardRole(user?.role);
    return role;
  }, [userRole, user?.role]);

  // Keep dropdowns open when on related pages
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/commonPage/users')) {
      if (derivedRole === 'super-admin') {
        setUserManagementOpen(true);
      } else if (derivedRole === 'manager') {
        setManagerUsersOpen(true);
      }
    }
  }, [pathname, derivedRole]);

  const derivedName = useMemo(() => {
    if (userName) return userName;
    const fullName = (user?.fullName as string | undefined)?.trim();
    if (fullName) return fullName;
    return "User";
  }, [userName, user?.fullName]);

  const derivedEmail = useMemo(() => {
    if (userEmail) return userEmail;
    return user?.email ?? "";
  }, [userEmail, user?.email]);

  const derivedPassportPhoto = useMemo(() => {
    const raw = (user as { passportPhoto?: unknown } | undefined)?.passportPhoto;
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
    return undefined;
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getNavItems = () => {
    switch (derivedRole) {
      case "client":
        return [
          { name: "Dashboard", icon: FiBarChart2, href: "/dashboard/client" },
          { name: "Investments", icon: FiBriefcase, href: "/dashboard/client/investments" },
          { name: "Trade", icon: FiTrendingUp, href: "/dashboard/client/trade" },
          { name: "Wallet", icon: FiCreditCard, href: "/dashboard/client/wallet" },
          { name: "History", icon: FiClipboard, href: "/dashboard/client/history" },
          { name: "Settings", icon: FiSettings, href: "/dashboard/commonPage/settings" },
        ];
      case "teller":
        return [
          { name: "Dashboard", icon: FiBarChart2, href: "/dashboard/teller" },
          { name: "Users", icon: FiUsers, href: "/dashboard/teller/users" },
          { name: "Companies", icon: FiBriefcase, href: "/dashboard/commonPage/companies" },
          { name: "Trade", icon: FiTrendingUp, href: "/dashboard/teller/trade" },
          { name: "Orders", icon: FiClipboard, href: "/dashboard/teller/orders" },
          { name: "Executions", icon: FiZap, href: "/dashboard/teller/executions" },
          { name: "Reports", icon: FiTrendingUp, href: "/dashboard/teller/reports" },
          { name: "Settings", icon: FiSettings, href: "/dashboard/commonPage/settings" },
        ];
      case "manager":
        return [
          { name: "Dashboard", icon: FiBarChart2, href: "/dashboard/manager" },
          {
            name: "Users",
            icon: FiUsers,
            hasChildren: true,
            children: [
              { name: "All Users", href: "/dashboard/commonPage/users", icon: FiUsers },
              { name: "Tellers", href: "/dashboard/commonPage/users/teller", icon: FiUserCheck },
              { name: "Clients", href: "/dashboard/commonPage/users/client", icon: FiUser },
            ]
          },
          { name: "Companies", icon: FiBriefcase, href: "/dashboard/commonPage/companies" },
          { name: "Trade", icon: FiTrendingUp, href: "/dashboard/manager/trade"},
          { name: "Transactions", icon: FiDollarSign, href: "/dashboard/manager/transactions" },
          { name: "Reports", icon: FiTrendingUp, href: "/dashboard/manager/reports" },
          { name: "Settings", icon: FiSettings, href: "/dashboard/commonPage/settings" },
        ];
      case "super-admin":
        return [
          { name: "Overview", icon: FiBarChart2, href: "/dashboard/super-admin" },
          {
            name: "User Management",
            icon: FiUsers,
            hasChildren: true,
            children: [
              { name: "All Users", href: "/dashboard/commonPage/users", icon: FiUsers },
              { name: "Admin [H.O]", href: "/dashboard/commonPage/users/admin", icon: FiShield },
              { name: "Branch Managers", icon: FiMapPin, href: "/dashboard/commonPage/users/manager" },
              { name: "Teller", href: "/dashboard/commonPage/users/teller", icon: FiUserCheck },
              { name: "Client", href: "/dashboard/commonPage/users/client", icon: FiUser },
            ]
          },
          { name: "Companies", icon: FiBriefcase, href: "/dashboard/commonPage/companies" },
          { name: "Trade", icon: FiTrendingUp, href: "/dashboard/super-admin/trade" },
          {name:"Branches",icon:FiMenu,href:"/dashboard/super-admin/branches"},
          { name: "Settings", icon: FiSettings, href: "/dashboard/commonPage/settings" },
        ];
      case "company":
        return [
          { name: "Dashboard", icon: FiBarChart2, href: "/dashboard/company" },
          { name: "Investments", icon: FiBriefcase, href: "/dashboard/company/investments" },
          { name: "Trade", icon: FiTrendingUp, href: "/dashboard/company/trade" },
          { name: "Wallet", icon: FiCreditCard, href: "/dashboard/company/wallet" },
          { name: "History", icon: FiClipboard, href: "/dashboard/company/history" },
          { name: "Share Movement", icon: FiZap, href: "/dashboard/company/share-movement" },
          { name: "Shareholders", icon: FiUsers, href: "/dashboard/company/shareholders" },
          { name: "Settings", icon: FiSettings, href: "/dashboard/company/settings" },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden w-full">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 gradient-primary transform transition-transform duration-300 flex flex-col
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/20">
          <div className="flex items-center space-x-3 ml-2">
            <Link href="/">
              <Image
                src="/logo.svg"
                alt="App Logo"
                width={80}
                height={35}
                className="rounded-md bg-white p-1"
              />
            </Link>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 mt-8 px-4 overflow-y-auto scrollbar-hide">
          {getNavItems().map((item, index) => {
            const Icon = item.icon;
            const hasChildren = item.hasChildren;

            if (hasChildren) {
              const isUserManagement = item.name === "User Management";
              const isManagerUsers = item.name === "Users" && derivedRole === "manager";
              const isOpen = isUserManagement ? userManagementOpen : (isManagerUsers ? managerUsersOpen : false);
              const toggleOpen = isUserManagement 
                ? () => setUserManagementOpen(!userManagementOpen)
                : (isManagerUsers ? () => setManagerUsersOpen(!managerUsersOpen) : () => {});

              return (
                <div key={item.name} className="mb-2">
                  <button
                    onClick={toggleOpen}
                    className="flex items-center justify-between w-full px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="text-xl" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <FiChevronDown className={`text-lg transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                      }`} />
                  </button>

                  {isOpen && (
                    <div className="relative ml-6 mt-2 space-y-1">
                      <div className="absolute left-1 top-0 bottom-0 w-px bg-white "></div>
                      {item.children?.map((child, childIndex) => {
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="relative flex items-center px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm group"
                            onClick={() => {
                              // Keep dropdown open when navigating to child pages
                              setSidebarOpen(false);
                            }}
                          >
                            <div className="absolute left-2 w-4 font-bold h-px bg-white group-hover:bg-white/40"></div>
                            <div className="flex items-center space-x-3 ml-4">
                              <ChildIcon className="text-base" />
                              <span>{child.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href || '#'}
                className="flex items-center space-x-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 mb-2"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="text-xl" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 mx-4 mb-4">
          <div className="bg-white/10 rounded-lg p-4 text-white">
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/25 flex items-center justify-center border border-white/40 shadow-inner">
                {derivedPassportPhoto ? (
                  <Image
                    src={derivedPassportPhoto}
                    alt={derivedName ?? "User"}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      console.log('Image failed to load:', derivedPassportPhoto);
                      e.currentTarget.style.display = 'none';
                    }}
                    unoptimized
                  />
                ) : (
                  <span className="font-semibold text-white text-xl">
                    {derivedName?.charAt(0) ?? "U"}
                  </span>
                )}
              </div>
              <div className="max-w-40">
                <p className="font-medium leading-tight">{derivedName}</p>
                <p className="text-xs text-white/80 truncate">{derivedEmail}</p>
                <p className="text-sm text-white/70 capitalize">{derivedRole}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-64`}
      >
        <header className="fixed top-0 left-0 md:left-64 right-0 z-[9999] bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-3 md:px-6 w-full max-w-full">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
            >
              <FiMenu className="w-6 h-6" />
            </button>

            <div className="flex-1 max-w-xl mx-4 hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search here"
                  className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004B5B] focus:border-transparent"
                />
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-auto">
              <NotificationBell />
              <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                <FiHelpCircle className="w-6 h-6" />
              </button>

              <select className="text-sm font-medium text-gray-600 border-none bg-transparent focus:outline-none cursor-pointer">
                <option>EN</option>
                <option>FR</option>
                <option>RW</option>
                <option>SW</option>
              </select>
            </div>
          </div>
        </header>

        <main className="pt-20 pr-3 pb-8 pl-3 md:pr-8 md:pl-6 flex-1 overflow-y-auto bg-gray-50 w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
