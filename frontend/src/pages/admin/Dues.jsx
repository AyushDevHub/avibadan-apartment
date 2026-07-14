import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { PageHeader, Badge } from "../../components/ui";

const CELL_LABEL = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  WAIVED: "Waived",
  "N/A": "—",
};
const CELL_TONE = {
  PAID: "sage",
  PARTIAL: "gold",
  UNPAID: "rust",
  WAIVED: "muted",
  "N/A": "muted",
};

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${MONTHS[m - 1]} '${String(y).slice(2)}`;
}

export default function Dues() {
  const [months, setMonths] = useState(6);
  const [onlyPending, setOnlyPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dues"],
    queryFn: async () => (await api.get("/dues")).data,
  });

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ["dues-matrix", months],
    queryFn: async () => (await api.get(`/dues/matrix?months=${months}`)).data,
  });

  const matrixRows = (matrix?.flats || []).filter(
    (f) => !onlyPending || f.unpaidCount > 0
  );

  return (
    <div>
      <PageHeader
        title="Dues"
        description="Rate-based outstanding dues and credits — accurate even without generating bills first."
      />

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value rust">
            ₹{Number(data?.totalOutstanding || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Credit Held</div>
          <div className="stat-value gold">
            ₹{Number(data?.totalCredit || 0).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* ── AT-A-GLANCE MONTHLY PAYMENT MATRIX ── */}
      <div className="card card-body" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>
              Who's Paid — At a Glance
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Every resident, every recent month, in one grid.
            </div>
          </div>
          <div className="action-bar">
            <select
              className="form-select"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
              />
              Only show flats with something pending
            </label>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            margin: "10px 0",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <span>
            <Badge tone="sage">Paid</Badge>
          </span>
          <span>
            <Badge tone="gold">Partial</Badge>
          </span>
          <span>
            <Badge tone="rust">Unpaid</Badge>
          </span>
          <span>
            <Badge tone="muted">Waived / N/A</Badge>
          </span>
        </div>

        {matrixLoading && <div className="empty-state">Loading…</div>}

        {!matrixLoading && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Flat</th>
                  <th>Owner</th>
                  {matrix?.columns.map((m) => (
                    <th key={m} className="right">
                      {monthLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((f) => (
                  <tr key={f.flatId}>
                    <td>
                      <Link
                        to={`/admin/residents/${f.flatId}`}
                        className="table-link"
                        style={{ fontWeight: 500 }}
                      >
                        {f.flatNumber}
                      </Link>
                    </td>
                    <td>{f.ownerName}</td>
                    {f.cells.map((c) => (
                      <td key={c.month} className="right">
                        <Badge tone={CELL_TONE[c.status]}>
                          {CELL_LABEL[c.status]}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                ))}
                {!matrixRows.length && (
                  <tr>
                    <td
                      colSpan={(matrix?.columns.length || 0) + 2}
                      className="empty-state"
                    >
                      {onlyPending
                        ? "Nobody has anything pending in this window 🎉"
                        : "No active flats found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Flat</th>
              <th>Owner</th>
              <th className="right">Rate/mo</th>
              <th className="right">Total Due</th>
              <th className="right">Credit</th>
              <th>Credit Covers</th>
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
            {data?.flats?.map((f) => (
              <tr key={f.flatId}>
                <td>
                  <Link
                    to={`/admin/residents/${f.flatId}`}
                    className="table-link"
                    style={{ fontWeight: 500 }}
                  >
                    {f.flatNumber}
                  </Link>
                </td>
                <td>{f.ownerName}</td>
                <td className="right mono">
                  ₹{Number(f.monthlyRate).toLocaleString("en-IN")}
                </td>
                <td className="right">
                  {f.totalDue > 0 ? (
                    <Badge tone="rust">
                      ₹{f.totalDue.toLocaleString("en-IN")}
                    </Badge>
                  ) : (
                    <Badge tone="sage">Nil</Badge>
                  )}
                </td>
                <td className="right">
                  {f.creditBalance > 0 ? (
                    <Badge tone="gold">
                      +₹{f.creditBalance.toLocaleString("en-IN")}
                    </Badge>
                  ) : (
                    <span style={{ color: "var(--text-dim)" }}>—</span>
                  )}
                </td>
                <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {f.creditProjection?.coveredUntilLabel
                    ? `Paid through ${f.creditProjection.coveredUntilLabel}`
                    : f.creditBalance > 0
                    ? "Less than 1 month"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
