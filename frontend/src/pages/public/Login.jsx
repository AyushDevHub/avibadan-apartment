import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in (e.g. token still valid from before) - skip the form entirely.
  useEffect(() => {
    if (user) {
      navigate(
        user.role === "ADMIN" ? "/admin/dashboard" : "/resident/dashboard",
        { replace: true }
      );
    }
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(
        user.role === "ADMIN" ? "/admin/dashboard" : "/resident/dashboard",
        { replace: true }
      );
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-brand">
          <Building2 size={24} color="var(--rust)" />
          <span className="login-brand-name">AVIBADAN APARTMENT</span>
        </div>

        <div className="card login-card">
          <div className="login-title">Sign in</div>
          <div className="login-sub">
            Enter your name and password to continue
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name (username)</label>
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                required
                className="form-input"
                placeholder="e.g. pradyut"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ justifyContent: "center" }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>

        <div className="login-back">
          <Link to="/">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
