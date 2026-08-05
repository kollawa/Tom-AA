"use client";

import { useState, useCallback, useEffect } from "react";

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

interface PassengerGroup {
  id: string;
  code: string;
  count: string;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface LocalDateTime extends CalendarDate {
  hour: number;
  minute: number;
}

const DEFAULT_USERS: User[] = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "Chris", password: "My)6jOs/", role: "user" },
];

const PASSENGER_TYPE_OPTIONS = [
  { code: "ADT", label: "Adult" },
  { code: "CNN", label: "Child" },
  { code: "INF", label: "Infant" },
];

const DEFAULT_PASSENGER_GROUPS: PassengerGroup[] = [
  { id: "adt", code: "ADT", count: "1" },
];

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

const AIRPORT_TIME_ZONES: Record<string, string> = {
  AEP: "America/Argentina/Buenos_Aires",
  AKL: "Pacific/Auckland",
  ANC: "America/Anchorage",
  ANU: "America/Antigua",
  ARN: "Europe/Stockholm",
  ASU: "America/Asuncion",
  ATH: "Europe/Athens",
  ATL: "America/New_York",
  AUH: "Asia/Dubai",
  AUA: "America/Aruba",
  AUS: "America/Chicago",
  BCN: "Europe/Madrid",
  BER: "Europe/Berlin",
  BGI: "America/Barbados",
  BJX: "America/Mexico_City",
  BKK: "Asia/Bangkok",
  BLR: "Asia/Kolkata",
  BNA: "America/Chicago",
  BOG: "America/Bogota",
  BOM: "Asia/Kolkata",
  BOS: "America/New_York",
  BQN: "America/Puerto_Rico",
  BSB: "America/Sao_Paulo",
  BWI: "America/New_York",
  BZE: "America/Belize",
  BZN: "America/Denver",
  CAN: "Asia/Shanghai",
  CDG: "Europe/Paris",
  CGK: "Asia/Jakarta",
  CLE: "America/New_York",
  CLO: "America/Bogota",
  CLT: "America/New_York",
  CMH: "America/New_York",
  CNF: "America/Sao_Paulo",
  CPH: "Europe/Copenhagen",
  CUN: "America/Cancun",
  CUR: "America/Curacao",
  CVG: "America/New_York",
  CZM: "America/Cancun",
  DAL: "America/Chicago",
  DCA: "America/New_York",
  DEL: "Asia/Kolkata",
  DEN: "America/Denver",
  DFW: "America/Chicago",
  DOH: "Asia/Qatar",
  DUB: "Europe/Dublin",
  DUS: "Europe/Berlin",
  DXB: "Asia/Dubai",
  EWR: "America/New_York",
  EZE: "America/Argentina/Buenos_Aires",
  FCO: "Europe/Rome",
  FRA: "Europe/Berlin",
  FLL: "America/New_York",
  GCM: "America/Cayman",
  GDL: "America/Mexico_City",
  GIG: "America/Sao_Paulo",
  GUA: "America/Guatemala",
  GVA: "Europe/Zurich",
  GYE: "America/Guayaquil",
  HAM: "Europe/Berlin",
  HEL: "Europe/Helsinki",
  HKG: "Asia/Hong_Kong",
  HNL: "Pacific/Honolulu",
  HOU: "America/Chicago",
  IAD: "America/New_York",
  IAH: "America/Chicago",
  ICN: "Asia/Seoul",
  IND: "America/Indiana/Indianapolis",
  IST: "Europe/Istanbul",
  JFK: "America/New_York",
  KIN: "America/Jamaica",
  KIX: "Asia/Tokyo",
  KOA: "Pacific/Honolulu",
  KUL: "Asia/Kuala_Lumpur",
  LAS: "America/Los_Angeles",
  LAX: "America/Los_Angeles",
  LCY: "Europe/London",
  LGA: "America/New_York",
  LGW: "Europe/London",
  LIH: "Pacific/Honolulu",
  LIM: "America/Lima",
  LIN: "Europe/Rome",
  LIR: "America/Costa_Rica",
  LIS: "Europe/Lisbon",
  LHR: "Europe/London",
  MAD: "Europe/Madrid",
  MAN: "Europe/London",
  MAO: "America/Manaus",
  MBJ: "America/Jamaica",
  MCO: "America/New_York",
  MDE: "America/Bogota",
  MEL: "Australia/Melbourne",
  MEX: "America/Mexico_City",
  MIA: "America/New_York",
  MID: "America/Merida",
  MKE: "America/Chicago",
  MNL: "Asia/Manila",
  MSP: "America/Chicago",
  MTY: "America/Monterrey",
  MUC: "Europe/Berlin",
  MVD: "America/Montevideo",
  MXP: "Europe/Rome",
  NAP: "Europe/Rome",
  NAS: "America/Nassau",
  NRT: "Asia/Tokyo",
  OAK: "America/Los_Angeles",
  OGG: "Pacific/Honolulu",
  ONT: "America/Los_Angeles",
  OPO: "Europe/Lisbon",
  ORD: "America/Chicago",
  ORY: "Europe/Paris",
  OSL: "Europe/Oslo",
  OAX: "America/Mexico_City",
  PDX: "America/Los_Angeles",
  PEK: "Asia/Shanghai",
  PHL: "America/New_York",
  PHX: "America/Phoenix",
  PIT: "America/New_York",
  POP: "America/Santo_Domingo",
  PRG: "Europe/Prague",
  PTY: "America/Panama",
  PUJ: "America/Santo_Domingo",
  PVR: "America/Mexico_City",
  PVG: "Asia/Shanghai",
  QRO: "America/Mexico_City",
  RDU: "America/New_York",
  RNO: "America/Los_Angeles",
  SAL: "America/El_Salvador",
  SAN: "America/Los_Angeles",
  SAT: "America/Chicago",
  SCL: "America/Santiago",
  SEA: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
  SHA: "Asia/Shanghai",
  SIN: "Asia/Singapore",
  SJC: "America/Los_Angeles",
  SJD: "America/Mazatlan",
  SJO: "America/Costa_Rica",
  SJU: "America/Puerto_Rico",
  SLC: "America/Denver",
  SMF: "America/Los_Angeles",
  SNA: "America/Los_Angeles",
  SNN: "Europe/Dublin",
  STI: "America/Santo_Domingo",
  STL: "America/Chicago",
  SDQ: "America/Santo_Domingo",
  SXM: "America/Lower_Princes",
  SYD: "Australia/Sydney",
  TGU: "America/Tegucigalpa",
  TLV: "Asia/Jerusalem",
  TPA: "America/New_York",
  TPE: "Asia/Taipei",
  UIO: "America/Guayaquil",
  UVF: "America/St_Lucia",
  VCE: "Europe/Rome",
  VIE: "Europe/Vienna",
  WAW: "Europe/Warsaw",
  YEG: "America/Edmonton",
  YHZ: "America/Halifax",
  YOW: "America/Toronto",
  YUL: "America/Toronto",
  YVR: "America/Vancouver",
  YWG: "America/Winnipeg",
  YYC: "America/Edmonton",
  YYZ: "America/Toronto",
  ZRH: "Europe/Zurich",
};

