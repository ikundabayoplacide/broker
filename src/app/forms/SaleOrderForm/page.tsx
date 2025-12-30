"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { InputField } from "@/components/ui/InputField";
import Toast from "@/components/ui/Toast";

type ClientField = "clientName" | "csdNumber" | "phone" | "email" | "address";

interface OrderRow {
	security: string;
	quantity: string;
	price: string;
}

const initialRows: OrderRow[] = [{
	security: "",
	quantity: "",
	price: "",
}];

export default function SaleOrderForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [clientFields, setClientFields] = useState<Record<ClientField, string>>({
		clientName: "",
		csdNumber: "",
		phone: "",
		email: "",
		address: "",
	});
	const [orderRows, setOrderRows] = useState<OrderRow[]>(initialRows);
	const [bestMarketPrice, setBestMarketPrice] = useState(false);
	const [priceLimit, setPriceLimit] = useState(false);
	const [withinTimeLimit, setWithinTimeLimit] = useState("");
	const [bankName, setBankName] = useState("");
	const [bankBranch, setBankBranch] = useState("");
	const [accountNumber, setAccountNumber] = useState("");
	const [officialNote, setOfficialNote] = useState("\n");

	const handleClientChange = (field: ClientField) => (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setClientFields((prev) => ({ ...prev, [field]: value }));
	};

	const handleRowChange = (index: number, key: keyof OrderRow) => (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setOrderRows((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], [key]: value };
			return next;
		});
	};

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [toast, setToast] = useState<{type: 'success' | 'error', title: string, message: string} | null>(null);

	// Auto-populate security from URL params
	useEffect(() => {
		const security = searchParams.get('security');
		if (security) {
			setOrderRows([{
				security: security,
				quantity: "",
				price: "",
			}]);
		}
	}, [searchParams]);

	const addOrderRow = () => {
		setOrderRows(prev => [...prev, { security: "", quantity: "", price: "" }]);
	};

	const removeOrderRow = (index: number) => {
		if (orderRows.length > 1) {
			setOrderRows(prev => prev.filter((_, i) => i !== index));
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!termsAccepted) {
			setToast({type: 'error', title: 'Terms Required', message: 'Please review and accept the Terms & Conditions before submitting.'});
			return;
		}

		setIsSubmitting(true);

		try {
			// Filter out empty order rows
			const validItems = orderRows
				.filter(row => row.security.trim() && row.quantity.trim() && parseInt(row.quantity) > 0)
				.map(row => ({
					security: row.security.trim(),
					quantity: parseInt(row.quantity),
					price: row.price.trim() ? parseFloat(row.price) : null
				}));

			if (validItems.length === 0) {
				setToast({type: 'error', title: 'Items Required', message: 'Please add at least one valid order item.'});
				return;
			}

			const payload = {
				...clientFields,
				bestMarketPrice,
				priceLimit,
				withinTimeLimitNote: withinTimeLimit.trim() || null,
				bankName: bankName.trim() || null,
				bankBranch: bankBranch.trim() || null,
				accountNumber: accountNumber.trim() || null,
				termsAccepted: true,
				items: validItems
			};

			const response = await fetch('/api/forms/SaleOrderForm', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload)
			});

			if (response.ok) {
				const result = await response.json();
				setToast({type: 'success', title: 'Order Submitted', message: 'Your sale order has been submitted successfully!'});
				setTimeout(() => router.push('/dashboard'), 2000);
			} else {
				const error = await response.json();
				setToast({type: 'error', title: 'Submission Failed', message: error.error || 'Failed to submit order'});
			}
		} catch (error) {
			console.error('Submit error:', error);
			setToast({type: 'error', title: 'Network Error', message: 'Please check your connection and try again.'});
		} finally {
			setIsSubmitting(false);
		}
	};

		return (
			<div className="bg-slate-100 min-h-screen">
						<Header />
				<main className="px-4 pb-16 pt-32">
							<button
								type="button"
								onClick={() => router.back()}
								className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#015B70] transition hover:text-[#013b4a]"
							>
								<span aria-hidden="true">←</span>
								Back
							</button>
					<form
						onSubmit={handleSubmit}
						className="mx-auto w-full max-w-5xl space-y-6 text-slate-700"
					>
				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<div className="flex flex-col gap-3">
						<div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-600">
							<span className="h-2 w-2 rounded-full bg-rose-600" />
							BROKER Capital Ltd
						</div>
						<h1 className="text-3xl font-semibold text-slate-900">Sale Order Form</h1>
						<p className="text-base text-slate-600">
							Complete this form to authorize BROKER Capital Ltd to execute the sale of
							securities on your behalf. Required fields are marked with (*).
						</p>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section I</p>
						<h2 className="text-xl font-semibold text-slate-900">Terms &amp; Conditions</h2>
						<p className="mt-2 text-sm text-slate-600">
							Please review the following terms carefully. Accepting these terms is required
							before you can continue with the form.
						</p>
					</header>

					<ul className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-sm leading-relaxed text-slate-700">
						<li>• All payments and charges are in local currency, unless indicated otherwise.</li>
						<li>• Brokerage commissions of 1.71% (minimum Rwf 1,000) will be applied per RSE rules.</li>
						<li>
							• While BROKER Capital will endeavour to execute this order promptly, we cannot be held
							liable for delays caused by oversupply of the desired stock.
						</li>
					</ul>

					<label className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm">
						<input
							type="checkbox"
							checked={termsAccepted}
							onChange={(event) => setTermsAccepted(event.target.checked)}
							className="mt-1 h-5 w-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
						/>
						<span className="text-slate-700">
							I confirm that I have read and agree to the Terms &amp; Conditions stated above.
						</span>
					</label>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section II</p>
						<h2 className="text-xl font-semibold text-slate-900">Client Details</h2>
						<p className="mt-1 text-sm text-slate-600">
							Provide the contact information of the account holder for whom the sale order will be executed.
						</p>
					</header>

					<div className="grid gap-6 md:grid-cols-2">
						<InputField
							name="clientName"
							label="Client Names"
							type="text"
							value={clientFields.clientName}
							onChange={handleClientChange("clientName")}
							placeholder="e.g. John Doe"
							required
						/>
						<InputField
							name="csdNumber"
							label="CSD Number"
							type="text"
							value={clientFields.csdNumber}
							onChange={handleClientChange("csdNumber")}
							placeholder="e.g. CSD123456"
						/>
						<InputField
							name="phone"
							label="Telephone Number"
							type="tel"
							value={clientFields.phone}
							onChange={handleClientChange("phone")}
							placeholder="e.g. +250 700 000 000"
							required
						/>
						<InputField
							name="email"
							label="Email Address"
							type="email"
							value={clientFields.email}
							onChange={handleClientChange("email")}
							placeholder="e.g. john@example.com"
						/>
						<div className="md:col-span-2">
							<InputField
								name="address"
								label="Physical Address"
								type="text"
								value={clientFields.address}
								onChange={handleClientChange("address")}
								placeholder="House, Street, City"
							/>
						</div>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6">
						<h2 className="text-xl font-semibold text-slate-900">Sale Order Preferences</h2>
						<p className="mt-1 text-sm text-slate-600">Select your execution preferences for this sale.</p>
					</header>

					<div className="grid gap-4 md:grid-cols-3">
						<label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
							<input
								type="checkbox"
								checked={bestMarketPrice}
								onChange={(event) => setBestMarketPrice(event.target.checked)}
								className="h-5 w-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
							/>
							<span className="text-sm font-medium text-slate-700">Best Market Price</span>
						</label>

						<label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
							<input
								type="checkbox"
								checked={priceLimit}
								onChange={(event) => setPriceLimit(event.target.checked)}
								className="h-5 w-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
							/>
							<span className="text-sm font-medium text-slate-700">Price Limit</span>
						</label>

						<InputField
							name="withinTimeLimit"
							label="Within Time Limit (Indicate)"
							type="text"
							value={withinTimeLimit}
							onChange={(event) => setWithinTimeLimit(event.target.value)}
							placeholder="e.g. Complete within 30 days"
						/>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6 flex flex-col gap-1">
						<h2 className="text-xl font-semibold text-slate-900">Sale Order Details</h2>
						<p className="text-sm text-slate-600">Add securities you wish to sell with quantities and price targets. Click "+ Add Another Security" to add more.</p>
					</header>

					<div className="overflow-hidden rounded-2xl border border-slate-200">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3">No.</th>
									<th className="px-4 py-3">Security</th>
									<th className="px-4 py-3">Quantity</th>
									<th className="px-4 py-3">Price</th>
									<th className="px-4 py-3">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-200 bg-white">
								{orderRows.map((row, index) => (
									<tr key={`sale-row-${index}`} className="hover:bg-slate-50">
										<td className="px-4 py-3 font-medium text-slate-500">{index + 1}</td>
										<td className="px-4 py-3">
											<InputField
												name={`security-${index}`}
												label="Security"
												type="text"
												value={row.security}
												onChange={handleRowChange(index, "security")}
												placeholder="e.g. BK Group"
											/>
										</td>
										<td className="px-4 py-3">
											<InputField
												name={`quantity-${index}`}
												label="Quantity"
												type="number"
												value={row.quantity}
												onChange={handleRowChange(index, "quantity")}
												placeholder="0"
											/>
										</td>
										<td className="px-4 py-3">
											<InputField
												name={`price-${index}`}
												label="Price"
												type="number"
												value={row.price}
												onChange={handleRowChange(index, "price")}
												placeholder="0.00"
											/>
										</td>
										<td className="px-4 py-3">
											{orderRows.length > 1 && (
												<button
													type="button"
													onClick={() => removeOrderRow(index)}
													className="text-red-600 hover:text-red-800 text-sm"
												>
													Remove
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<div className="p-4 border-t border-slate-200">
							<button
								type="button"
								onClick={addOrderRow}
								className="text-blue-600 hover:text-blue-800 text-sm font-medium"
							>
								+ Add Another Security
							</button>
						</div>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6 flex flex-col gap-1">
						<h2 className="text-xl font-semibold text-slate-900">Client Bank Details</h2>
						<p className="text-sm text-slate-600">Provide settlement details for funds received after sale of shares.</p>
					</header>

					<div className="grid gap-6 md:grid-cols-3">
						<InputField
							name="bankName"
							label="Bank"
							type="text"
							value={bankName}
							onChange={(event) => setBankName(event.target.value)}
							placeholder="e.g. Bank of Kigali"
						/>
						<InputField
							name="bankBranch"
							label="Branch"
							type="text"
							value={bankBranch}
							onChange={(event) => setBankBranch(event.target.value)}
							placeholder="e.g. Downtown"
						/>
						<InputField
							name="accountNumber"
							label="Account Number"
							type="text"
							value={accountNumber}
							onChange={(event) => setAccountNumber(event.target.value)}
							placeholder="e.g. 1234567890"
						/>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6 flex flex-col gap-1">
						<h2 className="text-xl font-semibold text-slate-900">Confirmation</h2>
						<p className="text-sm text-slate-600">Authorization details for customer and official use.</p>
					</header>

					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-[#004B5B]">Customer signature(s)</label>
							<textarea
								rows={4}
								placeholder="Electronic signature or authorization note"
								className="w-full rounded-2xl border border-[#004B5B]/40 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#004B5B] focus:ring-2 focus:ring-[#004B5B]/40"
							/>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-[#004B5B]">Official use only</label>
							<textarea
								rows={4}
								value={officialNote}
								onChange={(event) => setOfficialNote(event.target.value)}
								placeholder="Names, designation, stamp & signature"
								className="w-full rounded-2xl border border-[#004B5B]/40 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#004B5B] focus:ring-2 focus:ring-[#004B5B]/40"
							/>
						</div>
					</div>
				</section>

				<div className="sticky bottom-4 flex justify-end">
					<button
						type="submit"
						className="rounded-full bg-rose-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
						disabled={!termsAccepted || isSubmitting}
					>
						{isSubmitting ? 'Submitting...' : 'Submit Order'}
					</button>
				</div>
						</form>
					</main>
					<Footer />
					{toast && (
						<Toast
							type={toast.type}
							title={toast.title}
							message={toast.message}
							onClose={() => setToast(null)}
						/>
					)}
		</div>
	);
}