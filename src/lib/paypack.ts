import axios, { AxiosError, AxiosInstance } from "axios";

interface PaypackCredentials {
  clientId: string;
  clientSecret: string;
}

interface PaypackAuthResponse {
  access: string;
  refresh: string;
  expires: number; // unix timestamp (seconds)
}

export interface PaypackCashInRequest {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
  currency?: string;
}

export interface PaypackCashOutRequest {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
  currency?: string;
}

export interface PaypackTransactionDetails {
  ref: string;
  status: string;
  amount: number;
  number: string;
  currency?: string;
  description?: string;
  processor_message?: string;
  processed_at?: string;
  [key: string]: unknown;
}

class PaypackError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "PaypackError";
  }
}

type PaypackTokens = {
  access: string;
  refresh: string;
  expiresAt: number;
};

export class PaypackClient {
  private axios: AxiosInstance;
  private credentials: PaypackCredentials;
  private tokens: PaypackTokens | null = null;

  constructor(baseURL: string, credentials: PaypackCredentials) {
    this.credentials = credentials;
    this.axios = axios.create({
      baseURL,
      headers: {
        Accept: "application/json",
      },
      timeout: 30000,
    });
  }

  private tokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt;
  }

  private async authorize(): Promise<void> {
    const { clientId, clientSecret } = this.credentials;

    if (!clientId || !clientSecret) {
      throw new PaypackError("Missing Paypack credentials. Set PAYPACK_APP_ID and PAYPACK_APP_SECRET.");
    }

    const { data } = await this.axios.post<PaypackAuthResponse>(
      "/auth/agents/authorize",
      {
        client_id: clientId,
        client_secret: clientSecret,
      }
    );

    this.tokens = {
      access: data.access,
      refresh: data.refresh,
      expiresAt: data.expires ? data.expires * 1000 : Date.now() + 5 * 60 * 1000,
    };
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh) {
      await this.authorize();
      return;
    }

    try {
      const { data } = await this.axios.get<PaypackAuthResponse>(
        `/auth/agents/refresh/${this.tokens.refresh}`
      );

      this.tokens = {
        access: data.access,
        refresh: data.refresh,
        expiresAt: data.expires ? data.expires * 1000 : Date.now() + 5 * 60 * 1000,
      };
    } catch (_error) {
      // If refresh fails fall back to authorize
      await this.authorize();
    }
  }

  private async ensureAccessToken(): Promise<void> {
    if (!this.tokens) {
      await this.authorize();
      return;
    }

    if (this.tokenExpired()) {
      await this.refreshToken();
    }
  }

  private async request<T>(config: Parameters<AxiosInstance["request"]>[0]): Promise<T> {
    try {
      await this.ensureAccessToken();
      const response = await this.axios.request<T>({
        ...config,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.tokens?.access ?? ""}`,
          ...(config.headers ?? {}),
        },
      });
      return response.data;
    } catch (error) {
      // Log detailed error information
      if (error instanceof AxiosError) {
        console.error("Paypack API Error Details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
      }
      
      const message = error instanceof AxiosError
        ? error.response?.data?.message || error.message
        : "Paypack request failed";
      throw new PaypackError(message, error);
    }
  }

  async cashIn(payload: PaypackCashInRequest): Promise<PaypackTransactionDetails> {
    const requestData = {
      amount: Math.round(payload.amount),
      number: payload.phone,
    };
    
    console.log("Paypack cashIn - Sending request:", {
      url: "/transactions/cashin",
      method: "POST",
      data: requestData,
      hasToken: !!this.tokens?.access,
    });
    
    return this.request<PaypackTransactionDetails>({
      url: "/transactions/cashin",
      method: "POST",
      data: requestData,
    });
  }

  async cashOut(payload: PaypackCashOutRequest): Promise<PaypackTransactionDetails> {
    return this.request<PaypackTransactionDetails>({
      url: "/transactions/cashout",
      method: "POST",
      data: {
        amount: Math.round(payload.amount),
        number: payload.phone,
        client_ref: payload.reference,
        description: payload.description,
        currency: payload.currency ?? "RWF",
      },
    });
  }

  async findTransaction(reference: string): Promise<PaypackTransactionDetails> {
    return this.request<PaypackTransactionDetails>({
      url: `/transactions/find/${reference}`,
      method: "GET",
    });
  }

  verifyWebhookSignature(signature: string | undefined, payload: string): boolean {
    void signature;
    void payload;
    // TODO: add HMAC verification once Paypack shares the signing secret.
    return true;
  }

  public static isSuccessful(status?: string): boolean {
    if (!status) return true;
    const normalized = status.toUpperCase();
    return ["SUCCESS", "SUCCEEDED", "COMPLETED"].includes(normalized);
  }

  public static isFailed(status?: string): boolean {
    if (!status) return false;
    const normalized = status.toUpperCase();
    return ["FAILED", "DECLINED", "REJECTED"].includes(normalized);
  }
}

const baseURL = process.env.PAYPACK_BASE_URL ?? "https://payments.paypack.rw/api";

export const paypackClient = new PaypackClient(baseURL, {
  clientId: process.env.PAYPACK_APP_ID ?? "",
  clientSecret: process.env.PAYPACK_APP_SECRET ?? "",
});

export { PaypackError };
