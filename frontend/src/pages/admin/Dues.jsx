import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { PageHeader, Badge } from "../../components/ui";

export default function Dues() {
  const { data, isLoading } = useQuery({
    queryKey: ["dues"],
    queryFn: async () => (await api.get("/dues")).data,
  });

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
