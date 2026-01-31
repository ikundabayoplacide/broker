"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle } from "lucide-react";
import Portal from "@/components/ui/portal";
import Button from "@/components/ui/Button";

interface MarketOrder {
  id: string;
  clientName: string;
  company: string;
  type: string;
}

interface ApproveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MarketOrder | null;
  onOrderApproved: (orderId: string) => void;
}

export default function ApproveOrderModal({ isOpen, onClose, order, onOrderApproved }: ApproveOrderModalProps) {
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [approveError, setApproveError] = useState("");

  const handleApproveSubmit = async () => {
    if (!order) return;

    setApproveSubmitting(true);
    setApproveError("");

    try {
      const response = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, orderType: order.type })
      });

      const responseData = await response.json();

      if (response.ok) {
        onOrderApproved(order.id);
        onClose();
      } else {
        setApproveError(responseData.message || responseData.error || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      setApproveError('Network error occurred while approving order');
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleClose = () => {
    setApproveError("");
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
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Approve Order</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-3">
                  You are about to approve the {order.type.toLowerCase()} order for{" "}
                  <span className="font-semibold text-gray-900">{order.clientName}</span> at{" "}
                  <span className="font-semibold text-gray-900">{order.company}</span>.
                </p>
                <p className="mb-4 text-green-600 font-medium">
                  This will move the order to processing status.
                </p>
              </div>

              {approveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {approveError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={approveSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveSubmit}
                  disabled={approveSubmitting}
                  className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
                >
                  {approveSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Approving...
                    </>
                  ) : (
                    "Approve Order"
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