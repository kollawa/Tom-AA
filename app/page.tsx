"use client";

import { useState, useCallback } from "react";

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

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function parseTime(t: string): { h: number; m: number } | null {
  // 1020A, 245P, 705A, 855A etc.
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
  // 31DEC, 30JAN etc.
  const m = d.match(/^(\d{1,2})([A-Z]{3})$/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS[m[2].toUpperCase()];
  if (mon === undefined) return null;
  const now = new Date();
  let year = yearHint ?? now.getFullYear();
  // if month is before current and no year, assume next year if past
  const candidate = new Date(year, mon, day);
  if (!yearHint && candidate < now) {
    year += 1;
  }
  return new Date(year, mon, day);
}

function parseSabreLine(line: string): Segment | null {
  // Examples:
  // 1 AA 763I 31DEC Q MUCCLT*SS2 1020A 245P /DCAA /E
  // 2 AA2305I 31DEC Q CLTDEN*SS2 456P 635P /DCAA /E
  // 3 BA 176O 30JAN J JFKLHR*SS2 705P 705A 31JAN S /DCBA /E
  // 4 BA 396O 31JAN S LHRCAI*SS2 855A 355P /DCBA /E
  // 1 UA9459P 31DEC Q MUCDEN*SS1 1150A 230P /DCUA /E

  const cleaned = line.trim().replace(/^\d+\s+/, ""); // remove leading number

  // Carrier + flight + class
  // AA 763I or AA2305I or UA9459P
  const flightMatch = cleaned.match(/^([A-Z0-9]{2})\s*(\d{1,4})([A-Z])/i);
  if (!flightMatch) return null;

  const cc = flightMatch[1].toUpperCase();
  const num = flightMatch[2];
  const cls = flightMatch[3].toUpperCase();

  let rest = cleaned.slice(flightMatch[0].length).trim();

  // Date
  const dateMatch = rest.match(/^(\d{1,2}[A-Z]{3})/i);
  if (!dateMatch) return null;
  const depDateStr = dateMatch[1].toUpperCase();
  rest = rest.slice(dateMatch[0].length).trim();

  // Day of week (optional single letter)
  rest = rest.replace(/^[A-Z]\s+/, "");

  // City pair: MUCCLT*SS2 or MUCDEN*SS1
  const cityMatch = rest.match(/^([A-Z]{3})([A-Z]{3})\*?[A-Z]{0,2}\d*/i);
  if (!cityMatch) return null;
  const orig = cityMatch[1].toUpperCase();
  const dest = cityMatch[2].toUpperCase();
  rest = rest.slice(cityMatch[0].length).trim();

  // Times: 1020A 245P   or  705P 705A 31JAN
  const timeMatch = rest.match(/^(\d{1,4}[AP])\s+(\d{1,4}[AP])/i);
  if (!timeMatch) return null;
  const depTimeStr = timeMatch[1].toUpperCase();
  const arrTimeStr = timeMatch[2].toUpperCase();
  rest = rest.slice(timeMatch[0].length).trim();

  // Optional next day date for arrival
  let arrDateStr = depDateStr;
  const nextDateMatch = rest.match(/^(\d{1,2}[A-Z]{3})/i);
  if (nextDateMatch) {
    arrDateStr = nextDateMatch[1].toUpperCase();
  }

  // Cabin guess from class
  const cabinMap: Record<string, string> = {
    F: "FIRST", A: "FIRST", P: "FIRST",
    J: "BUSIN", C: "BUSIN", D: "BUSIN", I: "BUSIN", Z: "BUSIN",
    W: "PREME", S: "PREME",
    Y: "ECON", B: "ECON", M: "ECON", H: "ECON", Q: "ECON",
    V: "ECON", L: "ECON", K: "ECON", T: "ECON", N: "ECON",
    O: "ECON", G: "ECON", E: "ECON", U: "ECON", X: "ECON",
  };
  let cabin = cabinMap[cls] || "ECON";
  // Special for some
  if (cls === "I" || cls === "D") cabin = "FLAGS"; // from screenshot example

  // Build ISO dates
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
    dep_local = d.toISOString().slice(0, 16).replace("T", " ");
  }
  if (arrDate && arrT) {
    const a = new Date(arrDate);
    a.setHours(arrT.h, arrT.m, 0, 0);
    // if arrival time earlier and same day, maybe next day already handled
    arr_local = a.toISOString().slice(0, 16).replace("T", " ");

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
    cc,
    num,
    cls,
    cabin,
    orig,
    dest,
    dep_local,
    arr_local,
    dur,
    fare_basis: "",
    new_dir: false,
  };
}

