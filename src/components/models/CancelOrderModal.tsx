"use client";

import { useState } from "react";
import { FiX, FiAlertTriangle } from "react-icons/fi";

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

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MarketOrder | null;
  onOrderCancelled: (orderId: string) => void;
}

export default function CancelOrderModal({
  isOpen,
  onClose,
  order,
  onOrderCancelled,
}: CancelOrderModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !order) return null;

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await onOrderCancelled(order.id);
      onClose();
    } catch (error) {
      console.error("Error cancelling order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm items-center justify-center  bg-opacity-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Are you sure you want to cancel this order? This action cannot be undone.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Client:</span>
              <span className="text-sm font-medium">{order.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Type:</span>
              <span className={`text-sm font-medium ${
                order.type === 'BUY' ? 'text-green-600' : 'text-red-600'
              }`}>
                {order.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Company:</span>
              <span className="text-sm font-medium">{order.company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Quantity:</span>
              <span className="text-sm font-medium">{order.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total:</span>
              <span className="text-sm font-medium">Rwf {order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Cancelling..." : "Cancel Order"}
          </button>
        </div>
      </div>
    </div>
  );
}