const timeZoneFormatters: Record<string, Intl.DateTimeFormat> = {};

function pad(n: number, len = 2) {
  return n.toString().padStart(len, "0");
}

function parseTime(t: string): { h: number; m: number } | null {
  const m = t.match(/^(\d{1,2})(\d{2})([AP])$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (h < 1 || h > 12 || min < 0 || min > 59) return null;
  if (ap === "P" && h !== 12) h += 12;
  if (ap === "A" && h === 12) h = 0;
  return { h, m: min };
}

function parseDate(d: string, yearHint?: number): CalendarDate | null {
  const m = d.match(/^(\d{1,2})([A-Z]{3})$/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS[m[2].toUpperCase()];
  if (mon === undefined) return null;
  const now = new Date();
  let year = yearHint ?? now.getFullYear();
  const candidate = Date.UTC(year, mon, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (!yearHint && candidate < today) year += 1;
  return { year, month: mon, day };
}

function addDays(local: LocalDateTime, days: number): LocalDateTime {
  const d = new Date(Date.UTC(local.year, local.month, local.day + days));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: local.hour,
    minute: local.minute,
  };
}

function addYear(date: CalendarDate): CalendarDate {
  return { ...date, year: date.year + 1 };
}

function dateKey(date: CalendarDate): number {
  return Date.UTC(date.year, date.month, date.day);
}

function localComparableMs(local: LocalDateTime): number {
  return Date.UTC(local.year, local.month, local.day, local.hour, local.minute);
}

function combineDateTime(date: CalendarDate, time: { h: number; m: number }): LocalDateTime {
  return {
    year: date.year,
    month: date.month,
    day: date.day,
    hour: time.h,
    minute: time.m,
  };
}

function formatDisplayDateTime(local: LocalDateTime): string {
  const ap = local.hour >= 12 ? "PM" : "AM";
  const h12 = local.hour % 12 || 12;
  return `${pad(local.month + 1)}/${pad(local.day)}/${local.year} ${pad(h12)}:${pad(local.minute)} ${ap}`;
}

function parseDisplayDateTime(value: string): LocalDateTime | null {
  const trimmed = value.trim();
  const internal = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/
  );
  if (internal) {
    return {
      year: Number(internal[1]),
      month: Number(internal[2]) - 1,
      day: Number(internal[3]),
      hour: Number(internal[4]),
      minute: Number(internal[5]),
    };
  }
  const display = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP])M?$/i
  );
  if (!display) return null;
  let hour = Number(display[4]);
  const minute = Number(display[5]);
  const ap = display[6].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (ap === "P" && hour !== 12) hour += 12;
  if (ap === "A" && hour === 12) hour = 0;
  return {
    year: Number(display[3]),
    month: Number(display[1]) - 1,
    day: Number(display[2]),
    hour,
    minute,
  };
}

