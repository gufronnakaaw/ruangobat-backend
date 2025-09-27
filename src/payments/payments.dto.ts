import { z } from 'zod';

export const createPaymentSchema = z
  .object({
    order_id: z.string(),
    idempotency_key: z.string(),
  })
  .strict();

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;

export type XenditInvoiceWebhook =
  | {
      id: string;
      external_id: string;
      user_id: string;
      status: 'EXPIRED';
      merchant_name: string;
      amount: number;
      description: string;
      is_high: boolean;
      success_redirect_url: string;
      failure_redirect_url: string;
      created: string;
      updated: string;
      currency: string;
    }
  | {
      amount: number;
      bank_code?: string;
      created: string;
      currency: string;
      description: string;
      external_id: string;
      failure_redirect_url: string;
      id: string;
      is_high: boolean;
      merchant_name: string;
      paid_amount: number;
      paid_at: string;
      payment_channel: string;
      payment_destination?: string;
      payment_details?: {
        receipt_id: string;
        source: string;
      };
      payment_id: string;
      payment_method: string;
      payment_method_id?: string;
      status: 'PAID';
      success_redirect_url: string;
      updated: string;
      user_id: string;
    };
