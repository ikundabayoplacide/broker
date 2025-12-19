"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Menu, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/axios";

export interface SettingsLayoutNavItem {
	id: string;
	label: string;
	description?: string;
	icon?: ReactNode;
	disabled?: boolean;
}

type SettingsLayoutRole = "client" | "teller" | "admin" | "super-admin" | "company";

interface SettingsLayoutProps {
	title: string;
	description?: string;
	navItems?: SettingsLayoutNavItem[];
	activeItem?: string;
	onItemSelect?: (id: string) => void;
	actions?: ReactNode;
	userRole?: SettingsLayoutRole;
	userName?: string;
	userEmail?: string;
	onDeleteAccount?: () => void;
	onLogout?: () => void;
	children: ReactNode;
}

export default function SettingsLayout({
	title,
	description,
	navItems = [],
	activeItem,
	onItemSelect,
	actions,
	userRole,
	userName,
	userEmail,
	onDeleteAccount,
	onLogout,
	children,
}: SettingsLayoutProps) {
	const hasNavigation = navItems.length > 0;
	const router = useRouter();
	const { user, logout: authLogout } = useAuth();
	const [logoutLoading, setLogoutLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);



	const derivedName = useMemo(() => {
		if (userName) return userName;
		const fullName = (user?.fullName as string | undefined)?.trim();
		if (fullName) return fullName;
		if (user?.email) return user.email.split("@")[0];
		return "User";
	}, [userName, user?.fullName, user?.email]);

	const derivedEmail = useMemo(() => {
		if (userEmail) return userEmail;
		return typeof user?.email === "string" ? user.email : "";
	}, [userEmail, user?.email]);

	const handleLogout = () => {
		if (logoutLoading) {
			return;
		}

		void (async () => {
			try {
				setLogoutLoading(true);
				if (onLogout) {
					await Promise.resolve(onLogout());
				} else if (typeof authLogout === "function") {
					await Promise.resolve(authLogout());
				} else {
					console.warn("Logout action not implemented");
					return;
				}
				router.replace("/");
				router.refresh();
			} catch (error) {
				console.error("Failed to log out", error);
			} finally {
				setLogoutLoading(false);
			}
		})();
	};

	const handleDeleteAccount = () => {
		if (deleteLoading) {
			return;
		}
		setDeleteError(null);
		setIsDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		if (deleteLoading) return;
		setIsDeleteModalOpen(false);
	};

	const confirmDeleteAccount = () => {
		if (deleteLoading) {
			return;
		}

		setDeleteError(null);
		void (async () => {
			try {
				setDeleteLoading(true);
				if (onDeleteAccount) {
					await Promise.resolve(onDeleteAccount());
				} else {
					if (!user?.id) {
						throw new Error("Unable to determine which account to delete.");
					}
					await api.delete(`/user/${user.id}`);
					if (typeof authLogout === "function") {
						await Promise.resolve(authLogout());
					}
				}
				setIsDeleteModalOpen(false);
				router.replace("/");
				router.refresh();
			} catch (error) {
				const message = error instanceof Error ? error.message : "Failed to delete account";
				setDeleteError(message);
			} finally {
				setDeleteLoading(false);
			}
		})();
	};

	return (
		<DashboardLayout
			userName={derivedName}
			userEmail={derivedEmail}
		>
			<div className="mx-auto max-w-6xl pb-10 space-y-6">
				<header className="flex flex-col gap-4 rounded-3xl bg-white/90 p-6 shadow-sm backdrop-blur">
					<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
						<div>
							<h1 className="text-2xl font-semibold text-[#004B5B] md:text-3xl">
								{title}
							</h1>
							{description && (
								<p className="mt-1 text-sm text-slate-600 md:text-base">
									{description}
								</p>
							)}
						</div>
						{actions && (
							<div className="flex items-center gap-3 text-sm md:text-base">
								{actions}
							</div>
						)}
					</div>
					{hasNavigation && (
						<div className="md:hidden">
							<label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
								<Menu className="h-4 w-4" aria-hidden="true" /> Sections
							</label>
							<div className="relative mt-2">
								<select
									className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-700 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20"
									value={activeItem}
									onChange={(event) => onItemSelect?.(event.target.value)}
								>
									{navItems.map((item) => (
										<option key={item.id} value={item.id} disabled={item.disabled}>
											{item.label}
										</option>
									))}
								</select>
								<ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							</div>
						</div>
					)}
				</header>

				<section className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
					{hasNavigation && (
						<aside className="hidden flex-col gap-2 rounded-3xl bg-white/90 p-4 shadow-sm backdrop-blur md:flex">
							{navItems.map((item) => {
								const isActive = item.id === activeItem;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => !item.disabled && onItemSelect?.(item.id)}
										disabled={item.disabled}
										className={`group flex items-start gap-3 rounded-2xl border border-transparent px-4 py-3 text-left transition-all duration-150 ${
											isActive
												? "bg-[#004B5B]/10 text-[#004B5B] shadow-sm"
												: "text-slate-500 hover:border-[#004B5B]/40 hover:bg-[#004B5B]/5 hover:text-[#004B5B]"
											} ${item.disabled ? "cursor-not-allowed opacity-60" : ""}`}
									>
										{item.icon && (
											<span className="mt-0.5 text-[#004B5B] group-hover:text-[#003641]">
												{item.icon}
											</span>
										)}
										<span>
											<span className="block text-sm font-medium md:text-base">
												{item.label}
											</span>
											{item.description && (
												<span className="mt-1 block text-xs text-slate-500">
													{item.description}
												</span>
											)}
										</span>
										{isActive && (
											<ChevronRight className="ml-auto h-4 w-4 text-[#004B5B]" aria-hidden="true" />
										)}
									</button>
								);
							})}
						</aside>
					)}

					<main className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
						<div className="flex flex-col gap-6">
							{children}
							<Card className="p-6" hover={false}>
								<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
									<div>
										<h3 className="text-lg font-semibold text-[#004B5B]">Account actions</h3>
										<p className="mt-1 text-sm text-slate-500">
											Sign out safely or permanently delete your account. Deletion is irreversible.
										</p>
									</div>
									<div className="flex flex-row gap-3">
										<Button
											type="button"
											variant="primary"
											className="flex items-center hover:border  gap-2 px-4 py-2 text-sm whitespace-nowrap"
											onClick={handleLogout}
											disabled={logoutLoading || deleteLoading}
										>
											<LogOut className="h-3.5 w-3.5" aria-hidden="true" />
											<span>{logoutLoading ? "Logging out..." : "Log out"}</span>
										</Button>
										<Button
											type="button"
											variant="secondary"
											className="flex items-center border gap-2 px-4 py-2 text-sm whitespace-nowrap bg-red-50! text-red-600! hover:bg-red-500! hover:text-white!"
											onClick={handleDeleteAccount}
											disabled={deleteLoading || logoutLoading}
										>
											<Trash2 className="h-3.5 w-3.5"  aria-hidden="true" />
											<span>{deleteLoading ? "Deleting..." : "Delete account"}</span>
										</Button>
									</div>
									{deleteError && !isDeleteModalOpen && (
										<p className="text-sm text-red-600">
											{deleteError}
										</p>
									)}
								</div>
							</Card>
						</div>
					</main>
				</section>
			</div>

					{isDeleteModalOpen && (
						<div
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
							role="dialog"
							aria-modal="true"
							onClick={closeDeleteModal}
						>
							<div
								className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
								onClick={(event) => event.stopPropagation()}
							>
								<div className="flex items-start justify-between gap-4">
									<div>
										<h3 className="text-lg font-semibold text-[#004B5B]">Delete account?</h3>
										<p className="mt-1 text-sm text-slate-500">
											This action is permanent. All data associated with your account will be removed.
										</p>
									</div>
								</div>
								{deleteError && (
									<p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
										{deleteError}
									</p>
								)}
								<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
									<Button
										variant="secondary"
										className="px-4 py-2"
										onClick={closeDeleteModal}
										disabled={deleteLoading}
									>
										Cancel
									</Button>
									<Button
										variant="primary"
										className="flex items-center gap-2 px-4 py-2 bg-red-900! text-white hover:bg-red-1000!"
										onClick={confirmDeleteAccount}
										disabled={deleteLoading}
									>
										{deleteLoading ? "Deleting..." : "Yes, delete"}
									</Button>
								</div>
							</div>
						</div>
					)}
		</DashboardLayout>
	);
}
