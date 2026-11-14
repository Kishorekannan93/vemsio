import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ClipboardList,
  ChartNoAxesCombined,
  Wallet,
  LogOut,
  Menu,
  Plus,
  Upload,
  RefreshCw,
  Trash2,
  Search,
  Clock3,
  ChevronRight,
  Activity,
  Target,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  X,
  Smartphone,
  Sparkles,
  MoreHorizontal,
  CircleHelp,
  CheckCircle2,
  AlertTriangle,
  Filter,
  ArrowUpRight,
  Gauge,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import "./style.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vemsio_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const roleNav = {
  Admin: [
    ["Overview", "overview"],
    ["Users", "users"],
    ["Projects", "projects"],
    ["Operator History", "operator"],
    // ["Project Leader", "leader"],
    ["Performance", "performance"],
    ["Accounts", "accounts"],
  ],
  "Project Leader": [
    ["Overview", "overview"],
    ["Work Entry", "work"],
    ["Monitoring", "operator"],
    ["Reports", "leader"],
    ["Performance", "performance"],
  ],
  Employee: [
    ["Overview", "overview"],
    ["Work Entry", "work"],
    ["My History", "operator"],
  ],
  Accounts: [
    ["Overview", "overview"],
    ["Accounts Entries", "accounts"],
    ["Projects", "projects"],
  ],
};
const navIcons = {
  overview: LayoutDashboard,
  users: Users,
  projects: FolderKanban,
  operator: ClipboardList,
  work: Clock3,
  leader: ClipboardList,
  performance: ChartNoAxesCombined,
  accounts: Wallet,
};
const palette = ["#167541", "#22a78b", "#f2a541", "#ed6b78", "#4b9be8"];

function Login({ onLogin }) {
  const [emp, setEmp] = useState(""),
    [password, setPassword] = useState(""),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/login", { emp_id: emp, password });
      localStorage.setItem("vemsio_token", data.token);
      onLogin(data.user);
    } catch (error) {
      setErr(error.response?.data?.message || "Unable to connect to server");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-art">
        <div className="login-brand">
          <span className="brand-mark">V</span>
          <span>
            <b>VEMSIO</b>
            <small>WORKSPACE</small>
          </span>
        </div>
        <div className="login-message">
          <span className="eyebrow">ONE WORKSPACE. CLEAR PROGRESS.</span>
          <h1>
            Work smarter.
            <br />
            <em>See the progress.</em>
          </h1>
          <p>Projects, people and performance — all in one clear view.</p>
          <div className="login-orbit">
            <div className="orbit-core">V</div>
            <span className="orbit-chip chip-a">
              <Activity size={15} /> Live activity
            </span>
            <span className="orbit-chip chip-b">
              <Target size={15} /> Clear targets
            </span>
            <span className="orbit-chip chip-c">
              <TrendingUp size={15} /> Better insights
            </span>
          </div>
        </div>
        <small className="login-foot">
          Vemsio · Workforce & Project Management
        </small>
      </div>
      <div className="login-side">
        <form className="login-card" onSubmit={submit}>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your workspace</h2>
          <p className="muted">
            Use the employee ID and password provided by your administrator.
          </p>
          <label>Employee ID</label>
          <input
            value={emp}
            onChange={(e) => setEmp(e.target.value)}
            placeholder="Enter employee ID"
            autoComplete="username"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />
          {err && <p className="error">{err}</p>}
          <button className="primary wide" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <ChevronRight size={17} />
          </button>
          <small className="login-help">
            Accounts are created by your administrator.
          </small>
        </form>
      </div>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true);
  useEffect(() => {
    if (localStorage.getItem("vemsio_token"))
      api
        .get("/auth/me")
        .then((r) => setUser(r.data.user))
        .catch(() => localStorage.removeItem("vemsio_token"))
        .finally(() => setChecking(false));
    else setChecking(false);
  }, []);
  function logout() {
    localStorage.removeItem("vemsio_token");
    setUser(null);
  }
  if (checking)
    return (
      <div className="app-loading">
        <span className="loader" />
        Preparing your workspace…
      </div>
    );
  return user ? (
    <Dashboard user={user} logout={logout} />
  ) : (
    <Login onLogin={setUser} />
  );
}

