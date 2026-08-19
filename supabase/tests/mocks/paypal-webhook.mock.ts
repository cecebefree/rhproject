// mocks/paypal-webhook.mock.ts
// PayPal webhook event mocks and signature helpers for testing

export interface PayPalOrderCompleted {
  id: string;
  intent: string;
  status: string;
  purchase_units: Array<{
    reference_id: string;
    custom_id: string;
    description: string;
    amount: {
      currency_code: string;
      value: string;
    };
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: PayPalOrderCompleted;
  create_time: string;
}

export function buildPayPalOrderCompleted(overrides: {
  lead_id: string;
  order_id?: string;
  capture_id?: string;
  currency?: string;
  amount?: string;
}): PayPalWebhookEvent {
  return {
    id: `wh_${Date.now()}`,
    event_type: "CHECKOUT.ORDER.COMPLETED",
    create_time: new Date().toISOString(),
    resource: {
      id: overrides.order_id || `order_${Date.now()}`,
      intent: "CAPTURE",
      status: "COMPLETED",
      purchase_units: [
        {
          reference_id: overrides.lead_id,
          custom_id: overrides.lead_id,
          description: "Registration: TestChild",
          amount: {
            currency_code: overrides.currency || "USD",
            value: overrides.amount || "50.00",
          },
          payments: {
            captures: [
              {
                id: overrides.capture_id || `capture_${Date.now()}`,
                status: "COMPLETED",
                amount: {
                  currency_code: overrides.currency || "USD",
                  value: overrides.amount || "50.00",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export function buildPayPalOrderApproved(overrides: {
  lead_id: string;
  order_id?: string;
}): PayPalWebhookEvent {
  return {
    id: `wh_${Date.now()}`,
    event_type: "CHECKOUT.ORDER.APPROVED",
    create_time: new Date().toISOString(),
    resource: {
      id: overrides.order_id || `order_${Date.now()}`,
      intent: "CAPTURE",
      status: "APPROVED",
      purchase_units: [
        {
          reference_id: overrides.lead_id,
          custom_id: overrides.lead_id,
          description: "Registration: TestChild",
          amount: {
            currency_code: "USD",
            value: "50.00",
          },
          payments: {
            captures: [],
          },
        },
      ],
    },
  };
}

// PayPal sandbox mode bypasses signature verification, so we just need
// to provide the required headers. In production, the signature is verified
// via PayPal's /v1/notifications/verify-webhook-signature API.
export function buildPayPalHeaders(
  overrides: Record<string, string> = {}
): Record<string, string> {
  return {
    "paypal-transmission-id": `tx_${Date.now()}`,
    "paypal-cert-url": "https://api-m.sandbox.paypal.com/v1/notifications/certs",
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-transmission-sig": "mock_signature",
    "paypal-transmission-time": String(Math.floor(Date.now() / 1000)),
    "paypal-live-mode": "false",
    ...overrides,
  };
}

// Mock PayPal Order API response
export function buildPayPalOrderResponse(overrides: { order_id?: string; approve_url?: string } = {}) {
  return {
    id: overrides.order_id || `order_${Date.now()}`,
    status: "CREATED",
    links: [
      {
        href: overrides.approve_url || `https://www.sandbox.paypal.com/checkoutnow?token=${overrides.order_id || "order_test"}`,
        rel: "approve",
        method: "GET",
      },
      {
        href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${overrides.order_id || "order_test"}`,
        rel: "self",
        method: "GET",
      },
    ],
  };
}
