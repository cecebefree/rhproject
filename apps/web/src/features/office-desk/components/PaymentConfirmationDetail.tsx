import { useCallback, useEffect, useState } from "react";
import {
  type PaymentWithInvoice,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  getPaymentById,
  confirmPaymentManual,
  refundPayment,
  retryPayment,
} from "../services/supabase";

interface Props {
  paymentId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function PaymentConfirmationDetail({ paymentId, onClose, onRefresh }: Props) {
  const [payment, setPayment] = useState<PaymentWithInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showRetryForm, setShowRetryForm] = useState(false);
  const [retryToken, setRetryToken] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await getPaymentById(paymentId);
    if (fetchError) {
      console.error("Failed to fetch payment:", fetchError);
      setError("Failed to load payment details");
    } else {
      setPayment(data);
    }
    setLoading(false);
  }, [paymentId]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: currency || "ZAR" }).format(amount);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const handleConfirm = async () => {
    if (!payment) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await confirmPaymentManual(payment.id, notes || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setActionSuccess("Payment confirmed successfully");
        setNotes("");
        onRefresh();
        await fetchPayment();
      }
    } catch {
      setError("Failed to confirm payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!payment || !refundReason) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await refundPayment(payment.id, refundReason, refundAmount ? Number(refundAmount) : undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setActionSuccess("Payment refunded successfully");
        setRefundReason("");
        setRefundAmount("");
        setShowRefundForm(false);
        onRefresh();
        await fetchPayment();
      }
    } catch {
      setError("Failed to refund payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!payment) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await retryPayment(payment.id, retryToken || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setActionSuccess("Payment retry submitted successfully");
        setRetryToken("");
        setShowRetryForm(false);
        onRefresh();
        await fetchPayment();
      }
    } catch {
      setError("Failed to retry payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
      >
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-500">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
      >
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!payment) return null;

  const invoice = payment.invoice;
  const registration = invoice?.registration;
  const isPending = payment.status === "pending";
  const isFailed = payment.status === "failed";
  const isConfirmed = payment.status === "confirmed";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Payment details"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
            <p className="text-sm text-gray-500">
              {invoice?.invoice_number || payment.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[payment.status]}`}>
              {PAYMENT_STATUS_LABELS[payment.status]}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {actionSuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-700">{actionSuccess}</p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Amount</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(payment.amount, payment.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Method</p>
              <p className="mt-1 text-sm text-gray-900">
                {payment.payment_method?.replace("_", " ").toUpperCase() || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Reference</p>
              <p className="mt-1 text-sm text-gray-900">{payment.reference || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Paid At</p>
              <p className="mt-1 text-sm text-gray-900">{formatDate(payment.paid_at)}</p>
            </div>
          </div>

          {registration && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Registration Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Student</p>
                  <p className="text-sm text-gray-900">{registration.student_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{registration.student_email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Program</p>
                  <p className="text-sm text-gray-900">{registration.course_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Registration Status</p>
                  <p className="text-sm text-gray-900">{registration.status}</p>
                </div>
              </div>
            </div>
          )}

          {invoice && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Invoice Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Invoice Number</p>
                  <p className="text-sm text-gray-900">{invoice.invoice_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm text-gray-900">{invoice.description || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Invoice Amount</p>
                  <p className="text-sm text-gray-900">{formatCurrency(invoice.amount, payment.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm text-gray-900">{invoice.status}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-gray-900">{formatDate(payment.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-900">{formatDate(payment.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-4">
            {isPending && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Confirm Payment</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional confirmation notes..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? "Confirming..." : "Confirm Payment"}
                </button>
              </div>
            )}

            {isConfirmed && !showRefundForm && (
              <button
                type="button"
                onClick={() => setShowRefundForm(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50"
              >
                Refund Payment
              </button>
            )}

            {isConfirmed && showRefundForm && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Refund Payment</h4>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Full amount: ${formatCurrency(payment.amount, payment.currency)}`}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for refund (required)..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRefund}
                    disabled={actionLoading || !refundReason}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "Submit Refund"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRefundForm(false);
                      setRefundReason("");
                      setRefundAmount("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isFailed && !showRetryForm && (
              <button
                type="button"
                onClick={() => setShowRetryForm(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
              >
                Retry Payment
              </button>
            )}

            {isFailed && showRetryForm && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Retry Payment</h4>
                <input
                  type="text"
                  value={retryToken}
                  onChange={(e) => setRetryToken(e.target.value)}
                  placeholder="New payment token (required for Stripe)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Retrying..." : "Submit Retry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRetryForm(false);
                      setRetryToken("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {payment.status === "refunded" && (
              <p className="text-sm text-gray-500 italic">This payment has been refunded.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
