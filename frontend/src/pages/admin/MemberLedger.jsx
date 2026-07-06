import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Badge, Button } from "../../components/ui";

const CATS = [
  "ELECTRICITY",
  "WATER",
  "CLEANER_SALARY",
  "SECURITY_SALARY",
  "REPAIRS",
  "LIFT_MAINTENANCE",
  "GARDENING",
  "MISCELLANEOUS",
];
const today = () => new Date().toISOString().slice(0, 10);

const TYPE_CONFIG = {
  SPENT: {
    label: "💸 Spent from pocket",
    color: "var(--rust-light)",
    tone: "rust",
    sign: "-",
  },
  TOPPED_UP: {
    label: "💰 Topped up cash",
    color: "var(--gold-light)",
    tone: "gold",
    sign: "+",
  },
  REIMBURSED: {
    label: "✅ Reimbursed",
    color: "var(--sage-light)",
    tone: "sage",
    sign: "-",
  },
};

export default function MemberLedger() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [prefillFlat, setPrefillFlat] = useState("");

  const { data: collectors, isLoading } = useQuery({
    queryKey: ["member-ledger-all"],
    queryFn: async () => (await api.get("/member-ledger")).data,
  });

  const { data: detail } = useQuery({
    queryKey: ["member-ledger", expanded],
    queryFn: async () => (await api.get(`/member-ledger/${expanded}`)).data,
    enabled: !!expanded,
  });

  const totalSocietyDebt =
    collectors?.reduce((s, c) => s + Math.max(c.netBalance, 0), 0) || 0;
  const totalOwed =
    collectors?.reduce((s, c) => s + Math.max(-c.netBalance, 0), 0) || 0;

  return (
    <div>
      <PageHeader
        title="Member Ledger"
        description="What each collector-member has spent from pocket vs what the society owes them."
        action={
          <Button
            onClick={() => {
              setPrefillFlat("");
              setShowForm(true);
            }}
          >
            <Plus size={15} />
            Add Entry
          </Button>
        }
      />

      {/* Society-wide summary */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Society Owes Members</div>
          <div className="stat-value rust">
            ₹{totalSocietyDebt.toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">Pending reimbursements</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Members Owe Society</div>
          <div className="stat-value sage">
            ₹{totalOwed.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Collector cards */}
      {isLoading && <div className="empty-state">Loading…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {collectors?.map((c) => (
          <div key={c.id} className="card">
            {/* Summary row */}
            <div
              style={{
                padding: "16px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div>
                <div
                  style={{
                    fontFamily: "Fraunces, serif",
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "var(--text-white)",
                  }}
                >
                  {c.ownerName}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {c.flatNumber} · {c.entryCount} entries
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                  >
                    Spent + Topped up
                  </div>
                  <div
                    className="mono"
                    style={{ color: "var(--rust-light)", fontWeight: 700 }}
                  >
                    ₹{(c.totalSpent + c.totalToppedUp).toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                  >
                    Net Balance
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color:
                        c.netBalance > 0
                          ? "var(--rust-light)"
                          : c.netBalance < 0
                          ? "var(--sage-light)"
                          : "var(--text-muted)",
                    }}
                  >
                    {c.netBalance > 0
                      ? `Society owes ₹${c.netBalance.toLocaleString("en-IN")}`
                      : c.netBalance < 0
                      ? `Member owes ₹${Math.abs(c.netBalance).toLocaleString(
                          "en-IN"
                        )}`
                      : "Settled"}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrefillFlat(c.id);
                    setShowForm(true);
                  }}
                >
                  <Plus size={16} />
                </button>
                {expanded === c.id ? (
                  <ChevronUp size={18} color="var(--text-muted)" />
                ) : (
                  <ChevronDown size={18} color="var(--text-muted)" />
                )}
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === c.id && detail && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                {/* Mini stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 1,
                    background: "var(--border)",
                  }}
                >
                  {[
                    {
                      label: "Spent from pocket",
                      value: detail.totalSpent,
                      color: "var(--rust-light)",
                    },
                    {
                      label: "Topped up",
                      value: detail.totalToppedUp,
                      color: "var(--gold-light)",
                    },
                    {
                      label: "Reimbursed",
                      value: detail.totalReimbursed,
                      color: "var(--sage-light)",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "var(--bg-card)",
                        padding: "12px 16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        className="mono"
                        style={{ fontWeight: 700, color: s.color }}
                      >
                        ₹{s.value.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Entries table */}
                <div
                  className="table-wrap"
                  style={{ borderRadius: 0, border: "none" }}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th className="right">Amount</th>
                        <th className="right">Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.entries?.map((e) => (
                        <tr key={e.id}>
                          <td
                            style={{
                              fontSize: "0.78rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(e.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: TYPE_CONFIG[e.type]?.color,
                              }}
                            >
                              {TYPE_CONFIG[e.type]?.label}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.82rem" }}>
                            {e.description}
                          </td>
                          <td
                            className="right mono"
                            style={{
                              color: TYPE_CONFIG[e.type]?.color,
                              fontWeight: 600,
                            }}
                          >
                            {TYPE_CONFIG[e.type]?.sign}₹
                            {Number(e.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="right">
                            <DeleteBtn
                              id={e.id}
                              queryClient={queryClient}
                              flatId={c.id}
                            />
                          </td>
                        </tr>
                      ))}
                      {!detail.entries?.length && (
                        <tr>
                          <td colSpan={5} className="empty-state">
                            No entries yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}

        {!isLoading && !collectors?.length && (
          <div className="empty-state">
            No collector members found. Go to Residents → Edit a flat → turn on
            "Is Collector Member".
          </div>
        )}
      </div>

      {showForm && (
        <AddEntryModal
          collectors={collectors}
          prefillFlatId={prefillFlat}
          onClose={() => {
            setShowForm(false);
            setPrefillFlat("");
          }}
          queryClient={queryClient}
          expanded={expanded}
        />
      )}
    </div>
  );
}

function DeleteBtn({ id, queryClient, flatId }) {
  const mutation = useMutation({
    mutationFn: () => api.delete(`/member-ledger/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-ledger-all"] });
      queryClient.invalidateQueries({ queryKey: ["member-ledger", flatId] });
    },
  });
  return (
    <button
      className="btn-icon"
      onClick={() => {
        if (confirm("Delete this entry?")) mutation.mutate();
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}

function AddEntryModal({
  collectors,
  prefillFlatId,
  onClose,
  queryClient,
  expanded,
}) {
  const [flatId, setFlatId] = useState(prefillFlatId || "");
  const [type, setType] = useState("SPENT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState(CATS[0]);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/member-ledger", {
        flatId,
        type,
        amount: Number(amount),
        date,
        description: desc,
        expenseCategory: type === "SPENT" ? cat : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-ledger-all"] });
      queryClient.invalidateQueries({ queryKey: ["member-ledger", expanded] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">Add Member Ledger Entry</div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Collector Member</label>
            <select
              required
              className="form-select"
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
            >
              <option value="">Select member</option>
              {collectors?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flatNumber} — {c.ownerName}
                </option>
              ))}
            </select>
          </div>

          {/* Type picker */}
          <div className="form-group">
            <label className="form-label">What happened?</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
              }}
            >
              {Object.entries(TYPE_CONFIG).map(([v, cfg]) => (
                <label
                  key={v}
                  style={{
                    border: `2px solid ${
                      type === v ? cfg.color : "var(--border)"
                    }`,
                    borderRadius: 8,
                    padding: "10px 8px",
                    cursor: "pointer",
                    textAlign: "center",
                    background:
                      type === v ? "var(--bg-active)" : "var(--bg-input)",
                  }}
                >
                  <input
                    type="radio"
                    value={v}
                    checked={type === v}
                    onChange={() => setType(v)}
                    style={{ display: "none" }}
                  />
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.78rem",
                      color: type === v ? cfg.color : "var(--text-muted)",
                    }}
                  >
                    {cfg.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Expense category only for SPENT */}
          {type === "SPENT" && (
            <div className="form-group">
              <label className="form-label">Expense Category</label>
              <select
                className="form-select"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
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
                placeholder="0"
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
            <label className="form-label">Description</label>
            <input
              required
              className="form-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={
                type === "SPENT"
                  ? "e.g. June electricity bill"
                  : type === "TOPPED_UP"
                  ? "e.g. Added cash for pump repair"
                  : "e.g. Cash returned to member"
              }
            />
          </div>

          {type === "SPENT" && (
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-dim)",
                marginTop: -4,
              }}
            >
              This will auto-create an Expense record (no cash movement).
              Society now owes this member the amount.
            </p>
          )}
          {type === "TOPPED_UP" && (
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-dim)",
                marginTop: -4,
              }}
            >
              Cash physically added to society box. Goes into Cashbook as Money
              In. Society now owes this member the amount.
            </p>
          )}
          {type === "REIMBURSED" && (
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-dim)",
                marginTop: -4,
              }}
            >
              Society paid member back. Goes into Cashbook as Money Out. Reduces
              what society owes.
            </p>
          )}

          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending || !flatId}>
              {mutation.isPending ? "Saving…" : "Save Entry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
