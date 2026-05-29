export type FocusSession = {
  id: string;
  label?: string;
  startedAt: string;
  endedAt: string;
  intendedMinutes: number;
  actualMinutes: number;
  completionPercent: number;
};

const KEY = "dotdotdone.sessions.v1";

export function loadSessions(): FocusSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FocusSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: FocusSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function addSession(session: FocusSession) {
  const all = loadSessions();
  all.unshift(session);
  saveSessions(all);
  return all;
}

function escapeCsvCell(value: string | number | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportSessionsToCSV(sessions: FocusSession[]) {
  if (typeof window === "undefined" || sessions.length === 0) return;

  const headers = [
    "Date",
    "Start Time",
    "End Time",
    "Label",
    "Planned (min)",
    "Actual (min)",
    "Completion (%)",
  ];

  const rows = sessions.map((s) => {
    const started = new Date(s.startedAt);
    const ended = new Date(s.endedAt);
    return [
      started.toLocaleDateString(),
      started.toLocaleTimeString(),
      ended.toLocaleTimeString(),
      s.label || "Untitled",
      s.intendedMinutes,
      s.actualMinutes,
      s.completionPercent,
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `dotdotdone-history-${dateStr}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