function toTimestamp(isoLocal: string): number {
  // "2026-12-31 10:20" -> ms (treat local time as UTC for AA links)
  if (!isoLocal) return 0;
  const normalized = isoLocal.trim().replace(" ", "T");
  // Ensure we have seconds
  const withSec = normalized.length === 16 ? normalized + ":00" : normalized;
  const d = new Date(withSec + "Z");
  return d.getTime();
}

function generateAALink(
  segments: Segment[],
  price: string,
  _currency: string,
  pax: number
): string {
  if (segments.length === 0) return "";

  // Working example structure:
  // GOOGLE,0,US,multi,4,A1S0C0I0Y0L0,0,MUC,0,DEN,0,0,0,0,0,0,0,1.00,1,
  // #MUC|DEN|0|0|ts #JFK|CAI|0|0|ts ,
  // #AA|763|I|MUC|CLT|ts|0 #AA|2305|I|CLT|DEN|ts|0 #BA|176|O|JFK|LHR|ts|1 #BA|396|O|LHR|CAI|ts|1

  // 1) Group segments by direction (new_dir flag starts a new direction)
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

  // 2) City-pairs: only origin of first segment → dest of last segment of each direction
  const cityPairs: string[] = [];
  directions.forEach((dirSegs) => {
    const first = dirSegs[0];
    const last = dirSegs[dirSegs.length - 1];
    const ts = toTimestamp(first.dep_local);
    cityPairs.push(`#${first.orig}|${last.dest}|0|0|${ts}`);
  });

  // 3) Flights: every segment with its direction index
  const flights: string[] = [];
  directions.forEach((dirSegs, dirIndex) => {
    dirSegs.forEach((seg) => {
      const ts = toTimestamp(seg.dep_local);
      flights.push(
        `#${seg.cc}|${seg.num}|${seg.cls}|${seg.orig}|${seg.dest}|${ts}|${dirIndex}`
      );
    });
  });

  const cityPairsStr = cityPairs.join("");
  const flightsStr = flights.join("");

  // 4) Header
  const firstSeg = segments[0];
  const lastOfFirstDir = directions[0][directions[0].length - 1];
  const numSeg = segments.length;

  // Cabin code – from working example for I-class they used A1S0C0I0Y0L0
  let cabinCode = "A0S0C0I0Y1L0";
  const classes = segments.map((s) => s.cls);
  if (classes.some((c) => ["F", "A", "P"].includes(c))) cabinCode = "A1S0C0I0Y0L0";
  else if (classes.some((c) => ["J", "C", "D", "I", "Z"].includes(c)))
    cabinCode = "A1S0C0I0Y0L0"; // matches the working example for I class
  else if (classes.some((c) => ["W", "S"].includes(c))) cabinCode = "A0S1C0I0Y0L0";

  const priceStr = price || "0";
  const header = `GOOGLE,0,US,multi,${numSeg},${cabinCode},0,${firstSeg.orig},0,${lastOfFirstDir.dest},0,0,0,0,0,0,0,${priceStr},${pax},`;

  const iten = `${header}${encodeURIComponent(cityPairsStr)},${encodeURIComponent(flightsStr)}`;

  return `https://www.aa.com/goto/metasearch?ITEN=${iten}`;
}

