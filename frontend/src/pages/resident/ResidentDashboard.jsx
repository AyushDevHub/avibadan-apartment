import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, Badge, statusTone } from "../../components/ui";

export default function ResidentDashboard() {
  const { user } = useAuth();
  const flatId = user?.flat?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["flat", flatId],
    queryFn: async () => (await api.get(`/flats/${flatId}`)).data,
    enabled: !!flatId,
  });
  const { data: fund } = useQuery({
    queryKey: ["fund-status"],
    queryFn: async () => (await api.get("/dashboard/fund-status")).data,
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description={`Flat ${
          data?.flatNumber || ""
        } — dues, payments and society funds.`}
      />

      {/* Society-wide funds - visible to everyone */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Society Cash in Hand</div>
          <div className="stat-value sage">
            ₹{Number(fund?.cashInHand || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Society Bank Balance</div>
          <div className="stat-value sage">
            ₹{Number(fund?.bankBalance || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <Link to="/transparency" className="pub-cta-card">
          <Eye size={18} color="var(--gold-light)" />
          <div className="pub-cta-card-title">Society Expenses</div>
          <div className="pub-cta-card-sub">View the transparency register</div>
        </Link>
      </div>

      {isLoading && <div className="empty-state">Loading…</div>}
      {data && (
        <>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">My Monthly Maintenance</div>
              <div className="stat-value">
                ₹{Number(data.monthlyRate).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">My Outstanding Due</div>
              <div
                className={`stat-value ${data.totalDue > 0 ? "rust" : "sage"}`}
              >
                ₹{Number(data.totalDue).toLocaleString("en-IN")}
              </div>
            </div>
            {data.creditBalance > 0 && (
              <div className="stat-card">
                <div className="stat-label">My Credit Balance</div>
                <div className="stat-value gold">
                  ₹{Number(data.creditBalance).toLocaleString("en-IN")}
                </div>
                {data.creditProjection?.coveredUntilLabel && (
                  <div className="stat-sub">
                    paid through {data.creditProjection.coveredUntilLabel}
                  </div>
                )}
              </div>
            )}
          </div>

          {data.creditBalance > 0 && (
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: -14,
                marginBottom: 24,
              }}
            >
              {data.creditProjection?.coveredUntilLabel ? (
                <>
                  You have ₹{Number(data.creditBalance).toLocaleString("en-IN")}{" "}
                  in credit, carried forward from an overpayment. This covers
                  your next {data.creditProjection.monthsCovered} month
                  {data.creditProjection.monthsCovered !== 1 ? "s" : ""} of
                  maintenance automatically — you're paid up through{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {data.creditProjection.coveredUntilLabel}
                  </strong>
                  . Your next real payment isn't due until{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {data.creditProjection.nextPayableLabel}
                  </strong>
                  .
                </>
              ) : (
                <>
                  You have ₹{Number(data.creditBalance).toLocaleString("en-IN")}{" "}
                  in credit, carried forward from an overpayment. It will
                  automatically reduce your next maintenance bill.
                </>
              )}
            </p>
          )}

          <div className="chart-grid">
            <div>
              <div className="card-title" style={{ marginBottom: 8 }}>
                My Maintenance Bills
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
                    {!data.bills.length && (
                      <tr>
                        <td colSpan={3} className="empty">
                          No bills yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="card-title" style={{ marginBottom: 8 }}>
                My Payment History & Receipts
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
                          <Badge
                            tone={p.mode === "ADJUSTMENT" ? "ink" : "sage"}
                          >
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
        </>
      )}
    </div>
  );
}
