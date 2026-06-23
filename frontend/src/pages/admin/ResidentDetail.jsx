import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, KeyRound, X } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Badge, statusTone, Button } from "../../components/ui";

export default function ResidentDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showLoginForm, setShowLoginForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["flat", id],
    queryFn: async () => (await api.get(`/flats/${id}`)).data,
  });
  const { data: logins } = useQuery({
    queryKey: ["flat-users", id],
    queryFn: async () => (await api.get(`/auth/residents/${id}`)).data,
  });

  if (isLoading) return <div className="empty-state">Loading…</div>;
  if (!data) return null;

  return (
    <div>
      <Link
        to="/admin/residents"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} /> Back to residents
      </Link>
      <PageHeader
        title={`${data.flatNumber} — ${data.ownerName}`}
        action={
          <Button onClick={() => setShowLoginForm(true)}>
            <KeyRound size={15} />
            Create Login
          </Button>
        }
      />

      <div className="stat-grid cols-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Monthly Rate</div>
          <div className="stat-value">
            ₹{Number(data.monthlyRate).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding Due</div>
          <div className={`stat-value ${data.totalDue > 0 ? "rust" : "sage"}`}>
            ₹{Number(data.totalDue).toLocaleString("en-IN")}
          </div>
        </div>
        {data.creditBalance > 0 && (
          <div className="stat-card">
            <div className="stat-label">Credit Balance</div>
            <div className="stat-value gold">
              ₹{Number(data.creditBalance).toLocaleString("en-IN")}
            </div>
            {data.creditProjection?.coveredUntilLabel ? (
              <div className="stat-sub">
                Covers {data.creditProjection.monthsCovered} month
                {data.creditProjection.monthsCovered !== 1 ? "s" : ""} — paid
                through {data.creditProjection.coveredUntilLabel}. Next payment
                due {data.creditProjection.nextPayableLabel}.
              </div>
            ) : (
              <div className="stat-sub">
                Less than one month's rate — carries forward to next bill
              </div>
            )}
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">Logins</div>
          {logins?.length ? (
            <div
              style={{
                fontSize: "0.82rem",
                marginTop: 6,
                color: "var(--text)",
              }}
            >
              {logins.map((u) => (
                <div key={u.id}>
                  {u.name} —{" "}
                  <span className="mono" style={{ color: "var(--text-muted)" }}>
                    {u.username}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: "0.78rem",
                marginTop: 6,
                color: "var(--text-dim)",
              }}
            >
              No login created yet
            </div>
          )}
        </div>
      </div>

      <div className="chart-grid">
        <div>
          <div className="card-title" style={{ marginBottom: 8 }}>
            Maintenance Bills
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.bills.map((b) => (
                  <tr key={b.id}>
                    <td>{b.month}</td>
                    <td className="right mono">
                      ₹{Number(b.amount).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card-title" style={{ marginBottom: 8 }}>
            Payment History
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="right">Amount</th>
                  <th>Mode</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(p.date).toLocaleDateString("en-IN")}
                    </td>
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
                          }/receipts/group/${encodeURIComponent(
                            p.groupReceiptNo
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="receipt-link"
                        >
                          <Download size={13} />
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
                          <Download size={13} />
                          {p.receiptNo}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {!data.payments.length && (
                  <tr>
                    <td colSpan={4} className="empty">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showLoginForm && (
        <CreateLoginForm
          flatId={id}
          ownerName={data.ownerName}
          onClose={() => setShowLoginForm(false)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function CreateLoginForm({ flatId, ownerName, onClose, queryClient }) {
  const [name, setName] = useState(ownerName);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/auth/residents", {
        name,
        username: username.trim().toLowerCase(),
        password,
        flatId,
        phone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flat-users", flatId] });
      onClose();
    },
    onError: (err) =>
      setError(err.response?.data?.message || "Could not create login"),
  });

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-title">Create Login</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              required
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Username (what they type to log in)
            </label>
            <input
              required
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. pradyut"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              required
              type="text"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a simple password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <input
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <div className="modal-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create Login"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
