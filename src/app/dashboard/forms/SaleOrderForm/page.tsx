"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import { InputField } from "@/components/ui/InputField";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";

type ClientField = "clientName" | "csdNumber" | "phone" | "email" | "address";

interface OrderRow {
	security: string;
	quantity: string;
	price: string;
	availableShares?: number;
	validationError?: string;
	totalAmount?: number;
}

const initialRows: OrderRow[] = [{
	security: "",
	quantity: "",
	price: "",
}];

export default function SaleOrderForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user } = useAuth();
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [orderFor, setOrderFor] = useState<'self' | 'client'>('self');
	const [selectedClient, setSelectedClient] = useState<any>(null);
	const [clients, setClients] = useState<any[]>([]);
	const [clientSearch, setClientSearch] = useState('');
	const [showClientDropdown, setShowClientDropdown] = useState(false);
	const [securities, setSecurities] = useState<any[]>([]);
	const [showSecurityDropdown, setShowSecurityDropdown] = useState<{[key: number]: boolean}>({});
	const [userPortfolio, setUserPortfolio] = useState<any[]>([]);
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
			const updatedRow = { ...next[index], [key]: value };
			
			// Validate quantity and calculate total
			if (key === 'quantity' || key === 'price') {
				const quantity = parseInt(key === 'quantity' ? value : updatedRow.quantity) || 0;
				const price = parseFloat(key === 'price' ? value : updatedRow.price) || 0;
				const availableShares = updatedRow.availableShares || 0;
				
				// Validate quantity
				if (key === 'quantity') {
					if (quantity > availableShares) {
						updatedRow.validationError = `You only have ${availableShares} shares available`;
					} else if (quantity > 0 && quantity % 100 !== 0) {
						updatedRow.validationError = 'Quantity must be in multiples of 100 (e.g., 100, 200, 300)';
					} else {
						updatedRow.validationError = '';
					}
				}
				
				// Calculate total amount
				updatedRow.totalAmount = quantity * price;
			}
			
			next[index] = updatedRow;
			return next;
		});
	};

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [toast, setToast] = useState<{type: 'success' | 'error', title: string, message: string} | null>(null);

	// Auto-populate security from URL params
	useEffect(() => {
		const security = searchParams.get('security');
		const editId = searchParams.get('edit');
		
		if (security) {
			setOrderRows([{
				security: security,
				quantity: "",
				price: "",
			}]);
		}
		
		if (editId) {
			fetchOrderForEdit(editId);
		}
	}, [searchParams]);

	// Check if we're in edit mode
	const editOrderId = searchParams.get('edit');
	const isEditMode = !!editOrderId;

	// Load current user details when ordering for self
	useEffect(() => {
		if (orderFor === 'self' && user) {
			fetchUserDetails(user.id);
		}
	}, [orderFor, user]);

	// Refresh portfolio when order type or client changes
	useEffect(() => {
		fetchUserPortfolio();
	}, [orderFor, selectedClient]);

	// Fetch clients for managers/tellers
	useEffect(() => {
		if ((user?.role === 'MANAGER' || user?.role === 'TELLER') && orderFor === 'client') {
			fetchClients();
		}
	}, [user?.role, orderFor]);

	// Fetch securities
	useEffect(() => {
		fetchSecurities();
	}, []);

	// Fetch user portfolio
	useEffect(() => {
		if (user?.id) {
			fetchUserPortfolio();
		}
	}, [user?.id]);

	const fetchUserDetails = async (userId: string) => {
		try {
			const response = await fetch(`/api/user/${userId}`);
			if (response.ok) {
				const { data } = await response.json();
				setClientFields({
					clientName: data.fullName || '',
					csdNumber: data.csdNumber || '',
					phone: data.phone || '',
					email: data.email || '',
					address: `${data.city || ''}, ${data.country || ''}`.replace(/^, |, $/, '')
				});
			}
		} catch (error) {
			console.error('Error fetching user details:', error);
		}
	};

	const fetchClients = async () => {
		try {
			const response = await fetch('/api/user?role=CLIENT&forTrade=true');
			if (response.ok) {
				const { data } = await response.json();
				setClients(data || []);
			}
		} catch (error) {
			console.error('Error fetching clients:', error);
		}
	};

	const fetchSecurities = async () => {
		try {
			const response = await fetch('/api/securities');
			if (response.ok) {
				const { data } = await response.json();
				setSecurities(data || []);
			}
		} catch (error) {
			console.error('Error fetching securities:', error);
		}
	};

	const fetchUserPortfolio = async () => {
		try {
			const userId = orderFor === 'self' ? user?.id : selectedClient?.id;
			if (!userId) return;
			
			const response = await fetch(`/api/portfolio/${userId}`);
			if (response.ok) {
				const { data } = await response.json();
				setUserPortfolio(data || []);
			}
		} catch (error) {
			console.error('Error fetching user portfolio:', error);
		}
	};

	const fetchOrderForEdit = async (orderId: string) => {
		try {
			const response = await fetch(`/api/forms/SaleOrderForm/${orderId}`);
			if (response.ok) {
				const { data } = await response.json();
				
				// Fill client fields
				setClientFields({
					clientName: data.clientName || '',
					csdNumber: data.csdNumber || '',
					phone: data.phone || '',
					email: data.email || '',
					address: data.address || ''
				});
				
				// Fill order preferences
				setBestMarketPrice(data.bestMarketPrice || false);
				setPriceLimit(data.priceLimit || false);
				setWithinTimeLimit(data.withinTimeLimitNote || '');
				setBankName(data.bankName || '');
				setBankBranch(data.bankBranch || '');
				setAccountNumber(data.accountNumber || '');
				
				// Fill order items
				if (data.SaleOrderItem && data.SaleOrderItem.length > 0) {
					const orderItems = data.SaleOrderItem.map((item: any) => ({
						security: item.security || '',
						quantity: item.quantity?.toString() || '',
						price: item.price?.toString() || ''
					}));
					setOrderRows(orderItems);
				}
				
				setTermsAccepted(true);
			}
		} catch (error) {
			console.error('Error fetching order for edit:', error);
		}
	};

	const handleClientSelect = (client: any) => {
		setSelectedClient(client);
		setClientFields({
			clientName: client.fullName || '',
			csdNumber: client.csdNumber || '',
			phone: client.phone || '',
			email: client.email || '',
			address: `${client.city || ''}, ${client.country || ''}`.replace(/^, |, $/, '')
		});
		setClientSearch(client.fullName || '');
		setShowClientDropdown(false);
	};

	const handleSecuritySelect = (index: number, security: any) => {
		const availableShares = getAvailableShares(security.name);
		setOrderRows(prev => {
			const next = [...prev];
			next[index] = { 
				...next[index], 
				security: security.name, 
				price: security.price.toString(),
				availableShares,
				validationError: '',
				totalAmount: 0
			};
			return next;
		});
		setShowSecurityDropdown(prev => ({ ...prev, [index]: false }));
	};

	const getAvailableShares = (securityName: string): number => {
		const portfolioItem = userPortfolio.find(item => item.security === securityName);
		return portfolioItem ? portfolioItem.quantity : 0;
	};

	const filteredClients = clients.filter(client => 
		client.fullName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
		client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
		client.csdNumber?.toLowerCase().includes(clientSearch.toLowerCase())
	);

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
			// Validate order rows
			const hasValidationErrors = orderRows.some(row => row.validationError);
			if (hasValidationErrors) {
				setToast({type: 'error', title: 'Validation Error', message: 'Please fix the quantity errors before submitting.'});
				return;
			}

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
				items: validItems,
				orderFor,
				clientId: orderFor === 'self' ? user?.id : selectedClient?.id,
				userId: orderFor === 'self' ? user?.id : selectedClient?.id
			};

			console.log('🔍 Sale Order Payload:', {
				orderFor,
				currentUserId: user?.id,
				currentUserRole: user?.role,
				selectedClientId: selectedClient?.id,
				selectedClientName: selectedClient?.fullName,
				payloadUserId: payload.userId,
				payloadClientId: payload.clientId
			});

			const apiUrl = isEditMode 
				? `/api/forms/SaleOrderForm/${editOrderId}`
				: '/api/forms/SaleOrderForm';
			const method = isEditMode ? 'PATCH' : 'POST';

			const response = await fetch(apiUrl, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload)
			});

			if (response.ok) {
				const result = await response.json();
				console.log('✅ Sale Order Created:', {
					orderId: result.id,
					orderUserId: result.userId,
					expectedUserId: payload.userId,
					userIdMatch: result.userId === payload.userId
				});
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
		<DashboardLayout>
			<div className="px-4 pb-16">
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
						<h2 className="text-xl font-semibold text-slate-900">Order Details</h2>
						<p className="mt-1 text-sm text-slate-600">
							Specify who this order is for and provide the necessary details.
						</p>
					</header>

					{(user?.role === 'MANAGER' || user?.role === 'TELLER') && (
						<div className="mb-6 space-y-4">
							<div className="flex gap-4">
								<label className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
									orderFor === 'self' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
								}`}>
									<input
										type="radio"
										name="orderFor"
										value="self"
										checked={orderFor === 'self'}
										onChange={(e) => setOrderFor(e.target.value as 'self' | 'client')}
										className="text-rose-600 focus:ring-rose-500"
									/>
									<span className="text-sm font-medium">Order for Myself</span>
								</label>
								<label className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
									orderFor === 'client' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
								}`}>
									<input
										type="radio"
										name="orderFor"
										value="client"
										checked={orderFor === 'client'}
										onChange={(e) => setOrderFor(e.target.value as 'self' | 'client')}
										className="text-rose-600 focus:ring-rose-500"
									/>
									<span className="text-sm font-medium">Order for Client</span>
								</label>
							</div>

							{orderFor === 'client' && (
								<div className="relative">
									<div className="space-y-2">
										<label className="block text-sm font-medium text-[#004B5B]">
											Search and Select Client <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={clientSearch}
											onChange={(e) => {
												setClientSearch(e.target.value);
												setShowClientDropdown(true);
											}}
											onFocus={() => setShowClientDropdown(true)}
											placeholder="Type client name, email, or CSD number..."
											required
											className="w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80 transition-all"
										/>
									</div>
									{showClientDropdown && filteredClients.length > 0 && (
										<div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
											{filteredClients.map((client) => (
												<div
													key={client.id}
													onClick={() => handleClientSelect(client)}
													className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
												>
													<div className="font-medium text-sm">{client.fullName}</div>
													<div className="text-xs text-slate-600">{client.email}</div>
													{client.csdNumber && <div className="text-xs text-slate-500">CSD: {client.csdNumber}</div>}
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>
					)}

					<div className="border-t border-slate-200 pt-6">
						<h3 className="text-lg font-semibold text-slate-900 mb-4">
							{orderFor === 'self' ? 'My Details' : 'Client Details'}
						</h3>

						<div className="grid gap-6 md:grid-cols-2">
							<div className="space-y-2">
								<label className="block text-sm font-medium text-[#004B5B]">
									{orderFor === 'self' ? 'My Name' : 'Client Names'} <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={clientFields.clientName}
									onChange={handleClientChange("clientName")}
									placeholder="e.g. John Doe"
									readOnly={orderFor === 'client' && selectedClient}
									required
									className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
										orderFor === 'client' && selectedClient ? 'border-gray-300 bg-gray-50' : 'border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80'
									}`}
								/>
							</div>
							<div className="space-y-2">
								<label className="block text-sm font-medium text-[#004B5B]">
									CSD Number
								</label>
								<input
									type="text"
									value={clientFields.csdNumber}
									onChange={handleClientChange("csdNumber")}
									placeholder="e.g. CSD123456"
									readOnly={orderFor === 'client' && selectedClient}
									className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
										orderFor === 'client' && selectedClient ? 'border-gray-300 bg-gray-50' : 'border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80'
									}`}
								/>
							</div>
							<div className="space-y-2">
								<label className="block text-sm font-medium text-[#004B5B]">
									Telephone Number <span className="text-red-500">*</span>
								</label>
								<input
									type="tel"
									value={clientFields.phone}
									onChange={handleClientChange("phone")}
									placeholder="e.g. +250 700 000 000"
									readOnly={orderFor === 'client' && selectedClient}
									required
									className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
										orderFor === 'client' && selectedClient ? 'border-gray-300 bg-gray-50' : 'border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80'
									}`}
								/>
							</div>
							<div className="space-y-2">
								<label className="block text-sm font-medium text-[#004B5B]">
									Email Address
								</label>
								<input
									type="email"
									value={clientFields.email}
									onChange={handleClientChange("email")}
									placeholder="e.g. john@example.com"
									readOnly={orderFor === 'client' && selectedClient}
									className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
										orderFor === 'client' && selectedClient ? 'border-gray-300 bg-gray-50' : 'border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80'
									}`}
								/>
							</div>
							<div className="md:col-span-2">
								<div className="space-y-2">
									<label className="block text-sm font-medium text-[#004B5B]">
										Physical Address
									</label>
									<input
										type="text"
										value={clientFields.address}
										onChange={handleClientChange("address")}
										placeholder="House, Street, City"
										readOnly={orderFor === 'client' && selectedClient}
										className={`w-full rounded-full px-4 py-2 text-[#004B5B] bg-transparent outline-none border transition-all ${
											orderFor === 'client' && selectedClient ? 'border-gray-300 bg-gray-50' : 'border-[#004B5B]/50 focus:border-[#004B5B] hover:border-[#004B5B]/80'
										}`}
									/>
								</div>
							</div>
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
											<div className="relative">
												<input
													type="text"
													value={row.security}
													onChange={handleRowChange(index, "security")}
													onFocus={() => setShowSecurityDropdown(prev => ({ ...prev, [index]: true }))}
													placeholder="Select or type security name"
													className="w-full rounded-xl border border-[#004B5B]/40 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#004B5B] focus:ring-2 focus:ring-[#004B5B]/40"
												/>
												{showSecurityDropdown[index] && securities.length > 0 && (
													<div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
														{securities
															.filter(security => 
																security.name.toLowerCase().includes(row.security.toLowerCase()) ||
																security.symbol.toLowerCase().includes(row.security.toLowerCase())
															)
															.map((security) => (
																<div
																	key={security.symbol}
																	onClick={() => handleSecuritySelect(index, security)}
																	className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
																>
																	<div className="font-medium text-sm">{security.name}</div>
																	<div className="text-xs text-slate-600">{security.symbol} (Rwf {security.price} per share)</div>
																</div>
															))}
													</div>
												)}
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="space-y-2">
												<InputField
													name={`quantity-${index}`}
													label="Quantity"
													type="number"
													value={row.quantity}
													onChange={handleRowChange(index, "quantity")}
													placeholder="0"
												/>
												{row.security && (
													<div className="text-xs text-slate-600">
														Available: {row.availableShares || 0} shares
													</div>
												)}
												{row.validationError && (
													<div className="text-xs text-red-600">
														{row.validationError}
													</div>
												)}
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="space-y-2">
												<InputField
													name={`price-${index}`}
													label="Price"
													type="number"
													value={row.price}
													onChange={handleRowChange(index, "price")}
													placeholder="0.00"
												/>
												{(row.totalAmount || 0) > 0 && (
													<div className="text-xs text-green-600 font-medium">
														Total: Rwf {(row.totalAmount || 0).toLocaleString()}
													</div>
												)}
											</div>
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
			</div>
			{/* Click outside to close dropdown */}
			{(showClientDropdown || Object.values(showSecurityDropdown).some(Boolean)) && (
				<div 
					className="fixed inset-0 z-5" 
					onClick={() => {
						setShowClientDropdown(false);
						setShowSecurityDropdown({});
					}}
				/>
			)}
			{toast && (
				<Toast
					type={toast.type}
					title={toast.title}
					message={toast.message}
					onClose={() => setToast(null)}
				/>
			)}
		</DashboardLayout>
	);
}