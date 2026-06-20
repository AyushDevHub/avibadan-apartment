import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, Pencil, HandCoins } from "lucide-react";
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

export default function Expenses() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ month: "", category: "" });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...expense} = edit
  const [showContribution, setShowContribution] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => (await api.get("/expenses", { params: filters })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const total = data?.reduce((s, e) => s + e.amount, 0) || 0;
  const cashTotal =
    data?.filter((e) => !e.paidByFlatId).reduce((s, e) => s + e.amount, 0) || 0;

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Society expenses by category."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              onClick={() => setShowContribution(true)}
            >
              <HandCoins size={15} />
              Resident Contribution
            </Button>
            <Button
              onClick={() =>
                setEditing({
                  category: CATS[0],
                  amount: "",
                  date: today(),
                  description: "",
                })
              }
            >
              <Plus size={15} />
              Add Expense
            </Button>
          </div>
        }
      />

      <div className="filter-bar">
        <input
          type="month"
          className="form-input"
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
        />
        <select
          className="form-select"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {CATS.map((c) => (
            <option key={c} value={c}>
              {c.replace("_", " ")}
            </option>
          ))}
        </select>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
          }}
        >
          Total:{" "}
          <span
            className="mono"
            style={{ color: "var(--rust-light)", fontWeight: 600 }}
          >
            ₹{total.toLocaleString("en-IN")}
          </span>{" "}
          (<span className="mono">₹{cashTotal.toLocaleString("en-IN")}</span>{" "}
          from cash)
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Funded By</th>
              <th className="right">Amount</th>
              <th className="right">Actions</th>
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
            {data?.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(e.date).toLocaleDateString("en-IN")}
                </td>
                <td>
                  <Badge tone="ink">{e.category.replace("_", " ")}</Badge>
                </td>
                <td>{e.description}</td>
                <td>
                  {e.paidByFlat ? (
                    <Badge tone="gold">
                      {e.paidByFlat.flatNumber} (waived)
                    </Badge>
                  ) : (
                    <span
                      style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}
                    >
                      Cash box
                    </span>
                  )}
                </td>
                <td className="right mono">
                  ₹{Number(e.amount).toLocaleString("en-IN")}
                </td>
                <td className="right" style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="btn-icon"
                    onClick={() =>
                      setEditing({ ...e, date: e.date.slice(0, 10) })
                    }
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      if (confirm("Delete this expense?"))
                        deleteMutation.mutate(e.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.length && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No expenses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ExpenseForm
          expense={editing}
          onClose={() => setEditing(null)}
          queryClient={queryClient}
        />
      )}
      {showContribution && (
        <ContributionForm
          onClose={() => setShowContribution(false)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function ExpenseForm({ expense, onClose, queryClient }) {
  const isEdit = !!expense.id;
  const [category, setCategory] = useState(expense.category);
  const [amount, setAmount] = useState(expense.amount);
  const [date, setDate] = useState(expense.date);
  const [description, setDescription] = useState(expense.description);

  const mutation = useMutation({
    mutationFn: () => {
      const body = { category, amount: Number(amount), date, description };
      return isEdit
        ? api.put(`/expenses/${expense.id}`, body)
        : api.post("/expenses", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
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
        <div className="modal-title">
          {isEdit ? "Edit Expense" : "Add Expense"}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
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
            <label className="form-label">Description</label>
            <input
              required
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {isEdit && expense.paidByFlatId && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              This was a resident-funded contribution. Editing here only updates
              the expense record - it does not change the waiver already applied
              to their dues.
            </p>
          )}
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

function ContributionForm({ onClose, queryClient }) {
  const [flatId, setFlatId] = useState("");
  const [category, setCategory] = useState(CATS[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");

  const { data: flats } = useQuery({
    queryKey: ["flats"],
    queryFn: async () => (await api.get("/flats")).data,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/expenses/contribution", {
        flatId,
        category,
        amount: Number(amount),
        date,
        description,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["flats"] });
      queryClient.invalidateQueries({ queryKey: ["dues"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      const n = res.data.paymentsCreated.length;
      alert(
        `Recorded. ₹${Number(amount).toLocaleString(
          "en-IN"
        )} waived against ${n} bill${n !== 1 ? "s" : ""}.`
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
        <div className="modal-title">Resident Contribution (Auto-Waiver)</div>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          Use this when a resident pays an expense directly (e.g. the
          electricity bill) instead of giving you cash. It records the expense
          WITHOUT touching your cash-in-hand, and automatically waives the same
          amount against their oldest unpaid maintenance bills.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Flat (who paid)</label>
            <select
              required
              className="form-select"
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
            >
              <option value="">Select a flat</option>
              {flats?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flatNumber} — {f.ownerName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Expense Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount Paid (₹)</label>
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
            <label className="form-label">Description</label>
            <input
              required
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. June electricity bill paid directly"
            />
          </div>
          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending || !flatId}>
              {mutation.isPending ? "Processing…" : "Record & Auto-Waive"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
