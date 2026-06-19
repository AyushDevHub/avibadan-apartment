import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  AlertCircle,
  TrendingDown,
  UserCog,
  BookOpen,
  Landmark,
  Megaphone,
  MessageSquare,
  FileBarChart,
  Eye,
  LogOut,
  Building2,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const ADMIN_NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/residents", label: "Residents", icon: Users },
  { to: "/admin/maintenance", label: "Bills", icon: Receipt },
  { to: "/admin/payments", label: "Payments", icon: Wallet },
  { to: "/admin/dues", label: "Dues", icon: AlertCircle },
  { to: "/admin/expenses", label: "Expenses", icon: TrendingDown },
  { to: "/admin/staff", label: "Staff", icon: UserCog },
  { to: "/admin/cashbook", label: "Cashbook", icon: BookOpen },
  { to: "/admin/bank", label: "Bank Ledger", icon: Landmark },
  { to: "/admin/notices", label: "Notices", icon: Megaphone },
  { to: "/admin/complaints", label: "Complaints", icon: MessageSquare },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/transparency", label: "Transparency", icon: Eye },
];

const RESIDENT_NAV = [
  { to: "/resident/dashboard", label: "My Dues", icon: LayoutDashboard },
  { to: "/resident/notices", label: "Notices", icon: Megaphone },
  { to: "/resident/complaints", label: "Complaints", icon: MessageSquare },
  { to: "/transparency", label: "Transparency", icon: Eye },
];

const ADMIN_BOTTOM = [
  { to: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/admin/payments", label: "Payments", icon: Wallet },
  { to: "/admin/dues", label: "Dues", icon: AlertCircle },
  { to: "/admin/expenses", label: "Expenses", icon: TrendingDown },
  { to: "/admin/notices", label: "Notices", icon: Megaphone },
];
const RESIDENT_BOTTOM = [
  { to: "/resident/dashboard", label: "My Dues", icon: LayoutDashboard },
  { to: "/resident/notices", label: "Notices", icon: Megaphone },
  { to: "/resident/complaints", label: "Issues", icon: MessageSquare },
  { to: "/transparency", label: "Finances", icon: Eye },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const nav = isAdmin ? ADMIN_NAV : RESIDENT_NAV;
  const bottomNav = isAdmin ? ADMIN_BOTTOM : RESIDENT_BOTTOM;
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <div
        className={`backdrop ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            <Building2 size={20} className="sidebar-brand-icon" />
            <div>
              <div className="sidebar-brand-name">AVIBADAN</div>
              <div className="sidebar-brand-sub">Apartment Portal</div>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">
            {isAdmin ? "Administrator" : `Flat ${user?.flat?.flatNumber || ""}`}
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-title">
            <Building2 size={18} className="topbar-gold" />
            AVIBADAN
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav">
        {bottomNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
