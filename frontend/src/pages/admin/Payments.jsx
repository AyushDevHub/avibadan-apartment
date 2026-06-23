import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Download, Trash2, CalendarRange } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Badge, Button } from "../../components/ui";

const today = () => new Date().toISOString().slice(0, 10);
const curMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function monthsBetweenCount(from, to) {
  if (!from || !to) return 0;
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm) + 1;
}

export default function Payments() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ flatId: "", mode: "" });
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", filters],
    queryFn: async () => (await api.get("/payments", { params: filters })).data,
  });
  const { data: flats } = useQuery({
    queryKey: ["flats"],
    queryFn: async () => (await api.get("/flats")).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["flats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["dues"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record payments and generate receipts."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => setShowBulkForm(true)}>
              <CalendarRange size={15} />
              Multi-Month Payment
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={15} />
              Receive Payment
            </Button>
          </div>
        }
      />

      <div className="filter-bar">
        <select
          className="form-select"
          value={filters.flatId}
          onChange={(e) => setFilters({ ...filters, flatId: e.target.value })}
        >
          <option value="">All flats</option>
          {flats?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.flatNumber} — {f.ownerName}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={filters.mode}
          onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
        >
          <option value="">All modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Flat</th>
              <th>Owner</th>
              <th className="right">Amount</th>
              <th>Mode</th>
              <th>Receipt</th>
              <th>Note</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="empty-state">
                  Loading…
                </td>
              </tr>
            )}
            {payments?.map((p) => (
              <tr key={p.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(p.date).toLocaleDateString("en-IN")}
                </td>
                <td style={{ fontWeight: 500 }}>{p.flat.flatNumber}</td>
                <td>{p.flat.ownerName}</td>
                <td className="right mono">
                  ₹{Number(p.amount).toLocaleString("en-IN")}
                </td>
                <td>
                  <Badge tone={p.mode === "ADJUSTMENT" ? "ink" : "sage"}>
                    {p.mode}
                  </Badge>
                </td>
                <td>
                  {p.groupReceiptNo ? (
                    <a
                      href={`${
                        import.meta.env.VITE_API_URL ||
                        "http://localhost:5000/api"
                      }/receipts/group/${encodeURIComponent(p.groupReceiptNo)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="receipt-link"
                    >
                      <Download size={12} />
                      Consolidated
                    </a>
                  ) : (
                    <a
                      href={`${
                        import.meta.env.VITE_API_URL ||
                        "http://localhost:5000/api"
                      }/receipts/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="receipt-link"
                    >
                      <Download size={12} />
                      {p.receiptNo}
                    </a>
                  )}
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  {p.note || "—"}
                </td>
                <td className="right">
                  <button
                    className="btn-icon"
                    onClick={() => {
                      if (
                        confirm(
                          "Delete this payment? This reverses its effect on dues and the cashbook."
                        )
                      )
                        deleteMutation.mutate(p.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !payments?.length && (
              <tr>
                <td colSpan={8} className="empty-state">
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PaymentForm
          flats={flats}
          onClose={() => setShowForm(false)}
          queryClient={queryClient}
        />
      )}
      {showBulkForm && (
        <BulkPaymentForm
          flats={flats}
          onClose={() => setShowBulkForm(false)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function PaymentForm({ flats, onClose, queryClient }) {
  const [flatId, setFlatId] = useState("");
  const [billId, setBillId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState("CASH");
  const [note, setNote] = useState("");

  const { data: flatDetail } = useQuery({
    queryKey: ["flat", flatId],
    queryFn: async () => (await api.get(`/flats/${flatId}`)).data,
    enabled: !!flatId,
  });
  const openBills =
    flatDetail?.bills?.filter(
      (b) => b.status === "UNPAID" || b.status === "PARTIAL"
    ) || [];

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/payments", {
        flatId,
        billId: billId || null,
        amount: Number(amount),
        date,
        mode,
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["flats"] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">Receive Payment</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Flat</label>
            <select
              required
              className="form-select"
              value={flatId}
              onChange={(e) => {
                setFlatId(e.target.value);
                setBillId("");
              }}
            >
              <option value="">Select a flat</option>
              {flats?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flatNumber} — {f.ownerName}
                </option>
              ))}
            </select>
          </div>
          {flatId && (
            <div className="form-group">
              <label className="form-label">Apply to bill (optional)</label>
              <select
                className="form-select"
                value={billId}
                onChange={(e) => setBillId(e.target.value)}
              >
                <option value="">No specific bill (advance / lump sum)</option>
                {openBills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.month} — ₹{b.amount} ({b.status})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                required
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mode</label>
            <select
              className="form-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
              <option value="ADJUSTMENT">Adjustment (no cash)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Note</label>
            <input
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Maintenance - June 2026"
            />
          </div>
          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Record & Generate Receipt"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// For when a resident pays many months at once - a full year, multiple
// years, or just 2-3 months. Creates whatever bills don't exist yet across
// the range and pays them off oldest-first.
function BulkPaymentForm({ flats, onClose, queryClient }) {
  const [flatId, setFlatId] = useState("");
  const [fromMonth, setFromMonth] = useState(curMonth());
  const [toMonth, setToMonth] = useState(curMonth());
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState("CASH");
  const [note, setNote] = useState("");

  const selectedFlat = flats?.find((f) => f.id === flatId);
  const monthCount = monthsBetweenCount(fromMonth, toMonth);

  // Auto-fill the amount as rate x months, unless the admin has typed a custom amount
  useEffect(() => {
    if (!amountTouched && selectedFlat && monthCount > 0) {
      setAmount(String(selectedFlat.monthlyRate * monthCount));
    }
  }, [selectedFlat, monthCount, amountTouched]);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/payments/bulk", {
        flatId,
        fromMonth,
        toMonth,
        amount: Number(amount),
        date,
        mode,
        note,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["flats"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dues"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      const n = res.data.monthsCovered.length;
      const first = res.data.monthsCovered[0];
      const last = res.data.monthsCovered[n - 1];
      alert(
        n > 0
          ? `Paid ${n} month(s): ${first} to ${last}.${
              res.data.paymentsCreated.length > n
                ? " Extra amount carried forward as credit."
                : ""
            }`
          : "Recorded as advance credit (no unpaid bills in that range)."
      );
      onClose();
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">Multi-Month Payment</div>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          Use this when a resident pays several months - or several years - at
          once. Missing bills for the range are created automatically and paid
          off oldest-first.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Flat</label>
            <select
              required
              className="form-select"
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
            >
              <option value="">Select a flat</option>
              {flats?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flatNumber} — {f.ownerName} (₹{f.monthlyRate}/mo)
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From Month</label>
              <input
                type="month"
                required
                className="form-input"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">To Month</label>
              <input
                type="month"
                required
                className="form-input"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
              />
            </div>
          </div>
          {monthCount > 0 && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-dim)",
                marginTop: -6,
              }}
            >
              {monthCount} month{monthCount !== 1 ? "s" : ""} selected
              {selectedFlat
                ? ` — default amount ₹${(
                    selectedFlat.monthlyRate * monthCount
                  ).toLocaleString("en-IN")}`
                : ""}
            </p>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Amount (₹)</label>
              <input
                type="number"
                required
                className="form-input"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountTouched(true);
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mode</label>
            <select
              className="form-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
              <option value="ADJUSTMENT">Adjustment (no cash)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid 2 years in advance"
            />
          </div>
          <div className="modal-actions">
            <Button
              type="submit"
              disabled={mutation.isPending || !flatId || toMonth < fromMonth}
            >
              {mutation.isPending
                ? "Processing…"
                : "Record Multi-Month Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