export default function Home() {
  const [rawLines, setRawLines] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [price, setPrice] = useState("1210.61");
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState("1.16");
  const [pax, setPax] = useState("1");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);

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
    // Mark first of each "direction" roughly – user can toggle
    if (parsed.length > 0) {
      // simple heuristic: if gap in dates > 5 days, mark new dir
      for (let i = 1; i < parsed.length; i++) {
        const prev = new Date(parsed[i - 1].dep_local);
        const curr = new Date(parsed[i].dep_local);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 5) parsed[i].new_dir = true;
      }
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
        cc: "",
        num: "",
        cls: "Y",
        cabin: "ECON",
        orig: "",
        dest: "",
        dep_local: "",
        arr_local: "",
        dur: "",
        fare_basis: "",
        new_dir: false,
      },
    ]);
  };

  const handleGenerate = () => {
    const url = generateAALink(segments, price, currency, parseInt(pax) || 1);
    setGeneratedUrl(url);
    setCopied(false);
  };

  const copyUrl = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          GDS → AA Booking Link Generator
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Paste Sabre availability / itinerary lines (*IA style), parse, edit and generate American Airlines metasearch deep-link.
        </p>

        {/* 1. Paste */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-medium text-gray-800 mb-3">
            1. Paste GDS availability lines
          </h2>
          <textarea
            className="w-full h-32 p-3 border border-gray-200 rounded-lg font-mono text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
            placeholder={`1 AA 763I 31DEC Q MUCCLT*SS2 1020A 245P /DCAA /E
2 AA2305I 31DEC Q CLTDEN*SS2 456P 635P /DCAA /E
3 BA 176O 30JAN J JFKLHR*SS2 705P 705A 31JAN S /DCBA /E
4 BA 396O 31JAN S LHRCAI*SS2 855A 355P /DCBA /E`}
            value={rawLines}
            onChange={(e) => setRawLines(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleParse}
              className="bg-[#c8102e] hover:bg-[#a50d25] text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              Parse
            </button>
            <span className="text-sm text-gray-500">
              {segments.length} segment(s) parsed
            </span>
          </div>
        </section>

        {/* 2. Segments */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-medium text-gray-800 mb-1">
            2. Segments
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Flight fields come from the pasted lines; fare basis, cabin and the new direction toggle are editable.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-2 font-medium">cc</th>
                  <th className="pb-2 pr-2 font-medium">num</th>
                  <th className="pb-2 pr-2 font-medium">cls</th>
                  <th className="pb-2 pr-2 font-medium">cabin</th>
                  <th className="pb-2 pr-2 font-medium">orig</th>
                  <th className="pb-2 pr-2 font-medium">dest</th>
                  <th className="pb-2 pr-2 font-medium">dep_local</th>
                  <th className="pb-2 pr-2 font-medium">arr_local</th>
                  <th className="pb-2 pr-2 font-medium">dur</th>
                  <th className="pb-2 pr-2 font-medium">fare_basis</th>
                  <th className="pb-2 pr-2 font-medium">new dir</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {segments.map((seg) => (
                  <tr key={seg.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-12 border rounded px-1.5 py-1 text-center"
                        value={seg.cc}
                        onChange={(e) => updateSegment(seg.id, "cc", e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-14 border rounded px-1.5 py-1 text-center"
                        value={seg.num}
                        onChange={(e) => updateSegment(seg.id, "num", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-10 border rounded px-1.5 py-1 text-center"
                        value={seg.cls}
                        onChange={(e) => updateSegment(seg.id, "cls", e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-16 border rounded px-1.5 py-1 text-center"
                        value={seg.cabin}
                        onChange={(e) => updateSegment(seg.id, "cabin", e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-14 border rounded px-1.5 py-1 text-center"
                        value={seg.orig}
                        onChange={(e) => updateSegment(seg.id, "orig", e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-14 border rounded px-1.5 py-1 text-center"
                        value={seg.dest}
                        onChange={(e) => updateSegment(seg.id, "dest", e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-36 border rounded px-1.5 py-1"
                        value={seg.dep_local}
                        onChange={(e) => updateSegment(seg.id, "dep_local", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-36 border rounded px-1.5 py-1"
                        value={seg.arr_local}
                        onChange={(e) => updateSegment(seg.id, "arr_local", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-14 border rounded px-1.5 py-1 text-center"
                        value={seg.dur}
                        onChange={(e) => updateSegment(seg.id, "dur", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 pr-1">
                      <input
                        className="w-20 border rounded px-1.5 py-1"
                        value={seg.fare_basis}
                        onChange={(e) => updateSegment(seg.id, "fare_basis", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 pr-1 text-center">
                      <input
                        type="checkbox"
                        checked={seg.new_dir}
                        onChange={(e) => updateSegment(seg.id, "new_dir", e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="py-1.5">
                      <button
                        onClick={() => removeSegment(seg.id)}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            className="mt-3 text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
          >
            + add row manually
          </button>
        </section>

        {/* 3. Options */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-medium text-gray-800 mb-4">
            3. Options
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Price (required)
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Source currency
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                USD per 1 EUR rate
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 max-w-xs">
            <label className="block text-xs text-gray-500 mb-1">Passengers</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={pax}
              onChange={(e) => setPax(e.target.value)}
            />
          </div>
        </section>

        {/* 4. Generate */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-medium text-gray-800 mb-4">
            4. Generate booking
          </h2>
          <button
            onClick={handleGenerate}
            disabled={segments.length === 0}
            className="bg-[#c8102e] hover:bg-[#a50d25] disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Generate booking
          </button>

          {generatedUrl && (
            <div className="mt-5 space-y-3">
              <div className="flex gap-2">
                <input
                  readOnly
                  className="flex-1 border rounded-lg px-3 py-2 text-xs font-mono bg-gray-50"
                  value={generatedUrl}
                />
                <button
                  onClick={copyUrl}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 whitespace-nowrap"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 whitespace-nowrap"
                >
                  Open
                </a>
              </div>
              <p className="text-xs text-gray-500">
                Ссылка сгенерирована. Открой её — AA должна подхватить маршрут.
                Если что-то не так (даты/классы), поправь сегменты и сгенерируй заново.
              </p>
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-gray-400 pt-4">
          GDS Linker · для внутреннего использования · deploy on Vercel
        </footer>
      </div>
    </div>
  );
}
