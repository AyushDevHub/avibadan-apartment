import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Button } from "../../components/ui";

const today = () => new Date().toISOString().slice(0, 10);

function entryLabel(t) {
  if (t.refType === "PAYMENT") return "🏠 Maintenance received";
  if (t.refType === "EXPENSE") return "💸 Expense paid";
  if (t.refType === "SALARY") return "👷 Salary paid";
  if (t.refType === "MANUAL" && t.type === "IN") return "💰 Cash received";
  if (t.refType === "MANUAL" && t.type === "OUT") return "💸 Cash spent";
  return t.type === "IN" ? "💰 Received" : "💸 Spent";
}

export default function Cashbook() {
  const queryClient = useQueryClient();
  const [filterMode, setFilterMode] = useState("month"); // 'month' | 'year' | 'range'
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, setYear] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const params =
    filterMode === "month"
      ? { month }
      : filterMode === "year"
      ? { year }
      : { from, to };

  const { data, isLoading } = useQuery({
    queryKey: ["cashbook", filterMode, month, year, from, to],
    queryFn: async () => (await api.get("/cashbook", { params })).data,
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
    onError: (err) => alert(err.response?.data?.message || "Cannot delete"),
  });

  return (
    <div>
      <PageHeader
        title="Cashbook"
        description="Your passbook — every rupee in and out."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus size={15} />
            Add Entry
          </Button>
        }
      />

      {/* Cash in Hand — big, always visible */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "2px solid var(--sage)",
          borderRadius: 12,
          padding: "18px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            Cash in Hand
          </div>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--sage-light)",
              marginTop: 4,
            }}
          >
            ₹{Number(data?.cashInHand || 0).toLocaleString("en-IN")}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-dim)",
              marginTop: 2,
            }}
          >
            Total money available right now
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--sage-light)" }}>
            +₹{Number(data?.totalIn || 0).toLocaleString("en-IN")} in
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--rust-light)" }}>
            -₹{Number(data?.totalOut || 0).toLocaleString("en-IN")} out
          </div>
          {(filterMode !== "month" || month) && (
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-dim)",
                marginTop: 4,
              }}
            >
              Closing: ₹
              {Number(data?.closingBalance || 0).toLocaleString("en-IN")}
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          {["month", "year", "range"].map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              className={`btn ${
                filterMode === m ? "btn-primary" : "btn-ghost"
              }`}
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
            >
              {m === "month" ? "Month" : m === "year" ? "Year" : "Custom Range"}
            </button>
          ))}
        </div>

        {filterMode === "month" && (
          <input
            type="month"
            className="form-input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ maxWidth: 180 }}
          />
        )}
        {filterMode === "year" && (
          <select
            className="form-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ maxWidth: 160 }}
          >
            <option value="">Select year</option>
            {years?.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        {filterMode === "range" && (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              type="date"
              className="form-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ maxWidth: 160 }}
            />
            <span style={{ color: "var(--text-muted)" }}>to</span>
            <input
              type="date"
              className="form-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </div>
        )}
      </div>

      {/* Passbook table — newest at top */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th className="right">In (₹)</th>
              <th className="right">Out (₹)</th>
              <th className="right">Balance</th>
              <th className="right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="empty-state">
                  Loading…
                </td>
              </tr>
            )}

            {data?.transactions?.map((t, i) => (
              <tr
                key={t.id}
                style={{
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                }}
              >
                <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                  {new Date(t.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td style={{ fontSize: "0.82rem", maxWidth: 220 }}>
                  {t.description}
                </td>
                <td
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-dim)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entryLabel(t)}
                </td>
                <td
                  className="right mono"
                  style={{ color: "var(--sage-light)", fontWeight: 600 }}
                >
                  {t.type === "IN"
                    ? `₹${Number(t.amount).toLocaleString("en-IN")}`
                    : "—"}
                </td>
                <td
                  className="right mono"
                  style={{ color: "var(--rust-light)", fontWeight: 600 }}
                >
                  {t.type === "OUT"
                    ? `₹${Number(t.amount).toLocaleString("en-IN")}`
                    : "—"}
                </td>
                <td
                  className="right mono"
                  style={{
                    fontWeight: 700,
                    color:
                      t.balance < 0 ? "var(--rust-light)" : "var(--text-white)",
                  }}
                >
                  ₹{Number(t.balance).toLocaleString("en-IN")}
                </td>
                <td className="right" style={{ whiteSpace: "nowrap" }}>
                  {t.refType === "MANUAL" ? (
                    <>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setEditing({ ...t, date: t.date.slice(0, 10) });
                          setShowForm(true);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          if (confirm("Delete?")) deleteMutation.mutate(t.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span
                      style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}
                    >
                      auto
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {!isLoading && !data?.transactions?.length && (
              <tr>
                <td colSpan={7} className="empty-state">
                  No entries for this period.
                  {filterMode === "month"
                    ? " Try a different month or enter your opening balance first."
                    : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <EntryModal
          entry={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function EntryModal({ entry, onClose, queryClient }) {
  const isEdit = !!entry?.id;
  const [date, setDate] = useState(entry?.date || today());
  const [type, setType] = useState(entry?.type || "IN");
  const [amount, setAmount] = useState(entry?.amount || "");
  const [description, setDescription] = useState(entry?.description || "");

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
          {/* Type selector */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <label
                style={{
                  border: `2px solid ${
                    type === "IN" ? "var(--sage)" : "var(--border)"
                  }`,
                  borderRadius: 8,
                  padding: "12px",
                  cursor: "pointer",
                  background:
                    type === "IN" ? "var(--sage-bg)" : "var(--bg-input)",
                  textAlign: "center",
                }}
              >
                <input
                  type="radio"
                  value="IN"
                  checked={type === "IN"}
                  onChange={() => setType("IN")}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: "1.4rem" }}>💰</div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--sage-light)",
                    fontSize: "0.9rem",
                  }}
                >
                  Money In
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  Received / Opening
                </div>
              </label>
              <label
                style={{
                  border: `2px solid ${
                    type === "OUT" ? "var(--rust)" : "var(--border)"
                  }`,
                  borderRadius: 8,
                  padding: "12px",
                  cursor: "pointer",
                  background:
                    type === "OUT" ? "var(--rust-bg)" : "var(--bg-input)",
                  textAlign: "center",
                }}
              >
                <input
                  type="radio"
                  value="OUT"
                  checked={type === "OUT"}
                  onChange={() => setType("OUT")}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: "1.4rem" }}>💸</div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--rust-light)",
                    fontSize: "0.9rem",
                  }}
                >
                  Money Out
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  Spent / Paid
                </div>
              </label>
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
              autoFocus
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

          <div className="form-group">
            <label className="form-label">Note</label>
            <input
              required
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Opening balance, misc income…"
            />
          </div>

          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
