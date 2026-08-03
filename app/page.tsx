"use client";

import { useState, useCallback, useEffect } from "react";

function format12h(d: Date): string {
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

interface Segment {
  id: string;
  cc: string;
  num: string;
  cls: string;
  cabin: string;
  orig: string;
  dest: string;
  dep_local: string;
  arr_local: string;
  dur: string;
  fare_basis: string;
  new_dir: boolean;
}

interface User {
  username: string;
  password: string;
  role: "admin" | "user";
}

const DEFAULT_USERS: User[] = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "agent", password: "agent123", role: "user" },
];

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function parseTime(t: string): { h: number; m: number } | null {
  const m = t.match(/^(\d{1,2})(\d{2})([AP])$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "P" && h !== 12) h += 12;
  if (ap === "A" && h === 12) h = 0;
  return { h, m: min };
}

function parseDate(d: string, yearHint?: number): Date | null {
  const m = d.match(/^(\d{1,2})([A-Z]{3})$/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS[m[2].toUpperCase()];
  if (mon === undefined) return null;
  const now = new Date();
  let year = yearHint ?? now.getFullYear();
  const candidate = new Date(year, mon, day);
  if (!yearHint && candidate < now) year += 1;
  return new Date(year, mon, day);
}

function parseSabreLine(line: string): Segment | null {
  // Supports:
  // AA 763I 31DEC Q MUCCLT*SS2 1020A 245P /DCAA /E
  // AA2305I 31DEC Q CLTDEN*SS2 ...
  // BA 176O 30JAN J JFKLHR*HK2 705P 705A 31JAN S /DCBA /E
  // with or without *, any status: SS, HK, GK, LL, UC, HX, NN, HL, etc.

  const cleaned = line.trim().replace(/^\d+\s+/, "");

  const flightMatch = cleaned.match(/^([A-Z0-9]{2})\s*(\d{1,4})([A-Z])/i);
  if (!flightMatch) return null;

  const cc = flightMatch[1].toUpperCase();
  const num = flightMatch[2];
  const cls = flightMatch[3].toUpperCase();
  let rest = cleaned.slice(flightMatch[0].length).trim();

  const dateMatch = rest.match(/^(\d{1,2}[A-Z]{3})/i);
  if (!dateMatch) return null;
  const depDateStr = dateMatch[1].toUpperCase();
  rest = rest.slice(dateMatch[0].length).trim();

  // optional day-of-week letter
  rest = rest.replace(/^[A-Z]\s+/, "");

  // City pair + optional * + status (SS/HK/GK/LL/UC/HX/NN/HL/...) + optional seats digit
  // Examples: MUCCLT*SS2  MUCCLTSS2  MUCCLT*HK1  JFKLHR*GK  LHRCAI HK2
  const cityMatch = rest.match(
    /^([A-Z]{3})([A-Z]{3})(?:\s*\*?\s*([A-Z]{2})\d*)?/i
  );
  if (!cityMatch) return null;
  const orig = cityMatch[1].toUpperCase();
  const dest = cityMatch[2].toUpperCase();
  rest = rest.slice(cityMatch[0].length).trim();

  const timeMatch = rest.match(/^(\d{1,4}[AP])\s+(\d{1,4}[AP])/i);
  if (!timeMatch) return null;
  const depTimeStr = timeMatch[1].toUpperCase();
  const arrTimeStr = timeMatch[2].toUpperCase();
  rest = rest.slice(timeMatch[0].length).trim();

  let arrDateStr = depDateStr;
  const nextDateMatch = rest.match(/^(\d{1,2}[A-Z]{3})/i);
  if (nextDateMatch) arrDateStr = nextDateMatch[1].toUpperCase();

  const cabinMap: Record<string, string> = {
    F: "FIRST", A: "FIRST", P: "FIRST",
    J: "BUSIN", C: "BUSIN", D: "BUSIN", I: "FLAGS", Z: "BUSIN",
    W: "PREME", S: "PREME",
    Y: "ECON", B: "ECON", M: "ECON", H: "ECON", Q: "ECON",
    V: "ECON", L: "ECON", K: "ECON", T: "ECON", N: "ECON",
    O: "ECON", G: "ECON", E: "ECON", U: "ECON", X: "ECON",
  };
  const cabin = cabinMap[cls] || "ECON";

  const depDate = parseDate(depDateStr);
  const arrDate = parseDate(arrDateStr, depDate?.getFullYear());
  const depT = parseTime(depTimeStr);
  const arrT = parseTime(arrTimeStr);

  let dep_local = "";
  let arr_local = "";
  let dur = "";

  if (depDate && depT) {
    const d = new Date(depDate);
    d.setHours(depT.h, depT.m, 0, 0);
    dep_local = `${depDateStr} ${format12h(d)}`;
  }
  if (arrDate && arrT) {
    const a = new Date(arrDate);
    a.setHours(arrT.h, arrT.m, 0, 0);
    arr_local = `${arrDateStr} ${format12h(a)}`;
    if (depDate && depT) {
      const depMs = new Date(depDate);
      depMs.setHours(depT.h, depT.m, 0, 0);
      const arrMs = new Date(arrDate);
      arrMs.setHours(arrT.h, arrT.m, 0, 0);
      const mins = Math.round((arrMs.getTime() - depMs.getTime()) / 60000);
      if (mins > 0) dur = String(mins);
    }
  }

  return {
    id: Math.random().toString(36).slice(2),
    cc, num, cls, cabin, orig, dest, dep_local, arr_local, dur,
    fare_basis: "", new_dir: false,
  };
}

function toTimestamp(isoLocal: string): number {
  if (!isoLocal) return 0;
  const normalized = isoLocal.trim().replace(" ", "T");
  const withSec = normalized.length === 16 ? normalized + ":00" : normalized;
  return new Date(withSec + "Z").getTime();
}

function generateAALink(segments: Segment[], pax: number): string {
  if (segments.length === 0) return "";

  const directions: Segment[][] = [];
  let currentDir: Segment[] = [];
  segments.forEach((seg, idx) => {
    if (seg.new_dir && idx > 0 && currentDir.length > 0) {
      directions.push(currentDir);
      currentDir = [];
    }
    currentDir.push(seg);
  });
  if (currentDir.length > 0) directions.push(currentDir);

  const cityPairs: string[] = [];
  directions.forEach((dirSegs) => {
    const first = dirSegs[0];
    const last = dirSegs[dirSegs.length - 1];
    cityPairs.push(`#${first.orig}|${last.dest}|0|0|${toTimestamp(first.dep_local)}`);
  });

  const flights: string[] = [];
  directions.forEach((dirSegs, dirIndex) => {
    dirSegs.forEach((seg) => {
      flights.push(
        `#${seg.cc}|${seg.num}|${seg.cls}|${seg.orig}|${seg.dest}|${toTimestamp(seg.dep_local)}|${dirIndex}`
      );
    });
  });

  const firstSeg = segments[0];
  const lastOfFirstDir = directions[0][directions[0].length - 1];
  const numSeg = segments.length;

  let cabinCode = "A0S0C0I0Y1L0";
  const classes = segments.map((s) => s.cls);
  if (classes.some((c) => ["F", "A", "P", "J", "C", "D", "I", "Z"].includes(c)))
    cabinCode = "A1S0C0I0Y0L0";
  else if (classes.some((c) => ["W", "S"].includes(c)))
    cabinCode = "A0S1C0I0Y0L0";

  const header = `GOOGLE,0,US,multi,${numSeg},${cabinCode},0,${firstSeg.orig},0,${lastOfFirstDir.dest},0,0,0,0,0,0,0,1.00,${pax},`;
  const iten = `${header}${encodeURIComponent(cityPairs.join(""))},${encodeURIComponent(flights.join(""))}`;
  return `https://www.aa.com/goto/metasearch?ITEN=${iten}`;
}

function loadUsers(): User[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem("gds_users");
    if (raw) {
      const parsed = JSON.parse(raw) as User[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_USERS;
}

function saveUsers(users: User[]) {
  localStorage.setItem("gds_users", JSON.stringify(users));
}

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [showUsers, setShowUsers] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  const [rawLines, setRawLines] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [pax, setPax] = useState("1");
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("gds_session");
    const allUsers = loadUsers();
    setUsers(allUsers);
    if (stored) {
      try {
        const u = JSON.parse(stored) as User;
        const found = allUsers.find(
          (x) => x.username === u.username && x.password === u.password
        );
        if (found) setCurrentUser(found);
      } catch {}
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(
      (u) => u.username === loginUser.trim() && u.password === loginPass
    );
    if (found) {
      setCurrentUser(found);
      sessionStorage.setItem("gds_session", JSON.stringify(found));
      setLoginError("");
      setLoginUser("");
      setLoginPass("");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("gds_session");
    setShowUsers(false);
  };

  const addUser = () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    if (users.some((u) => u.username === newUsername.trim())) {
      alert("User already exists");
      return;
    }
    const updated = [
      ...users,
      { username: newUsername.trim(), password: newPassword, role: newRole },
    ];
    setUsers(updated);
    saveUsers(updated);
    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
  };

  const removeUser = (username: string) => {
    if (username === currentUser?.username) {
      alert("Cannot remove the current user");
      return;
    }
    const updated = users.filter((u) => u.username !== username);
    if (updated.length === 0) {
      alert("At least one user is required");
      return;
    }
    setUsers(updated);
    saveUsers(updated);
  };

  const handleParse = useCallback(() => {
    const lines = rawLines
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5);
    const parsed: Segment[] = [];
    for (const line of lines) {
      const seg = parseSabreLine(line);
      if (seg) parsed.push(seg);
    }
    for (let i = 1; i < parsed.length; i++) {
      const prev = new Date(parsed[i - 1].dep_local);
      const curr = new Date(parsed[i].dep_local);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
      if (diffDays > 5) parsed[i].new_dir = true;
    }
    setSegments(parsed);
    setGeneratedUrl("");
  }, [rawLines]);

  const updateSegment = (id: string, field: keyof Segment, value: string | boolean) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const addRow = () => {
    setSegments((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        cc: "", num: "", cls: "Y", cabin: "ECON",
        orig: "", dest: "", dep_local: "", arr_local: "",
        dur: "", fare_basis: "", new_dir: false,
      },
    ]);
  };

  const handleGenerate = () => {
    const url = generateAALink(segments, parseInt(pax) || 1);
    setGeneratedUrl(url);
  };

  // Open without exposing URL in DOM / right-click
  const handleOpenLink = () => {
    if (!generatedUrl) return;
    const w = window.open("about:blank", "_blank");
    if (w) {
      w.opener = null;
      w.location.replace(generatedUrl);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 mb-4 shadow-lg shadow-red-500/20">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">GDS Linker</h1>
              <p className="text-sm text-white/40 mt-1">Sign in to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Username</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition"
                  placeholder="username"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Password</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition"
                  placeholder="••••••••"
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-400 text-center">{loginError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-red-500/20"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-white">
      <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="font-semibold tracking-tight">GDS Linker</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 hidden sm:inline">
              {currentUser.username}
              {currentUser.role === "admin" && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px]">admin</span>
              )}
            </span>
            {currentUser.role === "admin" && (
              <button
                onClick={() => setShowUsers(!showUsers)}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition text-white/60 hover:text-white"
              >
                Users
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition text-white/60 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {showUsers && currentUser.role === "admin" && (
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-white/80 mb-4">User management</h2>
            <div className="space-y-2 mb-5">
              {users.map((u) => (
                <div
                  key={u.username}
                  className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{u.username}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.role === "admin" ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/40"}`}>
                      {u.role}
                    </span>
                  </div>
                  <button
                    onClick={() => removeUser(u.username)}
                    className="text-xs text-white/30 hover:text-red-400 transition"
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Username</label>
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-red-500/40"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-red-500/40"
                  placeholder="password"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/40"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <button
                onClick={addUser}
                className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                Add
              </button>
            </div>
          </section>
        )}

        <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-white/80 mb-1">1. GDS lines</h2>
          <p className="text-xs text-white/30 mb-4">Paste Sabre availability / itinerary lines</p>
          <textarea
            className="w-full h-28 p-4 bg-black/30 border border-white/10 rounded-xl font-mono text-sm text-white/90 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 transition resize-y"
            placeholder={`1 AA 763I 31DEC Q MUCCLT*SS2 1020A 245P /DCAA /E
2 AA2305I 31DEC Q CLTDEN*HK2 456P 635P /DCAA /E
3 BA 176O 30JAN J JFKLHR*GK1 705P 705A 31JAN S /DCBA /E
4 BA 396O 31JAN S LHRCAI LL1 855A 355P /DCBA /E`}
            value={rawLines}
            onChange={(e) => setRawLines(e.target.value)}
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleParse}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-red-500/10"
            >
              Parse
            </button>
            <span className="text-xs text-white/30">
              {segments.length > 0 ? `${segments.length} segment(s)` : "no segments"}
            </span>
          </div>
        </section>

        <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-white/80 mb-1">2. Segments</h2>
          <p className="text-xs text-white/30 mb-4">
            Edit cabin, fare basis and the new direction flag
          </p>

          {segments.length === 0 ? (
            <div className="text-center py-10 text-white/20 text-sm">
              Paste and parse lines first
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/30 border-b border-white/5">
                    {["cc", "num", "cls", "cabin", "orig", "dest", "dep", "arr", "dur", "fare", "new dir", ""].map((h) => (
                      <th key={h} className="pb-3 px-2 font-medium text-[11px] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segments.map((seg) => (
                    <tr key={seg.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2 px-1">
                        <input className="w-11 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.cc} onChange={(e) => updateSegment(seg.id, "cc", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-14 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.num} onChange={(e) => updateSegment(seg.id, "num", e.target.value)} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-9 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.cls} onChange={(e) => updateSegment(seg.id, "cls", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-16 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.cabin} onChange={(e) => updateSegment(seg.id, "cabin", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-12 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.orig} onChange={(e) => updateSegment(seg.id, "orig", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-12 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.dest} onChange={(e) => updateSegment(seg.id, "dest", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-32 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.dep_local} onChange={(e) => updateSegment(seg.id, "dep_local", e.target.value)} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-32 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.arr_local} onChange={(e) => updateSegment(seg.id, "arr_local", e.target.value)} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-12 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.dur} onChange={(e) => updateSegment(seg.id, "dur", e.target.value)} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-16 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-500/40" value={seg.fare_basis} onChange={(e) => updateSegment(seg.id, "fare_basis", e.target.value)} />
                      </td>
                      <td className="py-2 px-1 text-center">
                        <input type="checkbox" checked={seg.new_dir} onChange={(e) => updateSegment(seg.id, "new_dir", e.target.checked)} className="w-4 h-4 accent-red-500" />
                      </td>
                      <td className="py-2 px-1">
                        <button onClick={() => removeSegment(seg.id)} className="text-white/20 hover:text-red-400 text-lg leading-none px-1 transition">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={addRow}
            className="mt-4 text-xs border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5 transition text-white/50 hover:text-white"
          >
            + add row
          </button>
        </section>

        <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-white/80 mb-4">3. Options</h2>
          <div className="max-w-[140px]">
            <label className="block text-xs text-white/40 mb-1.5">Passengers</label>
            <input
              type="number"
              min={1}
              max={9}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              value={pax}
              onChange={(e) => setPax(e.target.value)}
            />
          </div>
        </section>

        <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-white/80 mb-4">4. Generate</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={segments.length === 0}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-red-500/10 disabled:shadow-none"
            >
              Generate booking
            </button>

            {generatedUrl && (
              <button
                type="button"
                onClick={handleOpenLink}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => {
                  if (e.button === 2) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-white text-black hover:bg-white/90 px-5 py-2.5 rounded-xl text-sm font-medium transition select-none"
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
              >
                Open link
                <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="text-center text-[11px] text-white/15 py-8">
        GDS Linker · internal use
      </footer>
    </div>
  );
}
