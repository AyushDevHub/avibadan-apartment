import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Badge, Button } from "../../components/ui";

const EMPTY = {
  flatNumber: "",
  ownerName: "",
  phone: "",
  email: "",
  monthlyRate: "",
  status: "ACTIVE",
};

export default function Residents() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["flats"],
    queryFn: async () => (await api.get("/flats")).data,
  });
  const [form, setForm] = useState(null);

  const saveMutation = useMutation({
    mutationFn: async (flat) =>
      flat.id ? api.put(`/flats/${flat.id}`, flat) : api.post("/flats", flat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats"] });
      setForm(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/flats/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flats"] }),
  });

  return (
    <div>
      <PageHeader
        title="Residents"
        description="Flats, owners and monthly rates."
        action={
          <Button onClick={() => setForm(EMPTY)}>
            <Plus size={15} />
            Add Resident
          </Button>
        }
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Flat</th>
              <th>Owner</th>
              <th>Phone</th>
              <th className="right">Monthly ₹</th>
              <th className="right">Due</th>
              <th>Status</th>
              <th className="right">Actions</th>
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
            {data?.map((f) => (
              <tr key={f.id}>
                <td>
                  <Link
                    to={`/admin/residents/${f.id}`}
                    className="table-link"
                    style={{ fontWeight: 500 }}
                  >
                    {f.flatNumber}
                  </Link>
                </td>
                <td>{f.ownerName}</td>
                <td style={{ color: "var(--text-muted)" }}>{f.phone || "—"}</td>
                <td className="right mono">
                  ₹{Number(f.monthlyRate).toLocaleString("en-IN")}
                </td>
                <td className="right">
                  {f.totalDue > 0 ? (
                    <Badge tone="rust">
                      ₹{f.totalDue.toLocaleString("en-IN")}
                    </Badge>
                  ) : f.creditBalance > 0 ? (
                    <div>
                      <Badge tone="gold">
                        +₹{f.creditBalance.toLocaleString("en-IN")} credit
                      </Badge>
                      {f.creditProjection?.coveredUntilLabel && (
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-dim)",
                            marginTop: 3,
                          }}
                        >
                          paid till {f.creditProjection.coveredUntilLabel}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge tone="sage">Settled</Badge>
                  )}
                </td>
                <td>
                  <Badge tone={f.status === "ACTIVE" ? "sage" : "ink"}>
                    {f.status}
                  </Badge>
                </td>
                <td className="right" style={{ whiteSpace: "nowrap" }}>
                  <button className="btn-icon" onClick={() => setForm(f)}>
                    <Pencil size={15} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      if (confirm(`Delete ${f.flatNumber}?`))
                        deleteMutation.mutate(f.id);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={() => setForm(null)}>
              <X size={18} />
            </button>
            <div className="modal-title">
              {form.id ? "Edit Resident" : "Add Resident"}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({
                  ...form,
                  monthlyRate: Number(form.monthlyRate),
                });
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div className="form-group">
                <label className="form-label">Flat Number</label>
                <input
                  required
                  className="form-input"
                  value={form.flatNumber}
                  onChange={(e) =>
                    setForm({ ...form, flatNumber: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Owner Name</label>
                <input
                  required
                  className="form-input"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm({ ...form, ownerName: e.target.value })
                  }
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={form.phone || ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    value={form.email || ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monthly Rate (₹)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={form.monthlyRate}
                    onChange={(e) =>
                      setForm({ ...form, monthlyRate: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="VACANT">Vacant</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
