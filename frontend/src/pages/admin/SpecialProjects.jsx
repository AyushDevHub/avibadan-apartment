import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Upload,
  Loader2,
  Pencil,
  Search,
  Download,
} from "lucide-react";
import api from "../../api/client";
import { PageHeader, Badge, Button } from "../../components/ui";

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_TONE = {
  COLLECTING: "gold",
  IN_PROGRESS: "rust",
  COMPLETED: "sage",
  CLOSED: "muted",
};

export default function SpecialProjects() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["special-projects"],
    queryFn: async () => (await api.get("/special-projects")).data,
  });

  const filtered = (projects || []).filter((p) => {
    const matchesSearch = p.title
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = (projects || []).reduce(
    (acc, p) => {
      acc.target += p.targetAmount;
      acc.collected += p.totalCollected;
      acc.spent += p.totalSpent;
      acc.balance += p.balance;
      return acc;
    },
    { target: 0, collected: 0, spent: 0, balance: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Special Projects"
        description="Big one-off works (repainting, waterproofing, lift overhaul...) funded by a
        separate one-time collection split by each flat's area, kept apart from the
        regular maintenance cashbook until finished."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} />
            New Project
          </Button>
        }
      />

      {!!projects?.length && (
        <div className="summary-bar">
          <div className="summary-chip">
            Total target
            <strong>₹{totals.target.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-chip">
            Total collected
            <strong>₹{totals.collected.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-chip">
            Total spent
            <strong>₹{totals.spent.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-chip">
            Combined fund balance
            <strong>₹{totals.balance.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      )}

      {!!projects?.length && (
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <div
            style={{
              position: "relative",
              flex: 1,
              minWidth: 160,
              maxWidth: 280,
            }}
          >
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              className="form-input"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30, maxWidth: "none" }}
            />
          </div>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="COLLECTING">Collecting</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      )}

      {isLoading && <div className="empty-state">Loading…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            expanded={expanded === p.id}
            onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
            queryClient={queryClient}
          />
        ))}
        {!isLoading && !projects?.length && (
          <div className="empty-state">
            No special projects yet. Click "New Project" to start one — it will
            split the target amount across flats by their area (sq.ft), so make
            sure areas are set on Residents first.
          </div>
        )}
        {!isLoading && !!projects?.length && !filtered.length && (
          <div className="empty-state">
            No projects match your search/filter.
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function exportSharesCSV(p) {
  const rows = [
    ["Flat", "Owner", "Area (sq.ft)", "Due Share", "Paid", "Outstanding"],
  ];
  p.shares.forEach((s) => {
    const paid = p.payments
      .filter((pay) => pay.flatId === s.flatId)
      .reduce((sum, pay) => sum + pay.amount, 0);
    const outstanding = Math.max(s.dueAmount - paid, 0);
    rows.push([
      s.flat.flatNumber,
      s.flat.ownerName,
      s.areaSqFt,
      s.dueAmount,
      paid,
      outstanding,
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${p.title.replace(/[^a-z0-9]+/gi, "_")}_shares.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ProjectCard({ project: p, expanded, onToggle, queryClient }) {
  const [tab, setTab] = useState("shares");
  const [showPayment, setShowPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status) =>
      api.patch(`/special-projects/${p.id}/status`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["special-projects"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/special-projects/${p.id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["special-projects"] }),
    onError: (err) =>
      alert(err.response?.data?.message || "Could not delete project"),
  });

  const pct = p.targetAmount
    ? Math.min(100, Math.round((p.totalCollected / p.targetAmount) * 100))
    : 0;

  return (
    <div className="card">
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{ cursor: "pointer", flex: "1 1 220px", minWidth: 0 }}
          onClick={onToggle}
        >
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 600,
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {p.title}
            <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Target ₹{p.targetAmount.toLocaleString("en-IN")} · Collected ₹
            {p.totalCollected.toLocaleString("en-IN")} ({pct}%) · Spent ₹
            {p.totalSpent.toLocaleString("en-IN")} · Fund balance{" "}
            <strong>₹{p.balance.toLocaleString("en-IN")}</strong>
          </div>
          <div className="progress-track" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            className="btn-icon"
            title="Edit project"
            onClick={(e) => {
              e.stopPropagation();
              setShowEdit(true);
            }}
          >
            <Pencil size={16} />
          </button>
          <button
            className="btn-icon"
            title="Delete project"
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(
                  `Delete "${p.title}"? This only works if it has no collections or expenses yet.`
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 size={16} />
          </button>
          <button className="btn-icon" onClick={onToggle} title="Expand">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          <div className="action-bar" style={{ marginBottom: 14 }}>
            <Button size="sm" onClick={() => setShowPayment(true)}>
              <Plus size={13} /> Record Collection
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExpense(true)}
            >
              <Plus size={13} /> Record Project Expense
            </Button>
            {p.status === "COLLECTING" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusMutation.mutate("IN_PROGRESS")}
              >
                Mark Work Started
              </Button>
            )}
            {p.status === "IN_PROGRESS" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusMutation.mutate("COMPLETED")}
              >
                Mark Work Completed
              </Button>
            )}
            {(p.status === "COMPLETED" || p.status === "IN_PROGRESS") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowClose(true)}
              >
                Close &amp; Return Unused Budget
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportSharesCSV(p)}
            >
              <Download size={13} /> Export Shares CSV
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 12,
              fontSize: "0.82rem",
              flexWrap: "wrap",
              overflowX: "auto",
            }}
          >
            <button
              onClick={() => setTab("shares")}
              className={tab === "shares" ? "tab-active" : "tab"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: tab === "shares" ? 700 : 400,
                whiteSpace: "nowrap",
              }}
            >
              Per-flat shares
            </button>
            <button
              onClick={() => setTab("payments")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: tab === "payments" ? 700 : 400,
                whiteSpace: "nowrap",
              }}
            >
              Collections ({p.payments.length})
            </button>
            <button
              onClick={() => setTab("expenses")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: tab === "expenses" ? 700 : 400,
                whiteSpace: "nowrap",
              }}
            >
              Expenses ({p.expenses.length})
            </button>
          </div>

          {tab === "shares" && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Flat</th>
                    <th>Owner</th>
                    <th className="right">Area (sq.ft)</th>
                    <th className="right">Due Share</th>
                    <th className="right">Paid</th>
                    <th className="right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {p.shares.map((s) => {
                    const paid = p.payments
                      .filter((pay) => pay.flatId === s.flatId)
                      .reduce((sum, pay) => sum + pay.amount, 0);
                    const outstanding = Math.max(s.dueAmount - paid, 0);
                    return (
                      <tr key={s.id}>
                        <td>{s.flat.flatNumber}</td>
                        <td>{s.flat.ownerName}</td>
                        <td className="right mono">{s.areaSqFt}</td>
                        <td className="right mono">
                          ₹{s.dueAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="right mono">
                          ₹{paid.toLocaleString("en-IN")}
                        </td>
                        <td
                          className="right mono"
                          style={{
                            color:
                              outstanding > 0
                                ? "var(--rust-light)"
                                : "var(--sage-light)",
                          }}
                        >
                          ₹{outstanding.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "payments" && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Flat</th>
                    <th>Note</th>
                    <th className="right">Amount</th>
                    <th className="right"></th>
                  </tr>
                </thead>
                <tbody>
                  {p.payments.map((pay) => (
                    <tr key={pay.id}>
                      <td>{new Date(pay.date).toLocaleDateString("en-IN")}</td>
                      <td>
                        {pay.flat.flatNumber} — {pay.flat.ownerName}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>{pay.note}</td>
                      <td className="right mono">
                        ₹{pay.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="right">
                        <DeleteBtn
                          onDelete={() =>
                            api.delete(
                              `/special-projects/${p.id}/payments/${pay.id}`
                            )
                          }
                          queryClient={queryClient}
                        />
                      </td>
                    </tr>
                  ))}
                  {!p.payments.length && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No collections logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "expenses" && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Bill</th>
                    <th className="right">Amount</th>
                    <th className="right"></th>
                  </tr>
                </thead>
                <tbody>
                  {p.expenses.map((ex) => (
                    <tr key={ex.id}>
                      <td>{new Date(ex.date).toLocaleDateString("en-IN")}</td>
                      <td style={{ fontSize: "0.82rem" }}>{ex.description}</td>
                      <td>
                        {ex.billUpload ? (
                          <a
                            href={ex.billUpload}
                            target="_blank"
                            rel="noreferrer"
                            className="receipt-link"
                          >
                            <Paperclip size={13} />
                            View
                          </a>
                        ) : (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.78rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="right mono">
                        ₹{ex.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="right">
                        <DeleteBtn
                          onDelete={() =>
                            api.delete(
                              `/special-projects/${p.id}/expenses/${ex.id}`
                            )
                          }
                          queryClient={queryClient}
                        />
                      </td>
                    </tr>
                  ))}
                  {!p.expenses.length && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No expenses logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showEdit && (
        <EditProjectModal
          project={p}
          onClose={() => setShowEdit(false)}
          queryClient={queryClient}
        />
      )}
      {showPayment && (
        <PaymentModal
          project={p}
          onClose={() => setShowPayment(false)}
          queryClient={queryClient}
        />
      )}
      {showExpense && (
        <ExpenseModal
          project={p}
          onClose={() => setShowExpense(false)}
          queryClient={queryClient}
        />
      )}
      {showClose && (
        <CloseModal
          project={p}
          onClose={() => setShowClose(false)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function DeleteBtn({ onDelete, queryClient }) {
  const mutation = useMutation({
    mutationFn: onDelete,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["special-projects"] }),
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

function CreateProjectModal({ onClose, queryClient }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/special-projects", { title, description, targetAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-projects"] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">New Special Project</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              required
              className="form-input"
              placeholder="e.g. Building Repainting 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Target Amount (₹)</label>
            <input
              required
              type="number"
              className="form-input"
              placeholder="e.g. 100000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            This will be split across every active flat proportional to their
            area (sq.ft), and each flat's share will show up on this project's
            page. Flats without an area set will be skipped — set areas on the
            Residents page first.
          </div>
          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProjectModal({ project, onClose, queryClient }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [targetAmount, setTargetAmount] = useState(project.targetAmount);

  const canRetarget = project.status === "COLLECTING";

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/special-projects/${project.id}`, {
        title,
        description,
        targetAmount: canRetarget ? Number(targetAmount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-projects"] });
      onClose();
    },
    onError: (err) =>
      alert(err.response?.data?.message || "Could not update project"),
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">Edit Project</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              required
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Target Amount (₹)</label>
            <input
              required
              type="number"
              className="form-input"
              value={targetAmount}
              disabled={!canRetarget}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
            {!canRetarget && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Target amount can only be changed while the project is still
                COLLECTING (per-flat shares are re-split automatically when you
                change it).
              </div>
            )}
          </div>
          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ project, onClose, queryClient }) {
  const [flatId, setFlatId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/special-projects/${project.id}/payments`, {
        flatId,
        amount: Number(amount),
        date,
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-projects"] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">Record Collection — {project.title}</div>
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
              <option value="">Select flat</option>
              {project.shares.map((s) => (
                <option key={s.flatId} value={s.flatId}>
                  {s.flat.flatNumber} — {s.flat.ownerName} (share ₹
                  {s.dueAmount.toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                required
                type="number"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                required
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpenseModal({ project, onClose, queryClient }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [billUpload, setBillUpload] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/special-projects/${project.id}/expenses`, {
        amount: Number(amount),
        date,
        description,
        billUpload: billUpload || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-projects"] });
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
          Record Project Expense — {project.title}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                required
                type="number"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                required
                type="date"
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
              placeholder="e.g. Painter advance"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <BillUpload value={billUpload} onChange={setBillUpload} />
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            This is paid out of the project's own fund only — it does not appear
            in the main cashbook.
          </div>
          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Shared bill-upload control: picks a file, uploads it immediately to
// Cloudinary via the backend, and stores the returned permanent URL.
// Same behaviour as the Expenses page — accepts images and PDFs.
function BillUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload/bill", formData);
      onChange(res.data.url);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">Bill Photo / PDF (optional)</label>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="receipt-link"
          >
            <Paperclip size={13} />
            View uploaded bill
          </a>
          <button
            type="button"
            className="btn-icon"
            onClick={() => onChange("")}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          className="btn btn-ghost"
          style={{ cursor: "pointer", width: "fit-content" }}
        >
          {uploading ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? "Uploading…" : "Choose file"}
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFile}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
      )}
      {error && (
        <div style={{ fontSize: "0.75rem", color: "var(--rust-light)" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function CloseModal({ project, onClose, queryClient }) {
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/special-projects/${project.id}/close`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-projects"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">Close Project — {project.title}</div>
        <p style={{ fontSize: "0.85rem" }}>
          Fund balance remaining:{" "}
          <strong>₹{project.balance.toLocaleString("en-IN")}</strong>
        </p>
        {project.balance > 0 ? (
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            This unused amount will be moved into the main cashbook as one entry
            ("Unused budget returned from project: {project.title}"), and the
            project will be marked CLOSED and archived here.
          </p>
        ) : (
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            No leftover balance — the project will simply be marked CLOSED.
          </p>
        )}
        <div className="form-group">
          <label className="form-label">Closing note (optional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Closing…" : "Confirm & Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
