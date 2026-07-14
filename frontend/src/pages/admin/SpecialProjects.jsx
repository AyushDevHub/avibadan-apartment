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

  const { data: projects, isLoading } = useQuery({
    queryKey: ["special-projects"],
    queryFn: async () => (await api.get("/special-projects")).data,
  });

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

      {isLoading && <div className="empty-state">Loading…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projects?.map((p) => (
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

function ProjectCard({ project: p, expanded, onToggle, queryClient }) {
  const [tab, setTab] = useState("shares");
  const [showPayment, setShowPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status) =>
      api.patch(`/special-projects/${p.id}/status`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["special-projects"] }),
  });

  const pct = p.targetAmount
    ? Math.min(100, Math.round((p.totalCollected / p.targetAmount) * 100))
    : 0;

  return (
    <div className="card">
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
        onClick={onToggle}
      >
        <div>
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 600,
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
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
        </div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
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
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 12,
              fontSize: "0.82rem",
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
              }}
            >
              Expenses ({p.expenses.length})
            </button>
          </div>

          {tab === "shares" && (
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
          )}

          {tab === "payments" && (
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
          )}

          {tab === "expenses" && (
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
          )}
        </div>
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
