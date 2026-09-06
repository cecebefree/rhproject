import { useCallback, useEffect, useState } from "react";
import {
  type PaymentStatus,
  type PaymentWithInvoice,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  selectPayments,
  subscribeToPayments,
} from "../services/supabase";
import PaymentConfirmationDetail from "./PaymentConfirmationDetail";

interface PaymentFilters {
  status: PaymentStatus | "all";
  method: string;
  search: string;
}

interface PaymentConfirmationProps {
  tenantId: string;
}

export default function PaymentConfirmation({ tenantId }: PaymentConfirmationProps) {
  const [payments, setPayments] = useState<PaymentWithInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PaymentFilters>({
    status: "all",
    method: "",
    search: "",
  });
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<PaymentStatus | "all", number>>({
    all: 0,
    pending: 0,
    confirmed: 0,
    failed: 0,
    refunded: 0,
  });

  const fetchPayments = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await selectPayments(tenantId, {
        status: filters.status === "all" ? undefined : filters.status,
        method: filters.method || undefined,
        search: filters.search || undefined,
      });
      if (error) {
        console.error("Failed to fetch payments:", error);
        return;
      }
      setPayments(data || []);
      setCounts((prev) => ({
        ...prev,
        all: (data || []).length,
      }));
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters.status, filters.method, filters.search]);

  const fetchCounts = useCallback(async () => {
    if (!tenantId) return;
    for (const status of ["pending", "confirmed", "failed", "refunded"] as PaymentStatus[]) {
      const { count } = await selectPayments(tenantId, { status });
      setCounts((prev) => ({ ...prev, [status]: count || 0 }));
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = subscribeToPayments(tenantId, () => {
      fetchPayments();
      fetchCounts();
    });
    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, fetchPayments, fetchCounts]);

  const handleFilterChange = (field: keyof PaymentFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
  };

  const handleRefresh = () => {
    fetchPayments();
    fetchCounts();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency || "ZAR",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusTabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "confirmed", label: "Confirmed", count: counts.confirmed },
    { key: "failed", label: "Failed", count: counts.failed },
    { key: "refunded", label: "Refunded", count: counts.refunded },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Payment Confirmations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and confirm incoming payments for your registrations
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleFilterChange("status", tab.key)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
                filters.status === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  filters.status === tab.key
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by reference or invoice number..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <select
          value={filters.method}
          onChange={(e) => handleFilterChange("method", e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Methods</option>
          <option value="stripe_card">Stripe Card</option>
          <option value="stripe_ach">Stripe ACH</option>
          <option value="paypal">PayPal</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student / Program
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  Loading payments...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr
                  key={payment.id}
                  onClick={() => handleRowClick(payment.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleRowClick(payment.id);
                  }}
                  className="hover:bg-gray-50 cursor-pointer"
                  tabIndex={0}
                  role="button"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.invoice?.invoice_number || "—"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.payment_method
                        ? payment.payment_method.replace("_", " ").toUpperCase()
                        : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {payment.invoice?.registration?.student_name || "—"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.invoice?.registration?.course_name || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        PAYMENT_STATUS_COLORS[payment.status]
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(payment.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {payment.status === "pending" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(payment.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Review
                      </button>
                    )}
                    {payment.status !== "pending" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(payment.id);
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPaymentId && (
        <PaymentConfirmationDetail
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
