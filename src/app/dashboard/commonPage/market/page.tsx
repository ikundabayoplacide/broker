"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import TradeModal from "@/components/models/TradeModal";
import DeleteOrderModal from "@/components/models/DeleteOrderModal";
import CancelOrderModal from "@/components/models/CancelOrderModal";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";

interface MarketOrder {
  id: string;
  clientName: string;
  phone: string;
  type: string;
  company: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  status: string;
  userId?: string;
  approved?: boolean;
}

export default function MarketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6;
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    order: MarketOrder | null;
    tradeType: "BUY" | "SELL";
  }>({ isOpen: false, order: null, tradeType: "BUY" });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    order: MarketOrder | null;
  }>({ isOpen: false, order: null });
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    order: MarketOrder | null;
  }>({ isOpen: false, order: null });

  const { displayName, email, dashboardRole } = useMemo(() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "User";

    return {
      displayName: fullName || fallbackName,
      email: user?.email ?? "Not provided",
      dashboardRole: (user?.role || "client") as "client" | "teller" | "admin" | "manager" | "super-admin" | "company",
    };
  }, [user?.email, user?.fullName, user?.role]);

  useEffect(() => {
    fetchMarketOrders();
  }, []);

  const fetchMarketOrders = async () => {
    try {
      setLoading(true);
      
      const [sellOrdersResponse, purchaseOrdersResponse] = await Promise.all([
        fetch('/api/forms/SaleOrderForm'),
        fetch('/api/forms/PurchaseOrderForm')
      ]);
      
      const sellOrdersData = sellOrdersResponse.ok ? (await sellOrdersResponse.json()).data || [] : [];
      const purchaseOrdersData = purchaseOrdersResponse.ok ? (await purchaseOrdersResponse.json()).data || [] : [];
      
      const transformedSellOrders = sellOrdersData.flatMap((order: any) => 
        order.SaleOrderItem?.map((item: any, index: number) => ({
          id: `SO-${order.id}-${index + 1}`,
          clientName: order.clientName || 'Unknown',
          phone: order.phone || 'N/A',
          type: 'SELL',
          company: item.security || 'Unknown Security',
          quantity: item.quantity,
          price: Number(item.price || 0),
          total: Number(item.quantity || 0) * Number(item.price || 0),
          date: order.createdAt,
          status: order.status,
          userId: order.userId,
          approved: false
        } as MarketOrder)) || []
      );
      
      const transformedPurchaseOrders = purchaseOrdersData.flatMap((order: any) => 
        order.PurchaseOrderItem?.map((item: any, index: number) => ({
          id: `PO-${order.id}-${index + 1}`,
          clientName: order.clientName || 'Unknown',
          phone: order.phone || 'N/A',
          type: 'BUY',
          company: item.security || 'Unknown Security',
          quantity: item.quantity,
          price: Number(item.price || 0),
          total: Number(item.quantity || 0) * Number(item.price || 0),
          date: order.createdAt,
          status: order.status,
          userId: order.userId,
          approved: false
        } as MarketOrder)) || []
      );
      
      const allOrders = [...transformedSellOrders, ...transformedPurchaseOrders]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching market orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm flex items-center gap-1">
            <FiClock className="w-3 h-3" />
            Pending
          </span>
        );
      case "PROCESS":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
            <FiRefreshCw className="w-3 h-3" />
            Processing
          </span>
        );
      case "EXECUTED":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
            <FiCheckCircle className="w-3 h-3" />
            Executed
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-1">
            <FiXCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "BUY" ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
        <FiTrendingUp className="w-3 h-3" />
        BUY
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
        <FiTrendingDown className="w-3 h-3" />
        SELL
      </span>
    );
  };

  const isMyOrder = (order: MarketOrder) => {
    return order.userId === user?.id;
  };

  const openTradeModal = (order: MarketOrder, tradeType: "BUY" | "SELL") => {
    setTradeModal({ isOpen: true, order, tradeType });
  };

  const closeTradeModal = () => {
    setTradeModal({ isOpen: false, order: null, tradeType: "BUY" });
  };

  const handleApprove = async (orderId: string, orderType: string) => {
    try {      
      const response = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderType })
      });

      const responseData = await response.json();
      if (response.ok) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: 'PROCESS', approved: true } : order
        ));
      } else {
        console.error('API call failed:', responseData);
      }
    } catch (error) {
      console.error('Error approving order:', error);
    }
  };

  const handleEdit = async (orderId: string, orderType: string) => {
    try {
      // Extract the actual order ID from the composite ID
      // Format: SO-{uuid}-{itemIndex} or PO-{uuid}-{itemIndex}
      let actualOrderId = orderId;
      if (orderId.startsWith('SO-')) {
        // Remove 'SO-' prefix and '-{itemIndex}' suffix
        actualOrderId = orderId.substring(3).split('-').slice(0, -1).join('-');
      } else if (orderId.startsWith('PO-')) {
        // Remove 'PO-' prefix and '-{itemIndex}' suffix
        actualOrderId = orderId.substring(3).split('-').slice(0, -1).join('-');
      }
      
      // Navigate to the appropriate form with the order ID for editing
      if (orderType === 'SELL') {
        router.push(`/dashboard/forms/SaleOrderForm?edit=${actualOrderId}`);
      } else if (orderType === 'BUY') {
        router.push(`/dashboard/forms/PurchaseOrderForm?edit=${actualOrderId}`);
      }
    } catch (error) {
      console.error('Error navigating to edit form:', error);
    }
  };

  const handleDelete = (orderId: string, orderType: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setDeleteModal({ isOpen: true, order });
    }
  };

  const handleOrderDeleted = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, order: null });
  };

  const handleCancel = (orderId: string, orderType: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setCancelModal({ isOpen: true, order });
    }
  };

  const handleOrderCancelled = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      // Extract actual order ID and determine order type
      let actualOrderId = orderId;
      let orderType = order.type;
      
      if (orderId.startsWith('SO-')) {
        actualOrderId = orderId.substring(3).split('-').slice(0, -1).join('-');
        orderType = 'SELL';
      } else if (orderId.startsWith('PO-')) {
        actualOrderId = orderId.substring(3).split('-').slice(0, -1).join('-');
        orderType = 'BUY';
      }
      
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: actualOrderId, orderType, status: 'REJECTED' })
      });

      if (response.ok) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: 'REJECTED' } : order
        ));
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const closeCancelModal = () => {
    setCancelModal({ isOpen: false, order: null });
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    const matchesType = filterType === "all" || order.type.toLowerCase() === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

  const stats = {
    pending: orders.filter((o) => o.status === "PENDING").length,
    processing: orders.filter((o) => o.status === "PROCESS").length,
    completed: orders.filter((o) => o.status === "EXECUTED").length,
    rejected: orders.filter((o) => o.status === "REJECTED").length,
    total: orders.length,
    sellOrders: orders.filter((o) => o.type === "SELL").length,
    purchaseOrders: orders.filter((o) => o.type === "BUY").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fadeInUp space-y-2 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-600">{dashboardRole === 'client' ? 'My Orders' : 'Market Overview'}</h1>
            <p className="text-base text-gray-400">
              {dashboardRole === 'client' 
                ? 'View and manage your trading orders and activity.' 
                : 'View all market orders and trading activity across the platform.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchMarketOrders}
            disabled={loading}
            className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-slideInRight">
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Total Orders</p>
                <p className="text-xl font-semibold text-gray-700">{stats.total}</p>
                <p className="text-sm text-gray-400">All orders</p>
              </div>
              <div className="w-11 h-11 gradient-primary rounded-full flex items-center justify-center">
                <FiFilter className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Sell Orders</p>
                <p className="text-xl font-semibold text-red-600">{stats.sellOrders}</p>
                <p className="text-sm text-gray-400">Market sells</p>
              </div>
              <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center">
                <FiTrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Purchase Orders</p>
                <p className="text-xl font-semibold text-green-600">{stats.purchaseOrders}</p>
                <p className="text-sm text-gray-400">Market buys</p>
              </div>
              <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Pending</p>
                <p className="text-xl font-semibold text-orange-600">{stats.pending}</p>
                <p className="text-sm text-gray-400">Awaiting</p>
              </div>
              <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center">
                <FiClock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Completed</p>
                <p className="text-xl font-semibold text-green-600">{stats.completed}</p>
                <p className="text-sm text-green-600">Executed</p>
              </div>
              <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Rejected</p>
                <p className="text-xl font-semibold text-red-600">{stats.rejected}</p>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
              <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-6 animate-fadeInUp">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by client, company, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004B5B] focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004B5B] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004B5B] focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="buy">Buy Orders</option>
              <option value="sell">Sell Orders</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200">
              <FiDownload className="w-4 h-4" />
              Export
            </Button>
          </div>
        </Card>

        {/* Market Orders Table */}
        <Card className="p-6 animate-fadeInUp">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Company</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Quantity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order, index) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm text-gray-600">{startIndex + index + 1}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{order.clientName}</p>
                        <p className="text-xs text-gray-600">{order.phone}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getTypeBadge(order.type)}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{order.company}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{order.quantity}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">Rwf {Number(order.price || 0).toFixed(2)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">Rwf {Number(order.total || 0).toLocaleString()}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">
                        {new Date(order.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.date).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                          <FiEye className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {(() => {
                           if (isMyOrder(order)) {
                            return order.status === 'PENDING' ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  className="text-sm hover:bg-blue-600 hover:text-white transition-all duration-200"
                                  onClick={() => handleEdit(order.id, order.type)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="text-sm hover:bg-red-600 hover:text-white transition-all duration-200"
                                  onClick={() => handleDelete(order.id, order.type)}
                                >
                                  Delete
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="text-sm hover:bg-orange-600 hover:text-white transition-all duration-200"
                                  onClick={() => handleCancel(order.id, order.type)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <span className="text-xl text-gray-500 px-2 py-1">
                                {order.status === 'EXECUTED' ? 'Executed' : 'Rocked'}
                              </span>
                            );
                          } else {
                            if ((dashboardRole.toLowerCase() === 'teller' || dashboardRole.toLowerCase() === 'manager') && order.status === 'PENDING') {
                              return (
                                <>
                                  <Button 
                                    variant="outline" 
                                    className="text-sm hover:bg-green-600 hover:text-white transition-all duration-200"
                                    onClick={() => handleApprove(order.id, order.type)}
                                  >
                                    Approve
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    disabled={true}
                                    className="text-sm opacity-50 cursor-not-allowed"
                                  >
                                    {order.type === 'SELL' ? 'Buy' : 'Sell'}
                                  </Button>
                                </>
                              );
                            } else if ((dashboardRole.toLowerCase() === 'teller' || dashboardRole.toLowerCase() === 'manager') && order.status === 'PROCESS') {
                              return (
                                <Button 
                                  variant="primary"
                                  className="text-sm hover:bg-green-600 hover:text-white transition-all duration-200"
                                  onClick={() => openTradeModal(order, order.type === 'SELL' ? 'BUY' : 'SELL')}
                                >
                                  {order.type === 'SELL' ? 'Buy' : 'Sell'}
                                </Button>
                              );
                            } else {
                              return (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  {order.status === 'EXECUTED' ? 'Executed' : 'Not Available'}
                                </span>
                              );
                            }
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading market orders...</p>
            </div>
          )}

          {!loading && paginatedOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No market orders found matching your criteria.</p>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-sm"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "primary" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className="text-sm w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      
      {/* Trade Modal */}
      {tradeModal.order && (
        <TradeModal
          isOpen={tradeModal.isOpen}
          onClose={closeTradeModal}
          order={tradeModal.order}
          tradeType={tradeModal.tradeType}
          currentUser={{
            role: dashboardRole,
            id: user?.id || "",
            name: displayName
          }}
        />
      )}
      
      {/* Delete Order Modal */}
      <DeleteOrderModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        order={deleteModal.order}
        onOrderDeleted={handleOrderDeleted}
      />
      
      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={cancelModal.isOpen}
        onClose={closeCancelModal}
        order={cancelModal.order}
        onOrderCancelled={handleOrderCancelled}
      />
    </DashboardLayout>
  );
}