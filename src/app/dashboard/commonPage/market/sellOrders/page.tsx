"use client";

import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import DeleteOrderModal from "@/components/models/DeleteOrderModal";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiRefreshCw,
  FiPlus,
} from "react-icons/fi";

interface Order {
  id: string;
  clientName: string;
  phone: string;
  company: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  status: string;
  userId?: string;
  type: string;
}

export default function SellOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    order: Order | null;
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
    fetchSellOrders();
  }, []);

  const fetchSellOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/forms/SaleOrderForm');
      const data = response.ok ? (await response.json()).data || [] : [];
      
      const transformedOrders = data.flatMap((order: any) => 
        order.SaleOrderItem?.map((item: any, index: number) => ({
          id: `SO-${order.id}-${index + 1}`,
          clientName: order.clientName || 'Unknown',
          phone: order.phone || 'N/A',
          company: item.security || 'Unknown Security',
          quantity: item.quantity,
          price: Number(item.price || 0),
          total: Number(item.quantity || 0) * Number(item.price || 0),
          date: order.createdAt,
          status: order.status,
          userId: order.userId,
          type: 'SELL'
        } as Order)) || []
      ).sort((a: Order, b: Order) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching sell orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMyOrder = (order: Order) => {
    return order.userId === user?.id;
  };

  const handleApprove = async (orderId: string, orderType: string) => {
    try {
      const response = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderType })
      });

      if (response.ok) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: 'PROCESS' } : order
        ));
      }
    } catch (error) {
      console.error('Error approving order:', error);
    }
  };

  const handleEdit = async (orderId: string, orderType: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderType })
      });

      if (response.ok) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: 'PROCESS' } : order
        ));
      }
    } catch (error) {
      console.error('Error editing order:', error);
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

  const handleCancel = async (orderId: string, orderType: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderType, action: 'cancel' })
      });

      if (response.ok) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: 'REJECTED' } : order
        ));
      }
    } catch (error) {
      console.error('Error canceling order:', error);
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: orders.filter((o) => o.status === "PENDING").length,
    processing: orders.filter((o) => o.status === "PROCESS").length,
    completed: orders.filter((o) => o.status === "EXECUTED").length,
    rejected: orders.filter((o) => o.status === "REJECTED").length,
    total: orders.length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fadeInUp space-y-2 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-600">{dashboardRole === 'client' ? 'My Sell Orders' : 'Sell Orders'}</h1>
            <p className="text-base text-gray-400">
              {dashboardRole === 'client' 
                ? 'View and manage your sell orders.' 
                : 'View and manage all sell orders in the market.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchSellOrders}
              disabled={loading}
              className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              className="flex items-center gap-2 bg-[#004B5B] text-white hover:bg-[#006B85] transition-all duration-200"
              onClick={() => router.push('/dashboard/forms/SaleOrderForm')}
            >
              <FiPlus className="w-4 h-4" />
              Create Order
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-slideInRight">
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Total Orders</p>
                <p className="text-xl font-semibold text-gray-700">{stats.total}</p>
                <p className="text-sm text-gray-400">{dashboardRole === 'client' ? 'Your sell orders' : 'All sell orders'}</p>
              </div>
              <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Pending</p>
                <p className="text-xl font-semibold text-orange-600">{stats.pending}</p>
                <p className="text-sm text-gray-400">Awaiting action</p>
              </div>
              <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center">
                <FiClock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Processing</p>
                <p className="text-xl font-semibold text-blue-600">{stats.processing}</p>
                <p className="text-sm text-blue-600">In progress</p>
              </div>
              <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center">
                <FiRefreshCw className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-500 mb-2">Executed</p>
                <p className="text-xl font-semibold text-green-600">{stats.completed}</p>
                <p className="text-sm text-green-600">Successfully executed</p>
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
                <p className="text-sm text-gray-400">Failed execution</p>
              </div>
              <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

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
              <option value="PROCESS">Processing</option>
              <option value="EXECUTED">Executed</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2 hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200">
              <FiDownload className="w-4 h-4" />
              Export
            </Button>
          </div>
        </Card>

        <Card className="p-6 animate-fadeInUp">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
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
                {filteredOrders.map((order, index) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm text-gray-600">{index + 1}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{order.clientName}</p>
                        <p className="text-xs text-gray-600">{order.phone}</p>
                      </div>
                    </td>
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
                            if (order.status === 'PENDING') {
                              return (
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
                              );
                            } else if (order.status === 'REJECTED') {
                              return (
                                <Button 
                                  variant="outline" 
                                  className="text-sm hover:bg-red-600 hover:text-white transition-all duration-200"
                                  onClick={() => handleDelete(order.id, order.type)}
                                >
                                  Delete
                                </Button>
                              );
                            } else if (order.status === 'EXECUTED') {
                              return (
                                <Button 
                                  variant="outline" 
                                  className="text-sm hover:bg-red-600 hover:text-white transition-all duration-200"
                                  onClick={() => handleDelete(order.id, order.type)}
                                >
                                  Delete
                                </Button>
                              );
                            } else {
                              return (
                                <span className="text-sm text-gray-500 px-2 py-1">
                                  Processing
                                </span>
                              );
                            }
                          } else {
                            if ((dashboardRole.toLowerCase() === 'teller' || dashboardRole.toLowerCase() === 'manager') && order.status === 'PENDING') {
                              return (
                                <Button 
                                  variant="outline" 
                                  className="text-sm hover:bg-green-600 hover:text-white transition-all duration-200"
                                  onClick={() => handleApprove(order.id, order.type)}
                                >
                                  Approve
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
              <p className="text-gray-500">Loading sell orders...</p>
            </div>
          )}

          {!loading && filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No sell orders found matching your criteria.</p>
            </div>
          )}
        </Card>
      </div>
      
      {/* Delete Order Modal */}
      <DeleteOrderModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        order={deleteModal.order}
        onOrderDeleted={handleOrderDeleted}
      />
    </DashboardLayout>
  );
}
