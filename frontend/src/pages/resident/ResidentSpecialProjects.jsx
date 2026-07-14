import { useQuery } from "@tanstack/react-query";
import { HardHat, QrCode, Paperclip } from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, Badge } from "../../components/ui";

const STATUS_TONE = {
  COLLECTING: "gold",
  IN_PROGRESS: "rust",
  COMPLETED: "sage",
  CLOSED: "muted",
};

export default function ResidentSpecialProjects() {
  const { user } = useAuth();
  const flatId = user?.flat?.id;

  const { data: projects, isLoading } = useQuery({
    queryKey: ["special-projects"],
    queryFn: async () => (await api.get("/special-projects")).data,
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/settings")).data,
  });

  const visible = (projects || []).filter((p) => p.status !== "CLOSED" || true);

  return (
    <div>
      <PageHeader
        title="Special Projects"
        description="One-off society works and your flat's share of each. Scan the QR
        below to pay directly."
      />

      {settings?.qrCodeUrl && (
        <div className="card qr-card" style={{ marginBottom: 20 }}>
          <QrCode size={16} color="var(--gold-light)" />
          <div style={{ fontWeight: 600 }}>Pay via QR</div>
          <img src={settings.qrCodeUrl} alt="Payment QR code" />
          {settings.qrCodeNote && (
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {settings.qrCodeNote}
            </div>
          )}
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            After paying, let the admin know so it can be recorded against your
            flat.
          </div>
        </div>
      )}

      {isLoading && <div className="empty-state">Loading…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((p) => {
          const myShare = p.shares.find((s) => s.flatId === flatId);
          const myPaid = p.payments
            .filter((pay) => pay.flatId === flatId)
            .reduce((sum, pay) => sum + pay.amount, 0);
          const myOutstanding = myShare
            ? Math.max(myShare.dueAmount - myPaid, 0)
            : null;
          const pct = p.targetAmount
            ? Math.min(
                100,
                Math.round((p.totalCollected / p.targetAmount) * 100)
              )
            : 0;

          return (
            <div key={p.id} className="card card-body">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 4,
                }}
              >
                <HardHat size={16} color="var(--gold-light)" />
                <div
                  style={{
                    fontFamily: "Fraunces, serif",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  {p.title}
                </div>
                <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              </div>
              {p.description && (
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    marginBottom: 10,
                  }}
                >
                  {p.description}
                </p>
              )}

              <div className="progress-track" style={{ marginBottom: 6 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginBottom: 10,
                }}
              >
                Society-wide: ₹{p.totalCollected.toLocaleString("en-IN")} of ₹
                {p.targetAmount.toLocaleString("en-IN")} collected ({pct}%)
              </div>
              <div className="summary-bar" style={{ marginBottom: 14 }}>
                <div className="summary-chip">
                  Total collected
                  <strong>₹{p.totalCollected.toLocaleString("en-IN")}</strong>
                </div>
                <div className="summary-chip">
                  Total spent
                  <strong>₹{p.totalSpent.toLocaleString("en-IN")}</strong>
                </div>
                <div className="summary-chip">
                  Fund balance
                  <strong>₹{p.balance.toLocaleString("en-IN")}</strong>
                </div>
              </div>

              {myShare ? (
                <>
                  <div className="summary-bar" style={{ marginBottom: 8 }}>
                    <div className="summary-chip">
                      My share
                      <strong>
                        ₹{myShare.dueAmount.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div className="summary-chip">
                      I've paid
                      <strong>₹{myPaid.toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="summary-chip">
                      Outstanding
                      <strong
                        style={{
                          color:
                            myOutstanding > 0
                              ? "var(--rust-light)"
                              : "var(--sage-light)",
                        }}
                      >
                        ₹{myOutstanding.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                  {(() => {
                    const totalSqFt = p.shares.reduce(
                      (s, sh) => s + sh.areaSqFt,
                      0
                    );
                    const ownerPct = totalSqFt
                      ? (myShare.areaSqFt / totalSqFt) * 100
                      : 0;
                    const ratePerSqFt = myShare.areaSqFt
                      ? myShare.dueAmount / myShare.areaSqFt
                      : 0;
                    return (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        How this was calculated: your flat's area (
                        {myShare.areaSqFt} sq.ft) is {ownerPct.toFixed(2)}% of
                        the total {totalSqFt.toLocaleString("en-IN")} sq.ft
                        across all flats in this project, at ₹
                        {ratePerSqFt.toFixed(2)}/sq.ft — so ₹{myShare.areaSqFt}{" "}
                        × ₹{ratePerSqFt.toFixed(2)} = ₹
                        {myShare.dueAmount.toLocaleString("en-IN")}.
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  Your flat isn't part of this project's split.
                </div>
              )}

              {!!p.expenses?.length && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: 8,
                    }}
                  >
                    Expenses ({p.expenses.length}) — spent so far ₹
                    {p.totalSpent.toLocaleString("en-IN")}
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Bill</th>
                          <th className="right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.expenses.map((ex) => (
                          <tr key={ex.id}>
                            <td>
                              {new Date(ex.date).toLocaleDateString("en-IN")}
                            </td>
                            <td style={{ fontSize: "0.82rem" }}>
                              {ex.description}
                            </td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && !visible.length && (
          <div className="empty-state">No special projects yet.</div>
        )}
      </div>
    </div>
  );
}
