import { z } from "zod";

export const tradeSchema = z.object({
  companySymbol: z.string().min(1, "Company symbol is required"),
  quantity: z.number().int().positive("Quantity must be positive").refine(
    (val) => val % 100 === 0,
    "Quantity must be in lots of 100"
  ),
  tradeType: z.enum(["BUY", "SELL"], {
    errorMap: () => ({ message: "Trade type must be BUY or SELL" })
  }),
  priceType: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
  limitPrice: z.number().positive().optional(),
  clientId: z.string().uuid().optional(),
}).refine(
  (data) => {
    if (data.priceType === "LIMIT" && !data.limitPrice) {
      return false;
    }
    return true;
  },
  {
    message: "Limit price is required for limit orders",
    path: ["limitPrice"]
  }
);

export type TradeInput = z.infer<typeof tradeSchema>;

export const validateTradePermissions = (
  userRole: string,
  clientId?: string,
  userId?: string
) => {
  // Clients can only trade for themselves
  if (userRole === "CLIENT") {
    if (clientId && clientId !== userId) {
      throw new Error("Clients can only trade for themselves");
    }
    return true;
  }

  // Tellers and managers must select a client
  if (["TELLER", "MANAGER"].includes(userRole)) {
    if (!clientId) {
      throw new Error("Client selection is required for tellers and managers");
    }
    return true;
  }

  throw new Error("Unauthorized role for trading");
};