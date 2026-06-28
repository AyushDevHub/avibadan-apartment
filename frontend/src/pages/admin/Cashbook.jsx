import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Button } from "../../components/ui";

const today = () => new Date().toISOString().slice(0, 10);

// Human-readable labels instead of IN/OUT
function typeLabel(type, refType) {
  if (refType === "MANUAL")
    return type === "IN" ? "Received (manual)" : "Spent (manual)";
  if (refType === "PAYMENT") return "Maintenance received";
  if (refType === "EXPENSE") return "Expense paid";
  if (refType === "SALARY") return "Salary paid";
  return type === "IN" ? "Received" : "Spent";
}

function typeColor(type) {
  return type === "IN" ? "var(--sage-light)" : "var(--rust-light)";
}

export default function Cashbook() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cashbook", month, year],
    queryFn: async () =>
      (
        await api.get("/cashbook", {
          params: { month, year: month ? "" : year },
        })
      ).data,
  });
  const { data: years } = useQuery({
    queryKey: ["cashbook-years"],
    queryFn: async () => (await api.get("/cashbook/years")).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/cashbook/manual/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) =>
      alert(err.response?.data?.message || "Cannot delete this entry"),
  });

  const viewingPeriod = month || year;

  return (
    <div>
      <PageHeader
        title="Cashbook"
        description="Every rupee received and spent. Oldest entries at top, newest at bottom."
        action={
          <Button onClick={() => setEditing({})}>
            <Plus size={15} />
            Add Entry
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="stat-grid cols-4" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Cash in Hand (Today)</div>
          <div className="stat-value sage">
            ₹{Number(data?.cashInHand || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">Your actual cash right now</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            {viewingPeriod ? "Opening (period)" : "Opening Balance"}
          </div>
          <div className="stat-value">
            ₹{Number(data?.openingBalance || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">Balance before this period</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Money Received</div>
          <div className="stat-value sage">
            +₹{Number(data?.totalIn || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">
            {viewingPeriod ? "In this period" : "All time"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Money Spent</div>
          <div className="stat-value rust">
            -₹{Number(data?.totalOut || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">
            {viewingPeriod ? "In this period" : "All time"}
          </div>
        </div>
      </div>

      {/* Period closing balance */}
      {viewingPeriod && (
        <div
          className="card card-body"
          style={{ marginBottom: 16, background: "var(--bg-active)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Closing balance for this period = ₹
              {Number(data?.openingBalance || 0).toLocaleString("en-IN")} + ₹
              {Number(data?.totalIn || 0).toLocaleString("en-IN")} − ₹
              {Number(data?.totalOut || 0).toLocaleString("en-IN")}
            </span>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 700,
                fontSize: "1.1rem",
                color:
                  data?.closingBalance >= 0
                    ? "var(--sage-light)"
                    : "var(--rust-light)",
              }}
            >
              = ₹{Number(data?.closingBalance || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <input
          type="month"
          className="form-input"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            if (e.target.value) setYear("");
          }}
          style={{ maxWidth: 160 }}
        />
        <select
          className="form-select"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            if (e.target.value) setMonth("");
          }}
          style={{ maxWidth: 150 }}
        >
          <option value="">Filter by year…</option>
          {years?.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {(month || year) && (
          <Button
            variant="ghost"
            onClick={() => {
              setMonth("");
              setYear("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Ledger table — oldest at top, newest at bottom */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th className="right">Amount</th>
              <th className="right">Balance</th>
              <th className="right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Loading…
                </td>
              </tr>
            )}

            {data?.transactions?.map((t, i) => (
              <tr
                key={t.id}
                style={{
                  background: i % 2 === 0 ? "transparent" : "var(--bg-hover)",
                }}
              >
                <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                  {new Date(t.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td style={{ fontSize: "0.82rem" }}>{t.description}</td>
                <td style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  {typeLabel(t.type, t.refType)}
                </td>
                <td
                  className="right mono"
                  style={{ color: typeColor(t.type), fontWeight: 600 }}
                >
                  {t.type === "IN" ? "+" : "-"}₹
                  {Number(t.amount).toLocaleString("en-IN")}
                </td>
                <td className="right mono" style={{ fontWeight: 600 }}>
                  ₹{Number(t.balance).toLocaleString("en-IN")}
                </td>
                <td className="right" style={{ whiteSpace: "nowrap" }}>
                  {t.refType === "MANUAL" ? (
                    <>
                      <button
                        className="btn-icon"
                        onClick={() =>
                          setEditing({ ...t, date: t.date.slice(0, 10) })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          if (confirm("Delete this entry?"))
                            deleteMutation.mutate(t.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span
                      style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}
                    >
                      auto
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {!isLoading && !data?.transactions?.length && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No entries yet. Add your opening balance first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EntryForm
          entry={editing}
          onClose={() => setEditing(null)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function EntryForm({ entry, onClose, queryClient }) {
  const isEdit = !!entry.id;
  const [date, setDate] = useState(entry.date || today());
  const [type, setType] = useState(entry.type || "IN");
  const [amount, setAmount] = useState(entry.amount || "");
  const [description, setDescription] = useState(entry.description || "");

  const mutation = useMutation({
    mutationFn: () => {
      const body = { date, type, amount: Number(amount), description };
      return isEdit
        ? api.put(`/cashbook/manual/${entry.id}`, body)
        : api.post("/cashbook/manual", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook-years"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">
          {isEdit ? "Edit Entry" : "Add Cash Entry"}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
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

          <div className="form-group">
            <label className="form-label">Type</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {[
                {
                  v: "IN",
                  label: "💰 Money Received",
                  sub: "e.g. opening balance, misc income",
                },
                {
                  v: "OUT",
                  label: "💸 Money Spent",
                  sub: "e.g. misc expense, correction",
                },
              ].map((opt) => (
                <label
                  key={opt.v}
                  style={{
                    border: `2px solid ${
                      type === opt.v ? "var(--rust)" : "var(--border)"
                    }`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background:
                      type === opt.v ? "var(--rust-bg)" : "var(--bg-input)",
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={opt.v}
                    checked={type === opt.v}
                    onChange={() => setType(opt.v)}
                    style={{ display: "none" }}
                  />
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      color: "var(--text)",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-dim)",
                      marginTop: 2,
                    }}
                  >
                    {opt.sub}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              required
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              required
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Opening Balance Jan 2024"
            />
          </div>

          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Entry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