function Dashboard({ user, logout }) {
  const [page, setPage] = useState("overview"),
    [data, setData] = useState([]),
    [stats, setStats] = useState({}),
    [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(""),
    [projects, setProjects] = useState({ modules: [], dispatched: [] }),
    [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [notice, setNotice] = useState("");
  const [summaryDate, setSummaryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [summary, setSummary] = useState({
    remaining: "08:30",
    production: "00:00",
    extra: "00:00",
    capacity: "08:30",
  });
  const [menuOpen, setMenuOpen] = useState(false),
    [performanceRange, setPerformanceRange] = useState("30"),
    [selectedInsight, setSelectedInsight] = useState("efficiency"),
    [performanceTrend, setPerformanceTrend] = useState([]);
  const nav = roleNav[user.role] || roleNav.Employee;

  async function load() {
    setLoading(true);
    try {
      const [dash, projectData] = await Promise.all([
        api.get("/dashboard"),
        api.get("/projects"),
      ]);
      setStats(dash.data);
      setProjects(projectData.data);
      if (page === "work") {
        const daily = await api.get("/operator-entries/daily-summary", {
          params: { date: summaryDate },
        });
        setSummary(daily.data);
      }
      const endpoints = {
        users: "/users",
        projects: "/projects",
        operator: "/operator-entries",
        work: "/operator-entries/my",
        leader: "/project-leader-entries",
        performance: "/performance",
        accounts: "/accounts-entries",
      };
      if (endpoints[page]) {
        let result;
        if (page === "performance") {
          result = await api.get("/performance/analytics", {
            params: { days: performanceRange },
          });
          setPerformanceTrend(result.data.dailyTrend || []);
        } else result = await api.get(endpoints[page]);
        setData(
          page === "projects"
            ? result.data.modules
            : page === "performance"
              ? result.data.records || []
              : result.data,
        );
      } else setData([]);
    } catch (error) {
      setNotice(
        error.response?.data?.message ||
          "Could not load data. Check the API connection.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [page, summaryDate, performanceRange]);
  const filtered = useMemo(
    () =>
      data.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query],
  );
  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4500);
  }
  async function remove(kind, id) {
    if (!id || id === "undefined" || id === "null") {
      flash("This record has no valid ID. Refresh the page and try again.");
      return;
    }
    if (!window.confirm("Delete this record? This action cannot be undone."))
      return;
    try {
      await api.delete(`/${kind}/${encodeURIComponent(id)}`);
      flash("Record deleted successfully.");
      await load();
    } catch (error) {
      flash(
        error.response?.data?.message ||
          "Delete failed. Please check the server response.",
      );
    }
  }
  function openEdit(row) {
    setEditing(row);
    setModal(true);
  }
  function changePage(next) {
    setPage(next);
    setQuery("");
    setMenuOpen(false);
  }
  const pageTitle =
    page === "overview"
      ? "Overview"
      : nav.find((item) => item[1] === page)?.[0] || page;
  const mobileItems = nav
    .filter((item) =>
      ["overview", "work", "performance", "accounts", "operator"].includes(
        item[1],
      ),
    )
    .slice(0, 4);
  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="drawer-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <b>VEMSIO</b>
            <small>WORKSPACE</small>
          </div>
          <button
            className="drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map(([label, key]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => changePage(key)}
            >
              <NavIcon name={key} />
              <span>{label}</span>
              {page === key && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
          <div className="user-mini">
            <b>{user.name}</b>
            <small>{user.role}</small>
          </div>
          <button
            className="icon-btn logout-btn"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-btn"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div>
              <span className="eyebrow">VEMSIO / {page.toUpperCase()}</span>
              <h2>{pageTitle}</h2>
            </div>
          </div>
          <div className="top-actions">
            <span className="online-pill">
              <i /> Connected
            </span>
            <button
              className="icon-btn refresh-btn"
              onClick={load}
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>
            <div className="profile-chip">
              <div className="avatar">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <b>{user.name}</b>
                <small>{user.role}</small>
              </div>
            </div>
          </div>
        </header>
        <section className="content">
          {notice && (
            <div className="notice">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}
          {page === "overview" ? (
            <Overview stats={stats} user={user} setPage={changePage} />
          ) : (
            <>
              {page === "performance" ? (
                <PerformanceDashboard
                  rows={filtered}
                  allRows={data}
                  trend={performanceTrend}
                  loading={loading}
                  range={performanceRange}
                  setRange={setPerformanceRange}
                  selectedInsight={selectedInsight}
                  setSelectedInsight={setSelectedInsight}
                />
              ) : (
                <>
                  <div className="section-toolbar">
                    <div>
                      <span className="eyebrow">
                        WORKSPACE / {page.toUpperCase()}
                      </span>
                      <h3>{pageTitle}</h3>
                      <p>
                        {page === "operator"
                          ? "Review submitted work entries and employee activity."
                          : page === "leader"
                            ? "Track project updates and team progress."
                            : page === "accounts"
                              ? "Review project billing and dispatch records."
                              : page === "projects"
                                ? "Browse project modules and estimated delivery effort."
                                : page === "users"
                                  ? "Manage workspace users and role access."
                                  : "Submit and review your daily work."}
                      </p>
                    </div>
                    <div className="toolbar-actions">
                      <div className="search">
                        <Search size={16} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search records…"
                        />
                      </div>
                      {["users", "work", "leader", "accounts"].includes(
                        page,
                      ) && (
                        <button
                          className="primary"
                          onClick={() => {
                            setEditing(null);
                            setModal(true);
                          }}
                        >
                          <Plus size={16} /> <span>Add new</span>
                        </button>
                      )}
                      {page === "projects" && user.role === "Admin" && (
                        <label className="upload-btn">
                          <Upload size={16} /> <span>Import Excel</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            hidden
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const form = new FormData();
                              form.append("file", file);
                              try {
                                const result = await api.post(
                                  "/projects/import",
                                  form,
                                );
                                flash(result.data.message);
                                load();
                              } catch (error) {
                                flash(
                                  error.response?.data?.message ||
                                    "Import failed",
                                );
                              } finally {
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  {page === "work" && (
                    <DailyCapacity
                      summary={summary}
                      date={summaryDate}
                      setDate={setSummaryDate}
                    />
                  )}
                  {loading ? (
                    <div className="loading-panel">
                      <span className="loader" />
                      Loading records…
                    </div>
                  ) : (
                    <DataTable
                      page={page}
                      rows={filtered}
                      user={user}
                      onDelete={remove}
                      onEdit={openEdit}
                    />
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>
      <nav className="mobile-dock" aria-label="Mobile navigation">
        {mobileItems.map(([label, key]) => (
          <button
            key={key}
            className={page === key ? "active" : ""}
            onClick={() => changePage(key)}
          >
            <NavIcon name={key} />
            <span>{label === "Overview" ? "Home" : label}</span>
          </button>
        ))}
        <button onClick={() => setMenuOpen(true)}>
          <MoreHorizontal />
          <span>More</span>
        </button>
      </nav>
      {modal && (
        <EntryModal
          page={page}
          user={user}
          projects={projects.modules}
          editRecord={editing}
          defaultDate={summaryDate}
          onClose={() => {
            setModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setModal(false);
            setEditing(null);
            load();
            flash(editing ? "Updated successfully" : "Saved successfully");
          }}
        />
      )}
    </div>
  );
}

function NavIcon({ name }) {
  const Icon = navIcons[name] || LayoutDashboard;
  return <Icon size={18} strokeWidth={1.9} />;
}

function Overview({ stats, user, setPage }) {
  const employee = user.role === "Employee";
  const cards = employee
    ? [
        ["My work entries", stats.entries, "operator", ClipboardList],
        ["Active projects", stats.projects, "projects", FolderKanban],
      ]
    : [
        ["Total users", stats.users, "users", Users],
        ["Active projects", stats.projects, "projects", FolderKanban],
        ["Work entries", stats.entries, "operator", ClipboardList],
        ["Accounts records", stats.accounts, "accounts", Wallet],
      ];
  return (
    <div className="overview-page">
      <div className="welcome">
        <div>
          <span className="eyebrow">YOUR WORKSPACE AT A GLANCE</span>
          <h1>
            Hello, {user.name.split(" ")[0]} <span className="wave">✦</span>
          </h1>
          <p>Here’s the latest snapshot of your workspace.</p>
        </div>
        <div className="date-chip">
          <CalendarDays size={16} />
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>
      <div className="stats-grid">
        {cards.map(([title, value, target, Icon], index) => (
          <button
            className={`stat-card stat-${index}`}
            key={title}
            onClick={() => setPage(target)}
          >
            <div className="stat-top">
              <span>{title}</span>
              <span className="stat-icon">
                <Icon size={18} />
              </span>
            </div>
            <strong>{value ?? "—"}</strong>
            <small>
              Open details <ArrowUpRight size={13} />
            </small>
          </button>
        ))}
      </div>
      <div className="overview-grid">
        <div className="panel modules-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">QUICK ACCESS</span>
              <h3>Workspace modules</h3>
              <p>Jump back into the work that matters.</p>
            </div>
            <Sparkles size={20} />
          </div>
          <div className="quick-grid">
            {(roleNav[user.role] || roleNav.Employee)
              .filter((item) => item[1] !== "overview")
              .map(([label, key]) => (
                <button onClick={() => setPage(key)} key={key}>
                  <span className="quick-icon">
                    <NavIcon name={key} />
                  </span>
                  <span>
                    <b>{label}</b>
                    <small>
                      Open workspace <ChevronRight size={12} />
                    </small>
                  </span>
                </button>
              ))}
          </div>
        </div>
        <div className="panel capacity-panel">
          <span className="eyebrow">LEGACY RULE</span>
          <h3>Daily production capacity</h3>
          <p>
            Current calculation baseline retained from the original VMS tool.
          </p>
          <div className="capacity-number">
            08<span>:30</span>
            <small>hours / day</small>
          </div>
          <div className="capacity-track">
            <i />
          </div>
          <div className="capacity-note">
            <CheckCircle2 size={16} /> Shift-based changes are not applied.
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyCapacity({ summary, date, setDate }) {
  return (
    <div className="daily-capacity">
      <div className="capacity-head">
        <div>
          <span className="eyebrow">TODAY'S TIME BALANCE</span>
          <b>Daily production balance</b>
          <small>08:30 production capacity · based on selected date</small>
        </div>
        <label className="date-control">
          <CalendarDays size={15} />
          <input
            aria-label="Work date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="capacity-cards">
        <div>
          <small>Remaining</small>
          <strong>{summary.remaining}</strong>
        </div>
        <div>
          <small>Production used</small>
          <strong>{summary.production}</strong>
        </div>
        <div>
          <small>Extra hours</small>
          <strong>{summary.extra}</strong>
        </div>
      </div>
    </div>
  );
}

function minutes(value) {
  if (!value || typeof value !== "string") return 0;
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function hoursLabel(min) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
function PerformanceDashboard({
  rows,
  allRows,
  trend,
  loading,
  range,
  setRange,
  selectedInsight,
  setSelectedInsight,
}) {
  const [employeeFilter, setEmployeeFilter] = useState("all"),
    [projectFilter, setProjectFilter] = useState("all");
  const employees = useMemo(
    () => [...new Set(allRows.map((r) => r.emp_id).filter(Boolean))].sort(),
    [allRows],
  );
  const projects = useMemo(
    () =>
      [...new Set(allRows.map((r) => r.project_name).filter(Boolean))].sort(),
    [allRows],
  );
  const scopedRows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (employeeFilter === "all" || r.emp_id === employeeFilter) &&
          (projectFilter === "all" || r.project_name === projectFilter),
      ),
    [allRows, employeeFilter, projectFilter],
  );
  const trendFiltered = useMemo(
    () =>
      trend
        .filter(
          (r) =>
            (employeeFilter === "all" || r.emp_id === employeeFilter) &&
            (projectFilter === "all" || r.project_name === projectFilter),
        )
        .reduce((acc, r) => {
          const item = acc.find((x) => x.date === r.date);
          if (item) item.hours = +(item.hours + r.hours).toFixed(2);
          else acc.push({ date: r.date, hours: r.hours });
          return acc;
        }, []),
    [trend, employeeFilter, projectFilter],
  );
  const tableRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          (employeeFilter === "all" || r.emp_id === employeeFilter) &&
          (projectFilter === "all" || r.project_name === projectFilter),
      ),
    [rows, employeeFilter, projectFilter],
  );
  const totals = useMemo(() => {
    const estimated = scopedRows.reduce((s, r) => s + minutes(r.estimated), 0),
      actual = scopedRows.reduce((s, r) => s + minutes(r.taken), 0);
    const faster = scopedRows.filter(
      (r) => r.status?.startsWith("Excellent") || r.status?.startsWith("Good"),
    ).length;
    const onTrack = scopedRows.filter((r) =>
      r.status?.startsWith("On Track"),
    ).length;
    const needs = scopedRows.filter(
      (r) =>
        r.status?.startsWith("Fair") ||
        r.status?.startsWith("Needs Improvement"),
    ).length;
    return {
      estimated,
      actual,
      faster,
      onTrack,
      needs,
      count: scopedRows.length,
      variance: estimated
        ? Math.round(((estimated - actual) / estimated) * 100)
        : 0,
    };
  }, [scopedRows]);
  const statusData = useMemo(() => {
    const groups = [
      ["Excellent", 0],
      ["Good", 0],
      ["On Track", 0],
      ["Fair", 0],
      ["Needs Improvement", 0],
      ["Time Logged / No Data", 0],
    ];
    scopedRows.forEach((r) => {
      const s = r.status || "";
      let i = s.startsWith("Excellent")
        ? 0
        : s.startsWith("Good")
          ? 1
          : s.startsWith("On Track")
            ? 2
            : s.startsWith("Fair")
              ? 3
              : s.startsWith("Needs Improvement")
                ? 4
                : 5;
      groups[i][1]++;
    });
    return groups
      .filter((x) => x[1] > 0)
      .map(([name, value]) => ({ name, value }));
  }, [scopedRows]);
  const employeeData = useMemo(() => {
    const map = new Map();
    scopedRows.forEach((r) => {
      const k = r.emp_id || "Unknown";
      if (!map.has(k))
        map.set(k, { employee: k, estimated: 0, actual: 0, entries: 0 });
      const v = map.get(k);
      v.estimated += minutes(r.estimated);
      v.actual += minutes(r.taken);
      v.entries += Number(r.entry_count || 0);
    });
    return [...map.values()]
      .map((x) => ({
        ...x,
        estimatedHours: +(x.estimated / 60).toFixed(1),
        actualHours: +(x.actual / 60).toFixed(1),
        variance: x.estimated
          ? Math.round(((x.estimated - x.actual) / x.estimated) * 100)
          : null,
      }))
      .sort((a, b) => (b.variance ?? -999) - (a.variance ?? -999));
  }, [scopedRows]);
  const projectData = useMemo(() => {
    const map = new Map();
    scopedRows.forEach((r) => {
      const k = r.project_name || "Unassigned";
      if (!map.has(k)) map.set(k, { project: k, estimated: 0, actual: 0 });
      const v = map.get(k);
      v.estimated += minutes(r.estimated);
      v.actual += minutes(r.taken);
    });
    return [...map.values()]
      .map((x) => ({
        ...x,
        estimatedHours: +(x.estimated / 60).toFixed(1),
        actualHours: +(x.actual / 60).toFixed(1),
      }))
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 7);
  }, [scopedRows]);
  const selected =
    scopedRows.find((r) => r.status?.startsWith("Needs Improvement")) ||
    scopedRows.find((r) => r.status?.startsWith("Fair"));
  const insights = {
    efficiency: {
      title: "Estimated vs actual time",
      body: "This compares the estimated time recorded for each employee / project / module group with the actual time logged. When actual time is lower than the estimate, the group is faster than its target. When actual time is higher, it needs review. The estimate follows the existing VMS performance calculation; it is not a newly invented target.",
      strength:
        totals.variance > 0
          ? `Across the visible records, actual time is ${totals.variance}% below the summed estimate.`
          : totals.variance < 0
            ? `Across the visible records, actual time is ${Math.abs(totals.variance)}% above the summed estimate.`
            : "The summed actual time matches the summed estimate.",
    },
    people: {
      title: "Employee comparison",
      body: "Each bar compares the summed estimate and actual time for an employee across the currently loaded performance records. Use this to spot employees whose actual time is consistently above their estimates. This is a time comparison, not a judgement of individual effort or work quality.",
      strength: employeeData.length
        ? `${employeeData[0]?.variance !== null ? `Best time variance: ${employeeData[0].employee} (${employeeData[0].variance}% vs estimate). ` : ""}${employeeData.at(-1)?.variance !== null ? `Highest review priority: ${employeeData.at(-1).employee} (${employeeData.at(-1).variance}% vs estimate).` : ""} ${employeeData.length} employee groups are represented.`
        : "There are no employee records for this period.",
    },
    projects: {
      title: "Project workload",
      body: "Projects are ranked by actual hours recorded. Compare estimated and actual hours to see where the largest amount of logged work sits and which projects may need a closer review.",
      strength: projectData.length
        ? `The chart shows ${projectData.length} project groups with recorded time.`
        : "There are no project records for this period.",
    },
    trend: {
      title: "Daily logged hours",
      body: "This trend adds up actual time taken from work entries for each date in the selected period. It helps show busy and quieter days. It is a workload trend, not a productivity score; compare it with project deadlines and team availability before drawing conclusions.",
      strength: trendFiltered.length
        ? `${trendFiltered.length} dates have recorded work time in this period.`
        : "There is no daily work data for this period.",
    },
    status: {
      title: "Performance status mix",
      body: "The status distribution uses the existing VMS performance thresholds: Excellent means at least 20% faster; Good means faster; On Track is within ±5%; Fair means up to 20% slower; Needs Improvement means more than 20% slower. Time Logged / No Data means a valid estimate is not available.",
      strength: `${totals.faster} groups are Excellent or Good, ${totals.onTrack} are On Track, and ${totals.needs} are Fair or Needs Improvement.`,
    },
  };
  return (
    <div className="performance-page">
      <div className="performance-heading">
        <div>
          <span className="eyebrow">WORKFORCE ANALYTICS</span>
          <h1>Performance overview</h1>
          <p>
            Understand delivery pace, project workload and where the team may
            need support.
          </p>
        </div>
        <label className="range-select">
          <CalendarDays size={16} />
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label className="range-select">
          <Users size={15} />
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="all">All employees</option>
            {employees.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="range-select">
          <FolderKanban size={15} />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">All projects</option>
            {projects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="loading-panel">
          <span className="loader" />
          Building performance insights…
        </div>
      ) : (
        <>
          <div className="performance-kpis">
            <MetricCard
              label="Performance groups"
              value={totals.count}
              caption="Employee / project / module"
              icon={Gauge}
            />
            <MetricCard
              label="Estimated time"
              value={hoursLabel(totals.estimated)}
              caption="Combined estimate"
              icon={Target}
            />
            <MetricCard
              label="Actual time"
              value={hoursLabel(totals.actual)}
              caption="Time logged"
              icon={Clock3}
            />
            <MetricCard
              label="Faster than target"
              value={`${totals.faster}`}
              caption="Excellent + Good groups"
              icon={TrendingUp}
              tone="positive"
            />
          </div>
          <div className="performance-grid">
            <ChartPanel
              title="Estimated vs actual"
              subtitle="Overall time comparison"
              icon={BarChart3}
              onClick={() => setSelectedInsight("efficiency")}
              active={selectedInsight === "efficiency"}
            >
              <div className="chart-legend">
                <span>
                  <i className="legend-estimate" /> Estimated
                </span>
                <span>
                  <i className="legend-actual" /> Actual
                </span>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Total",
                        Estimated: +(totals.estimated / 60).toFixed(1),
                        Actual: +(totals.actual / 60).toFixed(1),
                      },
                    ]}
                    barGap={12}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#edf0f5"
                    />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={38} />
                    <Tooltip formatter={(v) => `${v} hrs`} />
                    <Bar
                      dataKey="Estimated"
                      fill="#b7ddc3"
                      radius={[7, 7, 0, 0]}
                      maxBarSize={52}
                    />
                    <Bar
                      dataKey="Actual"
                      fill="#167541"
                      radius={[7, 7, 0, 0]}
                      maxBarSize={52}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
            <ChartPanel
              title="Performance status"
              subtitle="How the recorded groups are classified"
              icon={Activity}
              onClick={() => setSelectedInsight("status")}
              active={selectedInsight === "status"}
            >
              <div className="status-chart">
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {statusData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={palette[index % palette.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <b>{totals.count}</b>
                    <small>groups</small>
                  </div>
                </div>
                <div className="status-legend">
                  {statusData.length ? (
                    statusData.map((s, i) => (
                      <div key={s.name}>
                        <i
                          style={{ background: palette[i % palette.length] }}
                        />
                        <span>{s.name}</span>
                        <b>{s.value}</b>
                      </div>
                    ))
                  ) : (
                    <EmptyMini text="No performance data" />
                  )}
                </div>
              </div>
            </ChartPanel>
            <ChartPanel
              title="Employee comparison"
              subtitle="Estimated and actual hours by employee"
              icon={Users}
              onClick={() => setSelectedInsight("people")}
              active={selectedInsight === "people"}
              wide
            >
              <div className="chart-area chart-tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={employeeData.slice(0, 8)}
                    margin={{ left: 0, right: 8, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#edf0f5"
                    />
                    <XAxis
                      dataKey="employee"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis axisLine={false} tickLine={false} width={38} />
                    <Tooltip formatter={(v) => `${v} hrs`} />
                    <Legend />
                    <Bar
                      dataKey="estimatedHours"
                      name="Estimated"
                      fill="#b7ddc3"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="actualHours"
                      name="Actual"
                      fill="#22a78b"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
            <ChartPanel
              title="Project workload"
              subtitle="Projects with the highest logged hours"
              icon={FolderKanban}
              onClick={() => setSelectedInsight("projects")}
              wide
            >
              <div className="chart-area chart-tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={projectData}
                    layout="vertical"
                    margin={{ left: 8, right: 12, top: 6, bottom: 6 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#edf0f5"
                    />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="project"
                      width={118}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v) => `${v} hrs`} />
                    <Legend />
                    <Bar
                      dataKey="estimatedHours"
                      name="Estimated"
                      fill="#b7ddc3"
                      radius={[0, 6, 6, 0]}
                    />
                    <Bar
                      dataKey="actualHours"
                      name="Actual"
                      fill="#4b9be8"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
            <ChartPanel
              title="Daily logged hours"
              subtitle="Actual hours · selected filters and period"
              icon={TrendingUp}
              onClick={() => setSelectedInsight("trend")}
              active={selectedInsight === "trend"}
              wide
            >
              <div className="chart-area chart-tall">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendFiltered}
                    margin={{ left: 0, right: 10, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#edf0f5"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis axisLine={false} tickLine={false} width={38} />
                    <Tooltip formatter={(v) => `${v} hrs`} />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      name="Hours logged"
                      stroke="#167541"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#167541" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </div>
          <div className="insight-panel">
            <div className="insight-head">
              <div className="insight-icon">
                <CircleHelp size={19} />
              </div>
              <div>
                <span className="eyebrow">GRAPH EXPLANATION</span>
                <h3>{insights[selectedInsight].title}</h3>
              </div>
              <span className="tap-hint">Select a graph to learn more</span>
            </div>
            <p>{insights[selectedInsight].body}</p>
            <div className="insight-takeaway">
              <Sparkles size={16} />
              <span>{insights[selectedInsight].strength}</span>
            </div>
          </div>
          <div className="performance-table panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">DETAIL VIEW</span>
                <h3>Performance records</h3>
                <p>
                  Search and review each employee, project and module group.
                </p>
              </div>
              <span className="record-count">{rows.length} records</span>
            </div>
            <DataTable
              page="performance"
              rows={tableRows}
              user={{ role: "Performance Viewer" }}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          </div>
          <div className="performance-footnote">
            <AlertTriangle size={15} /> Insights are based on available
            work-entry data and the original VMS performance thresholds. Empty
            periods are not estimated or filled with sample data.
          </div>
        </>
      )}
    </div>
  );
}
function MetricCard({ label, value, caption, icon: Icon, tone }) {
  return (
    <div className="metric-card">
      <span className={`metric-icon ${tone || ""}`}>
        <Icon size={18} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
}
function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  children,
  onClick,
  active,
  wide,
}) {
  return (
    <button
      className={`chart-panel ${wide ? "chart-wide" : ""} ${active ? "chart-selected" : ""}`}
      onClick={onClick}
    >
      <div className="chart-panel-head">
        <div className="chart-title-icon">
          <Icon size={17} />
        </div>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="chart-open">
          <ArrowUpRight size={15} />
        </span>
      </div>
      <div className="chart-content">{children}</div>
    </button>
  );
}
function EmptyMini({ text }) {
  return <span className="empty-mini">{text}</span>;
}

function DataTable({ page, rows, user, onDelete, onEdit }) {
  const columns =
    {
      users: ["emp_id", "name", "department", "role", "active"],
      projects: [
        "project_name",
        "model_no",
        "total_estimated_hours",
        "module_estimated_time",
        "start_date",
        "delivery_date",
      ],
      operator: [
        "date",
        "emp_id",
        "name",
        "department",
        "project_name",
        "model_no",
        "estimated_time",
        "time_taken",
        "production_hours",
        "extra_hours",
        "status",
        "remarks",
      ],
      work: [
        "date",
        "project_name",
        "model_no",
        "estimated_time",
        "time_taken",
        "status",
        "remarks",
      ],
      leader: [
        "date",
        "project_name",
        "operator_name",
        "total_hours",
        "comments",
      ],
      performance: [
        "emp_id",
        "project_name",
        "model_no",
        "entry_count",
        "estimated",
        "taken",
        "status",
      ],
      accounts: [
        "project_name",
        "start_date",
        "estimated_hours",
        "delivery_schedule",
        "dispatched",
        "hours_taken",
        "hours_difference",
        "invoice_date",
        "payment_date",
      ],
    }[page] || [];
  const showActions =
    user.role === "Admin" ||
    page === "accounts" ||
    page === "leader" ||
    (page === "operator" &&
      (user.role === "Admin" || user.role === "Project Leader"));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col.replaceAll("_", " ")}</th>
            ))}
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index}>
              {columns.map((col) => (
                <td key={col} data-label={col.replaceAll("_", " ")}>
                  {col === "active"
                    ? row[col]
                      ? "Active"
                      : "Inactive"
                    : (row[col] ?? "—")}
                </td>
              ))}
              {showActions && (
                <td data-label="Actions">
                  <div className="row-actions">
                    {page === "operator" &&
                      (user.role === "Admin" ||
                        user.role === "Project Leader") && (
                        <button
                          className="edit-btn"
                          onClick={() => onEdit(row)}
                        >
                          Edit
                        </button>
                      )}
                    {(user.role === "Admin" ||
                      (page === "operator" && user.role === "Project Leader") ||
                      page === "accounts" ||
                      page === "leader") && (
                      <button
                        className="delete-btn"
                        onClick={() =>
                          onDelete(
                            page === "operator"
                              ? "operator-entries"
                              : page === "leader"
                                ? "project-leader-entries"
                                : page === "accounts"
                                  ? "accounts-entries"
                                  : "users",
                            row._id,
                          )
                        }
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty-state">
          <div>
            <Search size={22} />
          </div>
          <b>No records found</b>
          <span>
            Try changing your search or check back after data is added.
          </span>
        </div>
      )}
    </div>
  );
}

function EntryModal({
  page,
  user,
  projects,
  editRecord,
  defaultDate,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() =>
    editRecord
      ? {
          ...editRecord,
          status: editRecord.status === "Comp" ? "Complete" : editRecord.status,
        }
      : {
          date: defaultDate || new Date().toISOString().slice(0, 10),
          status: "In hand",
          dispatched: "NO",
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const special = [
    "Office meeting",
    "Celebration",
    "System problem",
    "Training",
    "Power cut",
    "Permission",
    "Late",
    "Project discussion",
    "Half day Leave",
  ];
  const projectNames = [
    ...new Set([...projects.map((p) => p.project_name), ...special]),
  ];
  const models = projects.filter((p) => p.project_name === form.project_name);
  const selectedModule = projects.find(
    (p) => p.project_name === form.project_name && p.model_no === form.model_no,
  );
  useEffect(() => {
    if (editRecord) return;
    if (selectedModule)
      set("estimated_time", selectedModule.module_estimated_time);
    else if (special.includes(form.project_name))
      set("estimated_time", "00:00");
    else set("estimated_time", "");
  }, [form.project_name, form.model_no]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let path,
        body = { ...form };
      if (page === "users") path = "/users";
      else if (page === "work" || page === "operator")
        path = "/operator-entries";
      else if (page === "leader") {
        path = "/project-leader-entries";
        body.total_hours = Number(form.total_hours);
      } else {
        path = "/accounts-entries";
        body.estimated_hours = Number(form.estimated_hours);
        body.hours_taken = Number(form.hours_taken);
      }
      if (editRecord && page === "operator")
        await api.put(`/operator-entries/${editRecord._id}`, body);
      else await api.post(path, body);
      onSaved();
    } catch (error) {
      setError(error.response?.data?.message || "Unable to save record");
    } finally {
      setBusy(false);
    }
  }
  const fields =
    {
      users: [
        ["emp_id", "Employee ID"],
        ["name", "Full name"],
        ["department", "Department"],
        [
          "role",
          "Role",
          "select",
          ["Admin", "Project Leader", "Employee", "Accounts"],
        ],
        ["password", "Temporary password", "password"],
      ],
      operator: [
        ["estimated_time", "Estimated time (from project Excel)", "readonly"],
        ["time_taken", "Time taken (HH:MM)"],
        ["status", "Status", "select", ["In hand", "Complete", "QC", "QA"]],
        ["remarks", "Remarks"],
      ],
      work: [
        ["date", "Date", "date"],
        ["project_name", "Project", "select", projectNames],
        [
          "model_no",
          "Model / Module",
          "select",
          special.includes(form.project_name)
            ? ["N/A"]
            : models.map((p) => p.model_no),
        ],
        ["estimated_time", "Estimated time (from project Excel)", "readonly"],
        ["time_taken", "Time taken (HH:MM)"],
        ["status", "Status", "select", ["In hand", "Complete", "QC", "QA"]],
        ["remarks", "Remarks"],
      ],
      leader: [
        ["project_name", "Project"],
        ["operator_name", "Employee name"],
        ["date", "Date", "date"],
        ["total_hours", "Total hours", "number"],
        ["comments", "Comments"],
      ],
      accounts: [
        ["project_name", "Project"],
        ["start_date", "Start date", "date"],
        ["estimated_hours", "Estimated hours", "number"],
        ["delivery_schedule", "Delivery schedule", "date"],
        ["dispatched", "Dispatched", "select", ["YES", "NO"]],
        ["hours_taken", "Hours taken", "number"],
        ["invoice_date", "Invoice date", "date"],
        ["payment_date", "Payment date", "date"],
      ],
    }[page] || [];
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">WORKSPACE RECORD</span>
            <h3>
              {editRecord
                ? "Edit work entry"
                : page === "work"
                  ? "Submit work entry"
                  : `Add ${page}`}
            </h3>
            <p>
              Enter the details below. Required fields are marked by the
              browser.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          {fields.map(([key, label, type = "text", options]) => (
            <label key={key}>
              {label}
              {type === "select" ? (
                <select
                  required={
                    ["role", "project_name", "status"].includes(key) ||
                    (key === "model_no" && !special.includes(form.project_name))
                  }
                  value={form[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                >
                  <option value="">Select…</option>
                  {options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  required={[
                    "emp_id",
                    "name",
                    "role",
                    "password",
                    "project_name",
                    "model_no",
                    "time_taken",
                  ].includes(key)}
                  readOnly={
                    type === "readonly" || (key === "date" && page === "work")
                  }
                  className={type === "readonly" ? "readonly-field" : ""}
                  type={
                    ["date", "number", "password"].includes(type)
                      ? type
                      : "text"
                  }
                  pattern={
                    key === "time_taken" ? "[0-9]{1,3}:[0-5][0-9]" : undefined
                  }
                  value={form[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={
                    type === "readonly"
                      ? "Select project and module first"
                      : label
                  }
                />
              )}
            </label>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save record"}
          </button>
        </div>
      </form>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
