import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Button } from "../../components/ui";

const PHRASE = "RESET ALL TRANSACTIONS";

export default function Settings() {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/admin/reset-transactions", { confirm: confirmText }),
    onSuccess: () => {
      setDone(true);
      setConfirmText("");
      queryClient.invalidateQueries();
    },
  });

  return (
    <div>
      <PageHeader title="Settings" description="Account and data management." />

      <div
        className="card card-body"
        style={{ borderColor: "var(--rust)", maxWidth: 560 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <AlertTriangle size={18} color="var(--rust-light)" />
          <div
            className="card-title"
            style={{ marginBottom: 0, color: "var(--rust-light)" }}
          >
            Danger Zone
          </div>
        </div>

        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          This permanently deletes{" "}
          <strong style={{ color: "var(--text)" }}>every</strong> maintenance
          bill, payment, expense, salary payment, and every line in the Cashbook
          and Bank Ledger. There is no undo.
        </p>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          Your flats, resident logins, and staff records are{" "}
          <strong style={{ color: "var(--text)" }}>kept</strong> - you won't
          need to recreate anyone's login.
        </p>

        {done ? (
          <p style={{ fontSize: "0.85rem", color: "var(--sage-light)" }}>
            Done. All transactions have been reset. Go to Cashbook → Manual
            Entry to set a new opening balance.
          </p>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">
                Type{" "}
                <code style={{ color: "var(--rust-light)" }}>{PHRASE}</code> to
                confirm
              </label>
              <input
                className="form-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={PHRASE}
              />
            </div>
            {mutation.isError && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--rust-light)",
                  marginBottom: 12,
                }}
              >
                {mutation.error.response?.data?.message ||
                  "Something went wrong"}
              </p>
            )}
            <Button
              variant="primary"
              disabled={confirmText !== PHRASE || mutation.isPending}
              onClick={() => {
                if (confirm("Are you absolutely sure? This cannot be undone."))
                  mutation.mutate();
              }}
            >
              {mutation.isPending ? "Resetting…" : "Reset All Transactions"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
