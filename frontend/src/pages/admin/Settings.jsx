import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Upload, Loader2, QrCode, X } from "lucide-react";
import api from "../../api/client";
import { PageHeader, Button } from "../../components/ui";

const PHRASE = "RESET ALL TRANSACTIONS";

function PaymentQrCard() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [noteDirty, setNoteDirty] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/settings")).data,
  });

  const noteValue = noteDirty ? note : settings?.qrCodeNote || "";

  const saveMutation = useMutation({
    mutationFn: (body) => api.patch("/settings", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setNoteDirty(false);
    },
  });

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload/bill", formData);
      saveMutation.mutate({ qrCodeUrl: res.data.url });
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card card-body" style={{ maxWidth: 560 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <QrCode size={18} color="var(--gold-light)" />
        <div className="card-title" style={{ marginBottom: 0 }}>
          Payment QR Code
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
        Upload your UPI/payment QR code here. Residents will see this on their
        Special Projects page (and can zoom in) so they can pay you directly.
      </p>

      {isLoading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {settings?.qrCodeUrl ? (
            <div
              className="qr-card"
              style={{ alignItems: "flex-start", textAlign: "left" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <img src={settings.qrCodeUrl} alt="Payment QR" />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => saveMutation.mutate({ qrCodeUrl: null })}
                >
                  <X size={13} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              No QR code uploaded yet.
            </div>
          )}

          <label
            className="btn btn-ghost"
            style={{ cursor: "pointer", width: "fit-content" }}
          >
            {uploading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Upload size={14} />
            )}
            {uploading
              ? "Uploading…"
              : settings?.qrCodeUrl
              ? "Replace QR code"
              : "Upload QR code"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
          {error && (
            <div style={{ fontSize: "0.75rem", color: "var(--rust-light)" }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ maxWidth: 400 }}>
            <label className="form-label">
              Note shown with QR (e.g. UPI ID)
            </label>
            <input
              className="form-input"
              placeholder="e.g. avibadan@upi"
              value={noteValue}
              onChange={(e) => {
                setNoteDirty(true);
                setNote(e.target.value);
              }}
              onBlur={() => saveMutation.mutate({ qrCodeNote: noteValue })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

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

      <PaymentQrCard />

      <div
        className="card card-body"
        style={{ borderColor: "var(--rust)", maxWidth: 560, marginTop: 20 }}
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
