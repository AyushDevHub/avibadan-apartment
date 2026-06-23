import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Badge } from "../../components/ui";

const TT = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: "0.78rem",
};

const TYPE_TONE = { PAYMENT: "sage", EXPENSE: "rust", BILL: "ink" };
const TYPE_LABEL = { PAYMENT: "Payment", EXPENSE: "Expense", BILL: "Bill" };

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Society-wide financial snapshot."
      />
      {isLoading && <div className="empty-state">Loading…</div>}
      {data && (
        <>
          <div className="stat-grid cols-4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Cash in Hand</div>
              <div className="stat-value sage">
                ₹{Number(data.cashInHand).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bank Balance</div>
              <div className="stat-value sage">
                ₹{Number(data.bankBalance).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Dues</div>
              <div className="stat-value rust">
                ₹{Number(data.totalDue).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">This Month Collection</div>
              <div className="stat-value gold">
                ₹{Number(data.monthlyCollection).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">This Month Expense</div>
              <div className="stat-value rust">
                ₹{Number(data.monthlyExpense).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="card chart-box" style={{ marginBottom: 20 }}>
            <div className="card-title">Income vs Expense — 12 months</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.incomeVsExpense}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickFormatter={(m) => m.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Tooltip
                  formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                  contentStyle={TT}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="var(--sage)"
                  strokeWidth={2}
                  name="Income"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="var(--rust)"
                  strokeWidth={2}
                  name="Expense"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="card-title">Recent Activity</div>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginTop: -8,
                  marginBottom: 12,
                }}
              >
                Latest 20 — payments, expenses, bills — sorted by date.
              </p>
            </div>
            <div
              className="table-wrap"
              style={{ borderRadius: 0, borderTop: "1px solid var(--border)" }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Details</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activity?.map((a, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                        {new Date(a.date).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        <Badge tone={TYPE_TONE[a.type]}>
                          {TYPE_LABEL[a.type]}
                        </Badge>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>{a.label}</td>
                      <td
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {a.sub}
                      </td>
                      <td>
                        {a.receiptId && (
                          <a
                            href={`${API}/receipts/${a.receiptId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="receipt-link"
                          >
                            <Download size={12} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!data.activity?.length && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
