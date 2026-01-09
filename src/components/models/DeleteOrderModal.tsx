"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertTriangle } from "lucide-react";
import Portal from "@/components/ui/portal";
import Button from "@/components/ui/Button";

interface MarketOrder {
  id: string;
  clientName: string;
  company: string;
  type: string;
}

interface DeleteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MarketOrder | null;
  onOrderDeleted: (orderId: string) => void;
}

export default function DeleteOrderModal({ isOpen, onClose, order, onOrderDeleted }: DeleteOrderModalProps) {
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteSubmit = async () => {
    if (!order) return;

    setDeleteSubmitting(true);
    setDeleteError("");

    try {
      const response = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, orderType: order.type })
      });

      const responseData = await response.json();

      if (response.ok) {
        onOrderDeleted(order.id);
        onClose();
      } else {
        setDeleteError(responseData.message || responseData.error || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      setDeleteError('Network error occurred while deleting order');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleClose = () => {
    setDeleteError("");
    onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">Delete Order</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-3">
                  You are about to permanently delete the {order.type.toLowerCase()} order for{" "}
                  <span className="font-semibold text-gray-900">{order.clientName}</span> at{" "}
                  <span className="font-semibold text-gray-900">{order.company}</span>.
                </p>
                <p className="mb-4 text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteSubmit}
                  disabled={deleteSubmitting}
                  className="bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300"
                >
                  {deleteSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Order"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}