function getAirportTimeZone(iata: string): string {
  return AIRPORT_TIME_ZONES[iata.trim().toUpperCase()] || "UTC";
}

function getTimeZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  if (!timeZoneFormatters[timeZone]) {
    timeZoneFormatters[timeZone] = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  return timeZoneFormatters[timeZone];
}

function getTimeZoneOffsetMs(timeZone: string, utcMs: number): number {
  try {
    const parts = getTimeZoneFormatter(timeZone).formatToParts(new Date(utcMs));
    const values: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") values[part.type] = Number(part.value);
    }
    const asUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second || 0
    );
    return asUtc - utcMs;
  } catch {
    return 0;
  }
}

function localDateTimeToAirportUtcMs(local: LocalDateTime, airport: string): number {
  const timeZone = getAirportTimeZone(airport);
  const wallClockUtcMs = localComparableMs(local);
  let utcMs = wallClockUtcMs;
  for (let i = 0; i < 3; i++) {
    const nextUtcMs = wallClockUtcMs - getTimeZoneOffsetMs(timeZone, utcMs);
    if (Math.abs(nextUtcMs - utcMs) < 1) return nextUtcMs;
    utcMs = nextUtcMs;
  }
  return utcMs;
}

function calculateDurationMinutes(
  depLocal: LocalDateTime,
  arrLocal: LocalDateTime,
  orig: string,
  dest: string
): number {
  const depMs = localDateTimeToAirportUtcMs(depLocal, orig);
  const arrMs = localDateTimeToAirportUtcMs(arrLocal, dest);
  return Math.round((arrMs - depMs) / 60000);
}

