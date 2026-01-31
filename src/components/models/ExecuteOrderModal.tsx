"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, TrendingUp } from "lucide-react";
import Portal from "@/components/ui/portal";
import Button from "@/components/ui/Button";

interface MarketOrder {
  id: string;
  clientName: string;
  company: string;
  type: string;
  quantity: number;
  price?: number;
}

interface ExecuteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MarketOrder | null;
  onOrderExecuted: (orderId: string) => void;
}

export default function ExecuteOrderModal({ isOpen, onClose, order, onOrderExecuted }: ExecuteOrderModalProps) {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [buyers, setBuyers] = useState<any[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [executedPrice, setExecutedPrice] = useState("");
  const [buyerSearch, setBuyerSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchBuyers();
      if (order?.price) {
        setExecutedPrice(order.price.toString());
      }
    }
  }, [isOpen, order]);

  const fetchBuyers = async () => {
    try {
      const response = await fetch('/api/user?role=CLIENT&forTrade=true');
      if (response.ok) {
        const { data } = await response.json();
        setBuyers(data || []);
      }
    } catch (error) {
      console.error('Error fetching buyers:', error);
    }
  };

  const filteredBuyers = buyers.filter(buyer => 
    buyer.fullName?.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    buyer.email?.toLowerCase().includes(buyerSearch.toLowerCase())
  );

  const handleExecute = async () => {
    if (!order || !selectedBuyer || !executedPrice) {
      setError("Please select a buyer and enter execution price");
      return;
    }

    setExecuting(true);
    setError("");

    try {
      const response = await fetch('/api/orders/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: order.id, 
          orderType: order.type,
          buyerId: selectedBuyer,
          executedPrice: parseFloat(executedPrice)
        })
      });

      const responseData = await response.json();

      if (response.ok) {
        onOrderExecuted(order.id);
        onClose();
      } else {
        setError(responseData.error || 'Failed to execute order');
      }
    } catch (error) {
      console.error('Error executing order:', error);
      setError('Network error occurred while executing order');
    } finally {
      setExecuting(false);
    }
  };

  const handleClose = () => {
    setError("");
    setSelectedBuyer("");
    setExecutedPrice("");
    setBuyerSearch("");
    onClose();
  };

  if (!isOpen || !order) return null;

  const selectedBuyerData = buyers.find(b => b.id === selectedBuyer);
  const totalAmount = order.quantity * parseFloat(executedPrice || "0");
  const fees = totalAmount * 0.0171;
  const totalWithFees = totalAmount + fees;

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
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Execute Sale Order</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Order Details</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Seller:</span> {order.clientName}</p>
                  <p><span className="font-medium">Company:</span> {order.company}</p>
                  <p><span className="font-medium">Quantity:</span> {order.quantity} shares</p>
                  <p><span className="font-medium">Requested Price:</span> Rwf {order.price || 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Buyer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyerSearch}
                    onChange={(e) => setBuyerSearch(e.target.value)}
                    placeholder="Search buyers..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {buyerSearch && filteredBuyers.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                      {filteredBuyers.map((buyer) => (
                        <div
                          key={buyer.id}
                          onClick={() => {
                            setSelectedBuyer(buyer.id);
                            setBuyerSearch(buyer.fullName);
                          }}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium text-sm">{buyer.fullName}</div>
                          <div className="text-xs text-gray-600">{buyer.email}</div>
                          <div className="text-xs text-green-600">Balance: Rwf {buyer.Wallet?.balance || 0}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Execution Price (per share) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={executedPrice}
                    onChange={(e) => setExecutedPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedBuyerData && executedPrice && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Transaction Summary</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Share Value: Rwf {totalAmount.toLocaleString()}</p>
                      <p>Broker Fees (1.71%): Rwf {fees.toFixed(2)}</p>
                      <p className="font-medium">Total Cost: Rwf {totalWithFees.toLocaleString()}</p>
                      <p className="text-xs mt-2">
                        Buyer Balance: Rwf {selectedBuyerData.Wallet?.balance || 0}
                        {selectedBuyerData.Wallet?.balance < totalWithFees && (
                          <span className="text-red-600 ml-2">(Insufficient Balance)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={executing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecute}
                  disabled={executing || !selectedBuyer || !executedPrice || (selectedBuyerData?.Wallet?.balance < totalWithFees)}
                  className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
                >
                  {executing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Executing...
                    </>
                  ) : (
                    "Execute Trade"
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