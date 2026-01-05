"use client";

import { useMemo, useState, useEffect } from "react";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import Toast from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, CreditCard, Smartphone, Building2, Clock, Plus, Trash2, Loader2 } from "lucide-react";
import axios from "@/lib/axios";
import { isAxiosError } from "axios";

type TransactionType = "deposit" | "withdraw";
type PaymentMethodType = "MOBILE_MONEY" | "BANK_ACCOUNT" | "CREDIT_CARD";

interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  provider: string | null;
  accountNumber: string;
  accountName: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

interface WalletApiResponse {
  wallet: {
    balance: string;
    availableBalance: string;
    lockedBalance: string;
  };
  transactions: Transaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface PaymentMethodsResponse {
  paymentMethods: PaymentMethod[];
}

interface TransactionActionResponse {
  message: string;
  transaction: Transaction;
  newBalance?: string;
  status?: string;
}

export default function WalletPage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TransactionType>("deposit");
  const [amount, setAmount] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<{
    balance: string;
    availableBalance: string;
    lockedBalance: string;
  } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: "MOBILE_MONEY" as PaymentMethodType,
    provider: "",
    accountNumber: "",
    accountName: "",
  });
  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const transactionsPerPage = 10;
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: string; name: string }>({ show: false, id: "", name: "" });

  const { displayName, email, dashboardRole } = useMemo(() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "User";
    const role = user?.role?.toLowerCase();
    const dashboardRole =
      role === "client" || role === "teller" || role === "admin" || role === "company" 
        ? (role as "client" | "teller" | "admin" | "company") 
        : "client";
    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      dashboardRole,
    };
  }, [user?.email, user?.fullName, user?.role]);

  const isCompany = useMemo(() => dashboardRole === "company", [dashboardRole]);
  const apiPrefix = useMemo(() => isCompany ? "/company" : "", [isCompany]);

  // Fetch wallet data and payment methods on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (token) {
        await fetchWalletData();
        await fetchPaymentMethods();
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-refresh wallet when there are pending transactions
  useEffect(() => {
    const hasPending = transactions.some(t => t.status === "PENDING");
    if (!hasPending || !token) return;

    const interval = setInterval(() => {
      fetchWalletData();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, token]);

  const fetchWalletData = async (page = 1) => {
    setLoading(true);
    try {
      const offset = (page - 1) * transactionsPerPage;
      const data = (await axios.get(`${apiPrefix}/wallet?limit=${transactionsPerPage}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      })) as WalletApiResponse;
      setWalletData(data.wallet);
      setTransactions(data.transactions || []);
      setTotalPages(Math.ceil((data.pagination?.total || 0) / transactionsPerPage));
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const data = (await axios.get(`${apiPrefix}/wallet/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` },
      })) as PaymentMethodsResponse;
      setPaymentMethods(data.paymentMethods);
      // Auto-select the default payment method
      const defaultMethod = data.paymentMethods.find((m: PaymentMethod) => m.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      } else if (data.paymentMethods.length > 0) {
        setSelectedPaymentMethodId(data.paymentMethods[0].id);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${apiPrefix}/wallet/payment-methods`,
        {
          ...newPaymentMethod,
          isDefault: paymentMethods.length === 0, // Make first method default
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchPaymentMethods();
      setShowAddPaymentMethod(false);
      setNewPaymentMethod({
        type: "MOBILE_MONEY",
        provider: "",
        accountNumber: "",
        accountName: "",
      });
      setToast({
        show: true,
        type: "success",
        title: "Payment Method Added",
        message: `${newPaymentMethod.provider || "Payment method"} has been added successfully`,
      });
    } catch (error) {
      console.error("Error adding payment method:", error);
      setToast({
        show: true,
        type: "error",
        title: "Failed to Add Payment Method",
        message: "Could not add payment method. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async () => {
    try {
      await axios.delete(`${apiPrefix}/wallet/payment-methods?id=${deleteModal.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchPaymentMethods();
      setToast({
        show: true,
        type: "success",
        title: "Payment Method Deleted",
        message: "Payment method has been removed successfully",
      });
      setDeleteModal({ show: false, id: "", name: "" });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      setToast({
        show: true,
        type: "error",
        title: "Failed to Delete",
        message: "Could not delete payment method. Please try again.",
      });
    }
  };

  const checkPaymentStatus = async (transactionId: string) => {
    try {
      const response = await axios.post(
        "/wallet/check-payment",
        { transactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.status === "COMPLETED") {
        setToast({
          show: true,
          type: "success",
          title: "Payment Confirmed",
          message: response.data.message,
        });
        await fetchWalletData();
      } else if (response.data.status === "FAILED") {
        setToast({
          show: true,
          type: "error",
          title: "Payment Failed",
          message: response.data.message,
        });
        await fetchWalletData();
      } else {
        setToast({
          show: true,
          type: "success",
          title: "Still Pending",
          message: response.data.message,
        });
      }
    } catch (error) {
      setToast({
        show: true,
        type: "error",
        title: "Check Failed",
        message: "Could not check payment status",
      });
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentMethodId) {
      setToast({
        show: true,
        type: "error",
        title: "Payment Method Required",
        message: "Please select a payment method to continue",
      });
      return;
    }
    setLoading(true);
    try {
      const endpoint = activeTab === "deposit" ? `${apiPrefix}/wallet/deposit` : `${apiPrefix}/wallet/withdraw`;
      const data = (await axios.post(
        endpoint,
        {
          amount: parseFloat(amount),
          paymentMethodId: selectedPaymentMethodId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )) as TransactionActionResponse;
      
      // Show notification based on status
      if (data.status === "PENDING") {
        setToast({
          show: true,
          type: "success",
          title: "Payment Initiated",
          message: data.message || "Please complete payment on your phone. Your wallet will be updated automatically.",
        });
      } else {
        // Refresh wallet data for completed transactions
        await fetchWalletData();
        const actionText = activeTab === "deposit" ? "Deposited" : "Withdrawn";
        setToast({
          show: true,
          type: "success",
          title: `${actionText} Successfully!`,
          message: data.message || `${actionText} Rwf ${parseFloat(amount).toLocaleString()}`,
        });
      }
      
      setAmount("");
    } catch (error: unknown) {
      const actionText = activeTab === "deposit" ? "Deposit" : "Withdrawal";
      if (isAxiosError(error)) {
        setToast({
          show: true,
          type: "error",
          title: `${actionText} Failed`,
          message: error.response?.data?.error || `${actionText} could not be processed`,
        });
      } else {
        setToast({
          show: true,
          type: "error",
          title: `${actionText} Failed`,
          message: `${actionText} could not be processed`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "failed":
      case "cancelled":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case "MOBILE_MONEY":
        return <Smartphone className="h-4 w-4 md:h-5 md:w-5" />;
      case "BANK_ACCOUNT":
        return <Building2 className="h-4 w-4 md:h-5 md:w-5" />;
      case "CREDIT_CARD":
        return <CreditCard className="h-4 w-4 md:h-5 md:w-5" />;
    }
  };

  const formatPaymentMethodName = (type: PaymentMethodType) => {
    switch (type) {
      case "MOBILE_MONEY":
        return "Mobile Money";
      case "BANK_ACCOUNT":
        return "Bank Account";
      case "CREDIT_CARD":
        return "Credit Card";
    }
  };

  return (
    <DashboardLayout userRole={dashboardRole} userName={displayName} userEmail={email}>
      <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Wallet</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">Manage your funds and payment methods</p>
        </div>

        {/* Pending Transactions Alert */}
        {transactions.some(t => t.status === "PENDING") && (
          <Card className="p-4 bg-amber-50 border-amber-200" hover={false}>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800">Pending Transactions</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You have {transactions.filter(t => t.status === "PENDING").length} pending transaction(s). 
                  Complete payment on your phone or check status below.
                </p>
                <div className="mt-3 space-y-2">
                  {transactions.filter(t => t.status === "PENDING").slice(0, 3).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center gap-2">
                        {txn.type === "DEPOSIT" ? (
                          <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="text-sm font-medium">
                          {txn.type === "DEPOSIT" ? "Deposit" : "Withdraw"} Rwf {parseFloat(txn.amount).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => checkPaymentStatus(txn.id)}
                        className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full hover:bg-amber-600 transition-colors"
                      >
                        Check Status
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
          <Card className="p-3 md:p-6" hover={false}>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-600">Total Balance</p>
                {loading && !walletData ? (
                  <div className="animate-pulse bg-gray-200 h-6 md:h-8 w-20 md:w-24 rounded mt-1"></div>
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-slate-900">
                    Rwf {walletData ? (parseFloat(walletData.balance) + parseFloat(walletData.lockedBalance)).toLocaleString() : "0"}
                  </p>
                )}
              </div>
            </div>
          </Card>

           <Card className="p-3 md:p-6" hover={false}>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-600">Available Balance</p>
                {loading && !walletData ? (
                  <div className="animate-pulse bg-gray-200 h-6 md:h-8 w-20 md:w-24 rounded mt-1"></div>
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-slate-900">
                    Rwf {walletData ? parseFloat(walletData.balance).toLocaleString() : "0"}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-3 md:p-6" hover={false}>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-slate-600">Locked Balance</p>
                {loading && !walletData ? (
                  <div className="animate-pulse bg-gray-200 h-6 md:h-8 w-20 md:w-24 rounded mt-1"></div>
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-slate-900">
                    Rwf {walletData ? parseFloat(walletData.lockedBalance).toLocaleString() : "0"}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Transaction Form */}
          <Card className="p-3 md:p-6 lg:col-span-2" hover={false}>
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Manage Funds</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">Add or withdraw money from your wallet</p>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-2 md:gap-3 mb-4 md:mb-6">
              <button
                onClick={() => setActiveTab("deposit")}
                className={`flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
                  activeTab === "deposit"
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ArrowDownToLine className="h-4 w-4 md:h-5 md:w-5" />
                Deposit
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
                  activeTab === "withdraw"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ArrowUpFromLine className="h-4 w-4 md:h-5 md:w-5" />
                Withdraw
              </button>
            </div>

            <form onSubmit={handleTransaction} className="space-y-4 md:space-y-6">
              {/* Amount Input */}
              <InputField
                name="amount"
                label={`${activeTab === "deposit" ? "Deposit" : "Withdrawal"} Amount (Rwf)`}
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 md:mb-3">
                  Select Payment Method
                </label>
                {paymentMethods.length > 0 ? (
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPaymentMethodId === method.id
                            ? "border-[#004B5B] bg-[#004B5B]/5"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg ${
                              method.type === "MOBILE_MONEY" ? "bg-purple-100" :
                              method.type === "BANK_ACCOUNT" ? "bg-amber-100" : "bg-blue-100"
                            } flex items-center justify-center`}>
                              {getPaymentMethodIcon(method.type)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {method.provider || formatPaymentMethodName(method.type)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {method.accountNumber}
                              </p>
                            </div>
                          </div>
                          {method.isDefault && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No payment methods added yet. Please add one below.
                  </p>
                )}
              </div>

              {/* Transaction Summary */}
              <div className="rounded-xl md:rounded-2xl bg-slate-50 p-3 md:p-4 space-y-2 md:space-y-3">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-slate-600">Amount</span>
                  <span className="font-semibold text-slate-900">Rwf {amount || "0"}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-slate-600">Fee</span>
                  <span className="font-semibold text-slate-900">Rwf 0</span>
                </div>
                <div className="pt-2 md:pt-3 border-t border-slate-200 flex justify-between text-base md:text-lg">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-bold text-slate-900">Rwf {amount || "0"}</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className={`w-full text-sm md:text-base ${
                  activeTab === "deposit" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600"
                }`}
                disabled={loading || !amount || parseFloat(amount) < 100 || !selectedPaymentMethodId}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  activeTab === "deposit" ? "Deposit Funds" : "Withdraw Funds"
                )}
              </Button>
            </form>
          </Card>

          {/* Saved Payment Methods */}
          <Card className="p-3 md:p-6" hover={false}>
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Payment Methods</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">Manage your payment methods</p>
            </div>

            {!showAddPaymentMethod ? (
              <>
                <div className="space-y-2 md:space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="p-3 md:p-4 rounded-lg md:rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 md:gap-3 flex-1">
                          <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg ${
                            method.type === "MOBILE_MONEY" ? "bg-purple-100" :
                            method.type === "BANK_ACCOUNT" ? "bg-amber-100" : "bg-blue-100"
                          } flex items-center justify-center shrink-0`}>
                            {getPaymentMethodIcon(method.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm md:text-base font-semibold text-slate-900">
                              {method.provider || formatPaymentMethodName(method.type)}
                            </p>
                            <p className="text-xs md:text-sm text-slate-500">{method.accountNumber}</p>
                            {method.isDefault && (
                              <span className="inline-block mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteModal({ show: true, id: method.id, name: method.provider || formatPaymentMethodName(method.type) })}
                          className="text-rose-600 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-3 md:mt-4 text-xs md:text-sm hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
                  onClick={() => setShowAddPaymentMethod(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Method
                </Button>
              </>
            ) : (
              <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select
                    value={newPaymentMethod.type}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value as PaymentMethodType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#004B5B] focus:border-transparent"
                  >
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_ACCOUNT">Bank Account</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>

                <InputField
                    name="provider"
                    label="Provider (e.g., MTN, Bank of Kigali)"
                    value={newPaymentMethod.provider}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, provider: e.target.value })}
                    required type={""}                />

                <InputField
                    name="accountNumber"
                    label={newPaymentMethod.type === "MOBILE_MONEY" ? "Phone Number" : "Account Number"}
                    value={newPaymentMethod.accountNumber}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, accountNumber: e.target.value })}
                    required type={""}                />

                <InputField
                    name="accountName"
                    label="Account Name (Optional)"
                    value={newPaymentMethod.accountName}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, accountName: e.target.value })} type={""}                />

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Method
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddPaymentMethod(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-3 md:p-6" hover={false}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Recent Transactions</h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">Your latest wallet activity</p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-3 md:mx-0">
            <div className="inline-block min-w-full align-middle px-3 md:px-0">
              <div className="overflow-hidden">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004B5B] mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading transactions...</p>
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 text-xs md:text-sm font-semibold text-slate-700">Transaction ID</th>
                        <th className="text-left py-3 px-2 text-xs md:text-sm font-semibold text-slate-700">Type</th>
                        <th className="text-left py-3 px-2 text-xs md:text-sm font-semibold text-slate-700 hidden sm:table-cell">Method</th>
                        <th className="text-right py-3 px-2 text-xs md:text-sm font-semibold text-slate-700">Amount</th>
                        <th className="text-left py-3 px-2 text-xs md:text-sm font-semibold text-slate-700">Status</th>
                        <th className="text-left py-3 px-2 text-xs md:text-sm font-semibold text-slate-700 hidden md:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions?.map((txn, index) => (
                        <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 md:py-4 px-2 text-xs md:text-sm font-medium text-slate-900">{index + 1}</td>
                          <td className="py-3 md:py-4 px-2">
                            <div className="flex items-center gap-1 md:gap-2">
                              {txn.type === "DEPOSIT" ? (
                                <>
                                  <ArrowDownToLine className="h-3 w-3 md:h-4 md:w-4 text-emerald-600" />
                                  <span className="text-xs md:text-sm text-slate-900">Deposit</span>
                                </>
                              ) : txn.type === "WITHDRAW" ? (
                                <>
                                  <ArrowUpFromLine className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                                  <span className="text-xs md:text-sm text-slate-900">Withdraw</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpFromLine className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
                                  <span className="text-xs md:text-sm text-slate-900">{txn.type.replace('_', ' ')}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 md:py-4 px-2 text-xs md:text-sm text-slate-600 hidden sm:table-cell">{txn.paymentMethod || "N/A"}</td>
                          <td className={`text-right py-3 md:py-4 px-2 text-xs md:text-sm font-semibold whitespace-nowrap ${
                            txn.type === "DEPOSIT" ? "text-emerald-600" : "text-blue-600"
                          }`}>
                            {txn.type === "DEPOSIT" ? "+" : "-"}Rwf {parseFloat(txn.amount).toLocaleString()}
                          </td>
                          <td className="py-3 md:py-4 px-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(txn.status)}`}>
                                {txn.status.toLowerCase()}
                              </span>
                              {txn.status === "PENDING" && (
                                <button
                                  onClick={() => checkPaymentStatus(txn.id)}
                                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                >
                                  Check
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 md:py-4 px-2 text-xs md:text-sm text-slate-600 whitespace-nowrap hidden md:table-cell">
                            {new Date(txn.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {(!transactions || transactions.length === 0) && !loading && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                            No transactions yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 md:px-0 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchWalletData(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-xs md:text-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchWalletData(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-xs md:text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Toast Notification */}
      {toast?.show && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, id: "", name: "" })}
        onConfirm={handleDeletePaymentMethod}
        title="Delete Payment Method"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </DashboardLayout>
  );
}