function parseSabreLine(line: string): Segment | null {
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
  rest = rest.replace(/^[A-Z]\s+/, "");
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
  const hasExplicitArrDate = Boolean(nextDateMatch);
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
  let arrDate = parseDate(arrDateStr, depDate?.year);
  if (depDate && arrDate && hasExplicitArrDate && dateKey(arrDate) < dateKey(depDate)) {
    arrDate = addYear(arrDate);
  }
  const depT = parseTime(depTimeStr);
  const arrT = parseTime(arrTimeStr);
  let dep_local = "";
  let arr_local = "";
  let dur = "";
  if (depDate && depT) {
    dep_local = formatDisplayDateTime(combineDateTime(depDate, depT));
  }
  if (arrDate && arrT) {
    if (depDate && depT) {
      const depLocal = combineDateTime(depDate, depT);
      let arrLocal = combineDateTime(arrDate, arrT);
      let mins = calculateDurationMinutes(depLocal, arrLocal, orig, dest);
      let guard = 0;
      while (mins <= 0 && guard < 3) {
        arrLocal = addDays(arrLocal, 1);
        mins = calculateDurationMinutes(depLocal, arrLocal, orig, dest);
        guard += 1;
      }
      arr_local = formatDisplayDateTime(arrLocal);
      if (mins > 0) dur = String(mins);
    } else {
      arr_local = formatDisplayDateTime(combineDateTime(arrDate, arrT));
    }
  }
  return {
    id: Math.random().toString(36).slice(2),
    cc, num, cls, cabin, orig, dest, dep_local, arr_local, dur,
    fare_basis: "", new_dir: false,
  };
}

function toTimestamp(localValue: string, airport: string): number {
  const local = parseDisplayDateTime(localValue);
  if (!local) return 0;
  return localDateTimeToAirportUtcMs(local, airport);
}

