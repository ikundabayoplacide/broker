"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { InputField } from "@/components/ui/InputField";

type ClientField = "clientName" | "csdNumber" | "phone" | "email" | "address";
type StandingFrequency = "Annually" | "Weekly" | "Monthly" | "";

interface OrderRow {
	security: string;
	quantity: string;
	price: string;
}

const initialRows: OrderRow[] = Array.from({ length: 6 }, () => ({
	security: "",
	quantity: "",
	price: "",
}));

export default function PurchaseOrderForm() {
	const router = useRouter();
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
	const [standingOrderNote, setStandingOrderNote] = useState("");
	const [standingFrequency, setStandingFrequency] = useState<StandingFrequency>("");
	const [additionalInstructions, setAdditionalInstructions] = useState("\n");

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

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!termsAccepted) {
			alert("Please review and accept the Terms & Conditions before submitting.");
			return;
		}

		const payload = {
			client: clientFields,
			preferences: {
				bestMarketPrice,
				priceLimit,
				standingOrderNote,
			},
			orders: orderRows,
			standingOrder: {
				frequency: standingFrequency,
				instructions: additionalInstructions.trim(),
			},
		};
		alert("Purchase order captured! (This demo does not submit to an API.)");
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
						<h1 className="text-3xl font-semibold text-slate-900">Purchase Order Form</h1>
						<p className="text-base text-slate-600">
							Complete this form to authorize BROKER Capital Ltd to execute the purchase of
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
							liable for delays caused by market scarcity of the desired stock.
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
							Provide the details of the account holder for whom the purchase order will be executed.
						</p>
					</header>

					<div className="grid gap-6 md:grid-cols-2">
						<InputField
							name="clientName"
							label="Client Names"
							type="text"
							value={clientFields.clientName}
							onChange={handleClientChange("clientName")}
							placeholder="e.g. Jane Doe"
							required
						/>
						<InputField
							name="csdNumber"
							label="CSD Number"
							type="text"
							value={clientFields.csdNumber}
							onChange={handleClientChange("csdNumber")}
							placeholder="e.g. CSD123456"
							required
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
							placeholder="e.g. jane@example.com"
							required
						/>
						<div className="md:col-span-2">
							<InputField
								name="address"
								label="Physical Address"
								type="text"
								value={clientFields.address}
								onChange={handleClientChange("address")}
								placeholder="House, Street, City"
								required
							/>
						</div>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6">
						<h2 className="text-xl font-semibold text-slate-900">Purchase Order Preferences</h2>
						<p className="mt-1 text-sm text-slate-600">
							Select your preferred execution options for this order.
						</p>
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
							name="standingOrderNote"
							label="Standing Order (Indicate)"
							type="text"
							value={standingOrderNote}
							onChange={(event) => setStandingOrderNote(event.target.value)}
							placeholder="Instructions for standing orders"
						/>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6 flex flex-col gap-1">
						<h2 className="text-xl font-semibold text-slate-900">Purchase Order Details</h2>
						<p className="text-sm text-slate-600">Specify up to six securities with quantities and target prices.</p>
					</header>

					<div className="overflow-hidden rounded-2xl border border-slate-200">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3">No.</th>
									<th className="px-4 py-3">Security</th>
									<th className="px-4 py-3">Quantity</th>
									<th className="px-4 py-3">Price</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-200 bg-white">
								{orderRows.map((row, index) => (
									<tr key={`order-row-${index}`} className="hover:bg-slate-50">
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
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<section className="rounded-3xl bg-white p-8 shadow-lg">
					<header className="mb-6 flex flex-col gap-1">
						<h2 className="text-xl font-semibold text-slate-900">Standing Order Details</h2>
						<p className="text-sm text-slate-600">
							Configure recurring purchase instructions to be executed once funds are received.
						</p>
					</header>

					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-3 rounded-2xl border border-slate-200 p-5">
							<p className="text-sm font-medium text-slate-700">How often is the purchase to be made?</p>
							<div className="flex flex-wrap gap-4">
								{["Annually", "Weekly", "Monthly"].map((frequency) => (
									<label key={frequency} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${standingFrequency === frequency ? "border-rose-500 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-600"}`}>
										<input
											type="radio"
											name="standing-frequency"
											value={frequency}
											checked={standingFrequency === frequency}
											onChange={(event) => setStandingFrequency(event.target.value as StandingFrequency)}
											className="text-rose-600 focus:ring-rose-500"
										/>
										{frequency}
									</label>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<label htmlFor="additionalInstructions" className="block text-sm font-medium text-[#004B5B]">
								Any other instruction(s)
							</label>
							<textarea
								id="additionalInstructions"
								value={additionalInstructions}
								onChange={(event) => setAdditionalInstructions(event.target.value)}
								rows={5}
								placeholder="Provide any additional guidance for BROKER Capital to follow."
								className="w-full rounded-2xl border border-[#004B5B]/40 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#004B5B] focus:ring-2 focus:ring-[#004B5B]/40"
							/>
						</div>
					</div>
				</section>

				<div className="sticky bottom-4 flex justify-end">
					<button
						type="submit"
						className="rounded-full bg-rose-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
						disabled={!termsAccepted}
					>
						Submit Order
					</button>
				</div>
						</form>
					</main>
					<Footer />
		</div>
	);
}
