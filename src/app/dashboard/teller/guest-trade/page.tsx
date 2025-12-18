"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import { useAuth } from "@/hooks/useAuth";

interface Security {
  symbol: string;
  name: string;
  price: number;
  availableShares?: string;
}

export default function GuestTradePage() {
  const { user, token } = useAuth();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedSecurity, setSelectedSecurity] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [securities, setSecurities] = useState<Security[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ show: false, message: "", type: "success" });

  const { displayName, email, dashboardRole } = useMemo(() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "Teller";
    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      dashboardRole: "teller" as const,
    };
  }, [user?.email, user?.fullName]);

  useEffect(() => {
    const fetchSecurities = async () => {
      try {
        const res = await fetch("/api/securities");
        if (res.ok) {
          const data = await res.json();
          setSecurities(data.data || []);
          if (data.data && data.data.length > 0) {
            setSelectedSecurity(data.data[0].symbol);
          }
        }
      } catch (error) {
        console.error("Error fetching securities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSecurities();
  }, []);

  const currentSecurity = securities.find((s) => s.symbol === selectedSecurity) || securities[0];
  const estimatedTotal = useMemo(() => {
    const qty = parseInt(quantity, 10) || 0;
    const price = currentSecurity?.price || 0;
    return qty * price;
  }, [quantity, currentSecurity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName || !clientPhone || !selectedSecurity || !quantity) {
      setToast({ show: true, message: "Please fill all required fields", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "error" }), 5000);
      return;
    }

    const qty = parseInt(quantity, 10);
    if (qty <= 0 || qty % 100 !== 0) {
      setToast({ show: true, message: "Quantity must be a positive multiple of 100", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "error" }), 5000);
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch("/api/teller/guest-trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientEmail,
          companySymbol: selectedSecurity,
          quantity: qty,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute trade");
      }

      setToast({ show: true, message: data.message || "Trade executed successfully", type: "success" });
      
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setQuantity("");
      setPaymentMethod("CASH");

      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 5000);

      const res = await fetch("/api/securities");
      if (res.ok) {
        const secData = await res.json();
        setSecurities(secData.data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute trade";
      setToast({ show: true, message: errorMessage, type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "error" }), 5000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-600">Guest Trading</h1>
          <p className="text-base text-gray-400">Buy shares for clients without accounts</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-700 mb-6">Client & Trade Information</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <InputField name="clientName" label="Client Full Name *" type="text" placeholder="John Doe" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                <InputField name="clientPhone" label="Client Phone *" type="tel" placeholder="+250 788 000 000" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} required />
              </div>

              <InputField name="clientEmail" label="Client Email (Optional)" type="email" placeholder="client@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Security *</label>
                <select value={selectedSecurity} onChange={(e) => setSelectedSecurity(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20" required>
                  {securities.map((sec) => (
                    <option key={sec.symbol} value={sec.symbol}>{sec.symbol} - {sec.name} (Rwf {sec.price})</option>
                  ))}
                </select>
              </div>

              {currentSecurity && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Security Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Symbol</p>
                      <p className="text-base font-bold text-gray-900">{currentSecurity.symbol}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Available Shares</p>
                      <p className="text-base font-bold text-gray-900">{currentSecurity.availableShares ? Number(currentSecurity.availableShares).toLocaleString() : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Share Price</p>
                      <p className="text-base font-bold text-gray-900">Rwf {currentSecurity.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <InputField name="quantity" label="Quantity (Multiples of 100) *" type="number" placeholder="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                <div className="mt-2 flex flex-wrap gap-2">
                  <p className="w-full text-xs text-gray-600 mb-1">Quick select:</p>
                  {[100, 200, 300, 500, 1000].map((qty) => (
                    <button key={qty} type="button" onClick={() => setQuantity(qty.toString())} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${quantity === qty.toString() ? "bg-[#004B5B] text-white" : "bg-gray-100 text-gray-700 hover:bg-[#004B5B] hover:text-white"}`}>{qty}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/20" required>
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Market Price</span>
                  <span className="font-semibold text-gray-900">Rwf {currentSecurity?.price || 0}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-semibold text-gray-900">{quantity || 0} shares</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between text-lg">
                  <span className="font-semibold text-gray-700">Total Amount</span>
                  <span className="font-bold text-gray-900">Rwf {estimatedTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex gap-3">
                  <svg className="h-5 w-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Guest Trading Rules</p>
                    <p className="text-blue-700">This feature allows you to buy shares for walk-in clients who don&apos;t have accounts. Ensure you collect payment before executing the trade.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600" disabled={processing || loading}>{processing ? "Processing..." : "Execute Guest Trade"}</Button>
                <Button type="button" variant="outline" onClick={() => { setClientName(""); setClientPhone(""); setClientEmail(""); setQuantity(""); }}>Reset</Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Instructions</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <p className="font-semibold text-gray-900 mb-1">1. Collect Client Information</p>
                <p>Get the client&apos;s full name and phone number. Email is optional.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">2. Select Security</p>
                <p>Choose the company shares the client wants to purchase.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">3. Enter Quantity</p>
                <p>Shares must be in multiples of 100 (100, 200, 300, etc.).</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">4. Collect Payment</p>
                <p>Ensure payment is received before executing the trade.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">5. Execute Trade</p>
                <p>Click the button to complete the transaction.</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Methods</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Cash</li>
                <li>• Mobile Money (MTN, Airtel)</li>
                <li>• Bank Transfer</li>
                <li>• Cheque</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      {toast.show && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-fadeInUp">
          <div className={`max-w-md rounded-xl shadow-2xl p-4 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {toast.type === "success" ? (
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="h-6 w-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${toast.type === "success" ? "text-emerald-900" : "text-rose-900"}`}>{toast.message}</p>
              </div>
              <button onClick={() => setToast({ show: false, message: "", type: "success" })} className={toast.type === "success" ? "text-emerald-600" : "text-rose-600"}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