function buildPaxCode(groups: { code: string; count: string }[]): { code: string; total: number } {
  // A#S0C0I0Y0L0 — A=ADT, C=CNN, L=INF
  let A = 0, S = 0, C = 0, I = 0, Y = 0, L = 0;
  for (const g of groups) {
    const n = parseInt(g.count, 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    const code = g.code.toUpperCase();
    if (code === "ADT") A += n;
    else if (code === "SRC" || code === "SEN") S += n;
    else if (code === "CNN" || code === "CHD") C += n;
    else if (code === "INS") I += n;
    else if (code === "YTH") Y += n;
    else if (code === "INF") L += n;
    else A += n;
  }
  if (A + S + C + I + Y + L === 0) A = 1;
  let total = A + S + C + I + Y + L;
  if (total > 9) {
    const excess = total - 9;
    A = Math.max(0, A - excess);
    total = A + S + C + I + Y + L;
  }
  return { code: `A${A}S${S}C${C}I${I}Y${Y}L${L}`, total };
}

function generateAALink(
  segments: Segment[],
  passengerGroups: { code: string; count: string }[]
): string {
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
    cityPairs.push(`#${first.orig}|${last.dest}|0|0|${toTimestamp(first.dep_local, first.orig)}`);
  });

  const flights: string[] = [];
  directions.forEach((dirSegs, dirIndex) => {
    dirSegs.forEach((seg) => {
      flights.push(
        `#${seg.cc}|${seg.num}|${seg.cls}|${seg.orig}|${seg.dest}|${toTimestamp(seg.dep_local, seg.orig)}|${dirIndex}`
      );
    });
  });

  const firstSeg = segments[0];
  const lastOfFirstDir = directions[0][directions[0].length - 1];
  // Working AA links always use multi,4 (not direction count)
  const aaTripCount = 4;

  // Passenger mix from UI (ADT/CNN/INF) → A#S#C#I#Y#L# only
  // Trailing ,0,0,0,0,0,0,0,0,1, is static (never changes with pax count)
  const { code: paxCode } = buildPaxCode(passengerGroups);

  const header = `GOOGLE,0,US,multi,${aaTripCount},${paxCode},0,${firstSeg.orig},0,${lastOfFirstDir.dest},0,0,0,0,0,0,0,0,1,`;
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
  const [passengerGroups, setPassengerGroups] = useState<PassengerGroup[]>(
    DEFAULT_PASSENGER_GROUPS
  );
  const [generatedUrl, setGeneratedUrl] = useState("");
  // Admin-only: show/hide raw booking URL
  const [showLink, setShowLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [genKey, setGenKey] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem("gds_show_link") === "1") setShowLink(true);
    } catch {}
  }, []);

  const toggleShowLink = () => {
    setShowLink((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("gds_show_link", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

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
      const prev = parsed[i - 1];
      const curr = parsed[i];
      const prevDep = parseDisplayDateTime(prev.dep_local);
      const currDep = parseDisplayDateTime(curr.dep_local);
      const diffDays =
        prevDep && currDep
          ? (localComparableMs(currDep) - localComparableMs(prevDep)) / (1000 * 3600 * 24)
          : 0;
      if (prev.dest !== curr.orig || diffDays > 5) parsed[i].new_dir = true;
    }
    setSegments(parsed);
    setGeneratedUrl("");
  }, [rawLines]);

  const updateSegment = (id: string, field: keyof Segment, value: string | boolean) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
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

  const updatePassengerGroup = (
    id: string,
    field: keyof PassengerGroup,
    value: string
  ) => {
    setPassengerGroups((prev) =>
      prev.map((group) =>
        group.id === id
          ? {
              ...group,
              [field]:
                field === "code"
                  ? value.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()
                  : value,
            }
          : group
      )
    );
  };

  const addPassengerGroup = () => {
    const usedCodes = new Set(passengerGroups.map((group) => group.code));
    const nextType =
      PASSENGER_TYPE_OPTIONS.find((option) => !usedCodes.has(option.code)) ||
      PASSENGER_TYPE_OPTIONS[0];
    setPassengerGroups((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), code: nextType.code, count: "1" },
    ]);
  };

  const removePassengerGroup = (id: string) => {
    setPassengerGroups((prev) =>
      prev.length > 1 ? prev.filter((group) => group.id !== id) : prev
    );
  };

  const passengerTotal = passengerGroups.reduce((sum, group) => {
    const count = parseInt(group.count, 10);
    return sum + (Number.isFinite(count) && count > 0 ? count : 0);
  }, 0);

  const handleGenerate = () => {
    if (segments.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setJustGenerated(false);
    // short delay so the plane animation is visible
    window.setTimeout(() => {
      const url = generateAALink(segments, passengerGroups);
      setGeneratedUrl(url);
      setIsGenerating(false);
      setJustGenerated(true);
      setGenKey((k) => k + 1);
      window.setTimeout(() => setJustGenerated(false), 2200);
    }, 700);
  };

  const handleOpenLink = () => {
    const url = generateAALink(segments, passengerGroups) || generatedUrl;
    if (!url) return;
    setGeneratedUrl(url);
    const w = window.open("about:blank", "_blank");
    if (w) {
      w.opener = null;
      w.location.replace(url);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen sky-gradient flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen sky-gradient flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute top-16 left-[10%] w-32 h-10 rounded-full bg-white/5 blur-xl anim-float" />
        <div className="absolute top-32 right-[15%] w-48 h-12 rounded-full bg-sky-200/5 blur-2xl anim-float-slow" />
        <div className="absolute bottom-24 left-[20%] w-40 h-10 rounded-full bg-white/5 blur-xl anim-float-slow" />
        <div className="relative w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 shadow-2xl anim-fade-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 mb-4 shadow-lg shadow-sky-500/25">
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition"
                  placeholder="••••••••"
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-400 text-center">{loginError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-sky-500/25"
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
    <div className="min-h-screen sky-gradient text-white relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute top-20 left-[8%] w-40 h-12 rounded-full bg-white/[0.03] blur-2xl anim-float" />
        <div className="absolute top-48 right-[12%] w-56 h-14 rounded-full bg-sky-400/[0.04] blur-3xl anim-float-slow" />
        <div className="absolute bottom-32 left-[25%] w-48 h-12 rounded-full bg-indigo-400/[0.04] blur-2xl anim-float" />
        <div className="absolute top-[40%] right-[5%] text-sky-400/10">
          <svg className="w-24 h-24 rotate-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
      </div>
      <header className="border-b border-sky-500/10 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
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
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px]">admin</span>
              )}
            </span>
            {currentUser.role === "admin" && (
              <>
                <button
                  onClick={toggleShowLink}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    showLink
                      ? "border-sky-400/50 bg-sky-500/20 text-sky-200"
                      : "border-white/10 hover:bg-white/5 text-white/60 hover:text-white"
                  }`}
                  title="Show or hide the generated URL"
                >
                  {showLink ? "Hide link" : "Show link"}
                </button>
                <button
                  onClick={() => setShowUsers(!showUsers)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition text-white/60 hover:text-white"
                >
                  Users
                </button>
              </>
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
          <section className="glass-card rounded-2xl p-6 anim-fade-up">
            <h2 className="text-sm font-medium text-sky-100/90 mb-4">User management</h2>
            <div className="space-y-2 mb-5">
              {users.map((u) => (
                <div
                  key={u.username}
                  className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{u.username}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.role === "admin" ? "bg-sky-500/20 text-sky-300" : "bg-white/10 text-white/40"}`}>
                      {u.role}
                    </span>
                  </div>
                  <button
                    onClick={() => removeUser(u.username)}
                    className="text-xs text-sky-200/35 hover:text-sky-400 transition"
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
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  placeholder="password"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <button
                onClick={addUser}
                className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                Add
              </button>
            </div>
          </section>
        )}

        <section className="glass-card rounded-2xl p-6 anim-fade-up">
          <h2 className="text-sm font-medium text-sky-100/90 mb-1">1. GDS lines</h2>
          <p className="text-xs text-sky-200/35 mb-4">Paste Sabre availability / itinerary lines</p>
          <textarea
            className="w-full h-28 p-4 bg-black/30 border border-white/10 rounded-xl font-mono text-sm text-white/90 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/30 transition resize-y"
            placeholder={`1 AA 763I 31DEC Q MUCCLT*SS2 1020A 245P /DCAA /E
2 AA2305I 31DEC Q CLTDEN*HK2 456P 635P /DCAA /E
3 BA 176O 30JAN J JFKLHR*GK2 705P 705A 31JAN S /DCBA /E
4 BA 396O 31JAN S LHRCAI LL2 855A 355P /DCBA /E`}
            value={rawLines}
            onChange={(e) => setRawLines(e.target.value)}
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleParse}
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-sky-500/20"
            >
              Parse
            </button>
            <span className="text-xs text-sky-200/35">
              {segments.length > 0 ? `${segments.length} segment(s)` : "no segments"}
            </span>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-6 anim-fade-up">
          <h2 className="text-sm font-medium text-sky-100/90 mb-1">2. Segments</h2>
          <p className="text-xs text-sky-200/35 mb-4">
            Edit cabin and the new direction flag
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
                    {["cc", "num", "cls", "cabin", "orig", "dest", "dep", "arr", "new dir"].map((h) => (
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
                        <input className="w-11 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.cc} onChange={(e) => updateSegment(seg.id, "cc", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-14 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.num} onChange={(e) => updateSegment(seg.id, "num", e.target.value)} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-9 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.cls} onChange={(e) => updateSegment(seg.id, "cls", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-16 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.cabin} onChange={(e) => updateSegment(seg.id, "cabin", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-12 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.orig} onChange={(e) => updateSegment(seg.id, "orig", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-12 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.dest} onChange={(e) => updateSegment(seg.id, "dest", e.target.value.toUpperCase())} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-32 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.dep_local} onChange={(e) => updateSegment(seg.id, "dep_local", e.target.value)} />
                      </td>
                      <td className="py-2 px-1">
                        <input className="w-32 bg-black/40 border border-white/10 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40" value={seg.arr_local} onChange={(e) => updateSegment(seg.id, "arr_local", e.target.value)} />
                      </td>
                      <td className="py-2 px-1 text-center">
                        <input type="checkbox" checked={seg.new_dir} onChange={(e) => updateSegment(seg.id, "new_dir", e.target.checked)} className="w-4 h-4 accent-sky-500" />
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

        <section className="glass-card rounded-2xl p-6 anim-fade-up">
          <h2 className="text-sm font-medium text-sky-100/90 mb-4">3. Passengers</h2>
          <div className="max-w-md space-y-3">
            {passengerGroups.map((group) => (
              <div key={group.id} className="flex items-end gap-2">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Type</label>
                  <select
                    className="w-36 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    value={group.code}
                    onChange={(e) =>
                      updatePassengerGroup(group.id, "code", e.target.value)
                    }
                  >
                    {PASSENGER_TYPE_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Number</label>
                  <input
                    type="number"
                    min={0}
                    max={9}
                    className="w-20 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    value={group.count}
                    onChange={(e) =>
                      updatePassengerGroup(group.id, "count", e.target.value)
                    }
                  />
                </div>
                {passengerGroups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePassengerGroup(group.id)}
                    className="mb-px text-xs border border-white/10 rounded-lg px-3 py-2.5 hover:bg-white/5 transition text-white/50 hover:text-white"
                  >
                    remove
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addPassengerGroup}
                className="text-xs border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5 transition text-white/50 hover:text-white"
              >
                + add type
              </button>
              <span className="text-xs text-sky-200/35">total {passengerTotal || 1}</span>
            </div>
          </div>
        </section>

        <section className={`glass-card rounded-2xl p-6 anim-fade-up relative overflow-hidden ${justGenerated ? "generate-flash" : ""}`}>
          {/* runway accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />

          <h2 className="text-sm font-medium text-sky-100/90 mb-4 flex items-center gap-2">
            <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
            4. Generate
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={segments.length === 0 || isGenerating}
              className="btn-primary relative overflow-hidden text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:text-white/30"
            >
              {isGenerating ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Building link…
                </span>
              ) : justGenerated ? (
                <span className="inline-flex items-center gap-2 anim-success">
                  <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Link ready
                </span>
              ) : (
                "Generate booking"
              )}
            </button>

            {generatedUrl && !isGenerating && (
              <button
                key={genKey}
                type="button"
                onClick={handleOpenLink}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => {
                  if (e.button === 2) e.preventDefault();
                }}
                className={`inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-sky-50 px-5 py-2.5 rounded-xl text-sm font-medium transition select-none anim-success ${justGenerated ? "anim-glow" : ""}`}
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
              >
                Open link
                <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            )}
          </div>

          {/* plane flight animation while generating */}
          {isGenerating && (
            <div className="relative mt-5 h-10 overflow-hidden rounded-xl bg-slate-900/50 border border-sky-500/10">
              <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 anim-plane text-sky-300">
                <svg className="w-7 h-7 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </div>
              <div className="absolute bottom-1 left-3 right-3 flex justify-between opacity-40">
                {[...Array(8)].map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400" style={{ animation: `runway-lights 1s ease-in-out ${i * 0.1}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {justGenerated && !isGenerating && (
            <p key={`msg-${genKey}`} className="mt-3 text-xs text-emerald-300/90 anim-fade-up flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              New booking link created
            </p>
          )}

          {currentUser.role === "admin" && showLink && generatedUrl && (
            <div className="mt-4 space-y-2 anim-fade-up">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-sky-200/50">Generated URL (admin)</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(generatedUrl).catch(() => {});
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-sky-500/20 hover:bg-sky-500/10 text-sky-200/60 hover:text-sky-100 transition"
                >
                  Copy
                </button>
              </div>
              <textarea
                readOnly
                value={generatedUrl}
                className="w-full h-24 p-3 input-field rounded-xl font-mono text-[11px] text-sky-100/70 resize-y"
              />
            </div>
          )}
        </section>
      </main>

      <footer className="text-center text-[11px] text-white/15 py-8">
        GDS Linker · wheels up
      </footer>
    </div>
  );
}
