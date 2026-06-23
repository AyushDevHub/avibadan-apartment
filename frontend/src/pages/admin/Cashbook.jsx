import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Badge, Button } from "../../components/ui";

const today = () => new Date().toISOString().slice(0, 10);

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
    onError: (err) => alert(err.response?.data?.message || "Could not delete"),
  });

  const viewingPeriod = month || year;

  return (
    <div>
      <PageHeader
        title="Cashbook"
        description="Opening balance + collections − expenses = closing balance."
        action={
          <Button onClick={() => setEditing({})}>
            <Plus size={15} />
            Manual Entry
          </Button>
        }
      />

      <div className="stat-grid cols-4" style={{ marginBottom: 8 }}>
        <div className="stat-card">
          <div className="stat-label">Cash in Hand (today)</div>
          <div className="stat-value sage">
            ₹{Number(data?.cashInHand || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            {viewingPeriod ? "Opening (period)" : "Opening Balance"}
          </div>
          <div className="stat-value">
            ₹{Number(data?.openingBalance || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Collections</div>
          <div className="stat-value sage">
            ₹{Number(data?.totalIn || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expenses</div>
          <div className="stat-value rust">
            ₹{Number(data?.totalOut || 0).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {viewingPeriod && (
        <div
          className="stat-grid"
          style={{ marginBottom: 20, gridTemplateColumns: "1fr" }}
        >
          <div className="stat-card">
            <div className="stat-label">Closing Balance for this period</div>
            <div
              className={`stat-value ${
                data?.closingBalance >= 0 ? "sage" : "rust"
              }`}
            >
              ₹{Number(data?.closingBalance || 0).toLocaleString("en-IN")}
            </div>
            <div className="stat-sub">
              This is opening + collections − expenses. "Cash in Hand" above is
              always today's real balance, not this period's.
            </div>
          </div>
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <input
          type="month"
          className="form-input"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            if (e.target.value) setYear("");
          }}
          placeholder="Filter by month"
        />
        <select
          className="form-select"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            if (e.target.value) setMonth("");
          }}
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
            Clear filter
          </Button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th className="right">Amount</th>
              <th className="right">Balance</th>
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
            {data?.transactions?.map((t) => (
              <tr key={t.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(t.date).toLocaleDateString("en-IN")}
                </td>
                <td>
                  <Badge tone={t.type === "IN" ? "sage" : "rust"}>
                    {t.type}
                  </Badge>
                </td>
                <td style={{ fontSize: "0.8rem" }}>{t.description}</td>
                <td className="right mono">
                  {t.type === "IN" ? "+" : "-"}₹
                  {Number(t.amount).toLocaleString("en-IN")}
                </td>
                <td className="right mono">
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
                      via {t.refType?.toLowerCase()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && !data?.transactions?.length && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No entries for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ManualForm
          entry={editing}
          onClose={() => setEditing(null)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function ManualForm({ entry, onClose, queryClient }) {
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
          {isEdit ? "Edit Manual Entry" : "Manual Cash Entry"}
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
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="IN">Cash In</option>
                <option value="OUT">Cash Out</option>
              </select>
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
            />
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
