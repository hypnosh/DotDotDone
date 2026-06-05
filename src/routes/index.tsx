import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addSession, exportSessionsToCSV, loadSessions, type FocusSession } from "@/lib/focus-storage";
import { Calendar } from "@/components/ui/calendar";

function dateKey(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export const Route = createFileRoute("/")({
  component: Index,
});

const DURATIONS = [15, 25, 45, 60];
const CONTINUE_EXTENSION_MIN = 10;

// TODO: replace with the creator's Threads profile URL
const THREADS_URL = "https://www.threads.net/";
// TODO: replace with your Google Apps Script Web App URL (deployed as POST endpoint that writes to a Google Sheet)
const EMAIL_WEBHOOK_URL = "";

type Status = "idle" | "running" | "paused" | "awaiting" | "complete";

function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  // RFC4122-ish fallback for non-secure contexts (http:// on LAN, etc.)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatAgo(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 1) return "less than a minute ago";
  if (totalMin === 1) return "1 minute ago";
  if (totalMin < 60) return `${totalMin} minutes ago`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`;
}

// --- Fallback signals (work even when Notification API is blocked, e.g. iframe) ---
function beep() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    play(880, 0, 0.25);
    play(1175, 0.3, 0.25);
    play(880, 0.6, 0.4);
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* noop */
  }
}

let titleFlashTimer: ReturnType<typeof setInterval> | null = null;
function startTitleFlash() {
  if (typeof document === "undefined") return;
  stopTitleFlash();
  const original = document.title;
  let on = true;
  titleFlashTimer = setInterval(() => {
    document.title = on ? "⏰ Timer complete — DotDotDone" : original;
    on = !on;
  }, 900);
  // Restore on first focus
  const restore = () => {
    stopTitleFlash();
    document.title = original;
    window.removeEventListener("focus", restore);
  };
  window.addEventListener("focus", restore);
}
function stopTitleFlash() {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }
}

function Index() {
  const [intendedMinutes, setIntendedMinutes] = useState(25);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [lastCompletion, setLastCompletion] = useState<FocusSession | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  // Timestamp-based deadline model (robust across pause/continue/awaiting).
  const startedAtRef = useRef<number | null>(null); // real start time ms
  const deadlineAtRef = useRef<number | null>(null); // when remaining hits 0
  const timerEndedAtRef = useRef<number | null>(null); // when status entered awaiting
  const pausedRemainingRef = useRef<number | null>(null); // ms remaining when paused
  const notificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // Keep ticking once per second so derived UI (remaining, "ago") updates.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const ensureNotificationPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // Always try requestPermission synchronously inside the user gesture.
    // If already granted/denied, browsers resolve immediately without prompting.
    try {
      const maybePromise = Notification.requestPermission((res) => {
        setPermissionState(res);
      });
      if (maybePromise && typeof (maybePromise as Promise<NotificationPermission>).then === "function") {
        (maybePromise as Promise<NotificationPermission>).then((res) => setPermissionState(res)).catch(() => {});
      }
    } catch {
      setPermissionState(Notification.permission);
    }
  }, []);

  // Re-sync permission when the tab regains focus (user may have changed it in site settings).
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const sync = () => setPermissionState(Notification.permission);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const fireCompletionSignals = useCallback(() => {
    // Always: audible + title flash (work in any tab state where JS runs).
    beep();
    startTitleFlash();
    // Optional: system notification, if permission granted.
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          notificationRef.current?.close();
          const n = new Notification("Focus session complete", {
            body: "Tap to choose: End & Log, or Continue.",
            tag: "dotdotdone-complete",
            requireInteraction: true,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
          notificationRef.current = n;
        } catch {
          /* noop */
        }
      }
    }
  }, []);

  // Watch for deadline crossing while running.
  useEffect(() => {
    if (status !== "running") return;
    if (deadlineAtRef.current == null) return;
    if (nowTick >= deadlineAtRef.current) {
      timerEndedAtRef.current = deadlineAtRef.current;
      setStatus("awaiting");
      fireCompletionSignals();
    }
  }, [status, nowTick, fireCompletionSignals]);

  // When tab becomes visible during awaiting state, surface the return modal.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.visibilityState === "visible" && status === "awaiting") {
        if (timerEndedAtRef.current && Date.now() - timerEndedAtRef.current > 5000) {
          setShowReturnModal(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [status]);

  function start() {
    // Request permission FIRST, synchronously in the gesture (Safari/FF).
    ensureNotificationPermission();
    // Fresh session
    const now = Date.now();
    startedAtRef.current = now;
    deadlineAtRef.current = now + intendedMinutes * 60_000;
    pausedRemainingRef.current = null;
    timerEndedAtRef.current = null;
    setLastCompletion(null);
    setStatus("running");
  }

  function pause() {
    if (deadlineAtRef.current == null) return;
    pausedRemainingRef.current = Math.max(0, deadlineAtRef.current - Date.now());
    setStatus("paused");
  }

  function resume() {
    if (pausedRemainingRef.current == null) return;
    deadlineAtRef.current = Date.now() + pausedRemainingRef.current;
    pausedRemainingRef.current = null;
    setStatus("running");
  }

  function endNowFromRunning() {
    // User chose to end before the timer completed.
    const elapsedMs = startedAtRef.current != null ? Date.now() - startedAtRef.current : 0;
    const plannedMs = intendedMinutes * 60_000;
    finalize(elapsedMs, plannedMs, new Date().toISOString());
  }

  function finalize(actualMs: number, plannedMs: number, endedAtIso: string) {
    try {
      stopTitleFlash();
      notificationRef.current?.close();
      notificationRef.current = null;

      const startedAtIso = startedAtRef.current
        ? new Date(startedAtRef.current).toISOString()
        : new Date().toISOString();
      const actualMinutes = Math.max(0, Math.round(actualMs / 60_000));
      const intended = Math.max(1, Math.round(plannedMs / 60_000));
      const completionPercent = plannedMs > 0 ? Math.min(100, Math.round((actualMs / plannedMs) * 100)) : 0;

      const session: FocusSession = {
        id: safeUUID(),
        label: label.trim() || undefined,
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        intendedMinutes: intended,
        actualMinutes,
        completionPercent,
      };

      const all = addSession(session);
      setSessions(all);
      setLastCompletion(session);

      // Reset transient state
      startedAtRef.current = null;
      deadlineAtRef.current = null;
      pausedRemainingRef.current = null;
      timerEndedAtRef.current = null;
      setShowReturnModal(false);
      setStatus("complete");
    } catch (err) {
      // Surface the error instead of silently failing — this is the
      // category of bug that breaks "End Session" with no visible feedback.
      console.error("[DotDotDone] Failed to log session:", err);
      alert("Could not log session: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  // PRD: End & Log Then — logs the originally planned duration at timer-completion timestamp.
  function endAndLogPlanned() {
    const plannedMs = intendedMinutes * 60_000;
    const endedAt = timerEndedAtRef.current ?? Date.now();
    finalize(plannedMs, plannedMs, new Date(endedAt).toISOString());
  }

  // PRD: End & Log Now — logs all elapsed real time since start.
  function endAndLogNow() {
    const startedAt = startedAtRef.current ?? Date.now();
    const elapsedMs = Math.max(0, Date.now() - startedAt);
    const plannedMs = intendedMinutes * 60_000;
    finalize(elapsedMs, Math.max(plannedMs, elapsedMs), new Date().toISOString());
  }

  // PRD: Continue — extend the session by N minutes and resume.
  function continueSession(extensionMin = CONTINUE_EXTENSION_MIN) {
    stopTitleFlash();
    notificationRef.current?.close();
    notificationRef.current = null;
    setShowReturnModal(false);

    const extMs = extensionMin * 60_000;
    // Extend planned duration (so completion math + "Log Then" reflect it).
    setIntendedMinutes((m) => m + extensionMin);
    // New deadline = now + extension. Keeps "remaining" exactly equal to extension.
    deadlineAtRef.current = Date.now() + extMs;
    timerEndedAtRef.current = null;
    pausedRemainingRef.current = null;
    setStatus("running");
  }

  function reset() {
    stopTitleFlash();
    notificationRef.current?.close();
    notificationRef.current = null;
    startedAtRef.current = null;
    deadlineAtRef.current = null;
    pausedRemainingRef.current = null;
    timerEndedAtRef.current = null;
    setShowReturnModal(false);
    setLastCompletion(null);
    setStatus("idle");
  }

  // Derive remaining seconds from refs + nowTick
  const plannedSeconds = intendedMinutes * 60;
  let remainingSec: number;
  if (status === "idle" || status === "complete") {
    remainingSec = plannedSeconds;
  } else if (status === "paused") {
    remainingSec = Math.ceil((pausedRemainingRef.current ?? 0) / 1000);
  } else if (status === "awaiting") {
    remainingSec = 0;
  } else {
    // running
    const ms = (deadlineAtRef.current ?? Date.now()) - nowTick;
    remainingSec = Math.max(0, Math.ceil(ms / 1000));
  }
  const progress = plannedSeconds > 0 ? Math.min(1, Math.max(0, 1 - remainingSec / plannedSeconds)) : 0;

  const weeklyMinutes = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => new Date(s.endedAt).getTime() >= cutoff).reduce((sum, s) => sum + s.actualMinutes, 0);
  }, [sessions]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const activityDays = useMemo(() => {
    const s = new Set<string>();
    for (const sess of sessions) s.add(dateKey(sess.endedAt));
    return s;
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    if (!selectedDate) return sessions;
    const key = dateKey(selectedDate);
    return sessions.filter((s) => dateKey(s.endedAt) === key);
  }, [sessions, selectedDate]);

  const dailySummary = useMemo(() => {
    if (!selectedDate) return null;
    const total = visibleSessions.reduce((sum, s) => sum + s.actualMinutes, 0);
    return { total, count: visibleSessions.length };
  }, [selectedDate, visibleSessions]);

  const lastBanner = lastCompletion ?? sessions[0] ?? null;
  const sinceEndedMs = timerEndedAtRef.current ? nowTick - timerEndedAtRef.current : 0;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-8 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <span className="font-mono text-xs tracking-widest uppercase">DotDotDone</span>
        </div>
        <div className="flex gap-8 text-[13px] font-medium">
          <a href="#timer" className="text-foreground">
            Timer
          </a>
          <a href="#history" className="text-muted-foreground hover:text-foreground transition-colors">
            History
          </a>
        </div>
      </nav>

      <main className="max-w-screen-xl mx-auto px-6">
        {/* Timer */}
        <section id="timer" className="flex flex-col items-center justify-center py-24 md:py-32">
          <div className="animate-enter [animation-delay:100ms] text-center w-full">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What are we focusing on?"
              disabled={status === "running" || status === "awaiting"}
              className="bg-transparent border-none text-center text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none text-xl font-normal w-full max-w-md mb-8 disabled:opacity-60"
            />

            <div className="relative flex flex-col items-center">
              <div className="text-[110px] sm:text-[140px] md:text-[200px] font-extrabold tracking-tighter leading-none select-none tabular-nums">
                {formatClock(remainingSec)}
              </div>
              {status === "running" && (
                <div className="absolute -inset-4 rounded-full border border-primary/20 animate-breathe pointer-events-none" />
              )}
              {status === "awaiting" && (
                <div className="absolute -inset-4 rounded-full border border-primary/40 animate-pulse pointer-events-none" />
              )}
            </div>

            {/* Progress bar */}
            <div className="mx-auto mt-8 w-full max-w-md h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.round((status === "awaiting" ? 1 : progress) * 100)}%`,
                }}
              />
            </div>

            {/* Duration picker — only idle */}
            {status === "idle" && (
              <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
                {DURATIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setIntendedMinutes(m)}
                    className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest transition-colors ${
                      intendedMinutes === m
                        ? "bg-foreground text-background"
                        : "ring-1 ring-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            )}

            <div className="mt-12 flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {status === "running" ? (
                  <>
                    <button
                      onClick={pause}
                      className="px-10 py-4 bg-foreground text-background rounded-full font-bold hover:bg-primary transition-all active:scale-95"
                    >
                      Pause
                    </button>
                    <button
                      onClick={endNowFromRunning}
                      className="px-6 py-4 rounded-full ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors font-medium"
                    >
                      End session
                    </button>
                  </>
                ) : status === "paused" ? (
                  <>
                    <button
                      onClick={resume}
                      className="px-10 py-4 bg-foreground text-background rounded-full font-bold hover:bg-primary transition-all active:scale-95"
                    >
                      Resume
                    </button>
                    <button
                      onClick={endNowFromRunning}
                      className="px-6 py-4 rounded-full ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors font-medium"
                    >
                      End session
                    </button>
                  </>
                ) : status === "awaiting" ? (
                  <>
                    <button
                      onClick={endAndLogPlanned}
                      className="px-10 py-4 bg-foreground text-background rounded-full font-bold hover:bg-primary transition-all active:scale-95"
                    >
                      End &amp; Log
                    </button>
                    <button
                      onClick={() => continueSession()}
                      className="px-6 py-4 rounded-full ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors font-medium"
                    >
                      Continue +{CONTINUE_EXTENSION_MIN}m
                    </button>
                  </>
                ) : status === "complete" ? (
                  <button
                    onClick={reset}
                    className="px-10 py-4 bg-foreground text-background rounded-full font-bold hover:bg-primary transition-all active:scale-95"
                  >
                    Start another
                  </button>
                ) : (
                  <button
                    onClick={start}
                    className="px-10 py-4 bg-foreground text-background rounded-full font-bold hover:bg-primary transition-all active:scale-95"
                  >
                    Start Session
                  </button>
                )}
              </div>

              {/* Notification permission hint */}
              {permissionState !== "granted" && permissionState !== "unsupported" && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground max-w-sm text-center">
                    {permissionState === "denied"
                      ? "Notifications are blocked (this often happens inside embedded previews). Open the app in its own tab and click Enable, or unblock in your browser site settings."
                      : "Enable browser notifications to be alerted when your timer ends."}
                  </p>
                  <button
                    onClick={ensureNotificationPermission}
                    className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors"
                  >
                    Enable notifications
                  </button>
                </div>
              )}

              {/* Awaiting decision banner */}
              {status === "awaiting" && timerEndedAtRef.current && (
                <div className="animate-enter bg-primary/10 border border-primary/30 px-5 py-3 rounded-xl max-w-md text-center">
                  <p className="text-sm font-medium text-foreground">Focus session complete.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Timer finished {formatAgo(sinceEndedMs)}. Nothing is logged until you choose.
                  </p>
                </div>
              )}

              {/* Completion / last-session banner */}
              {status === "complete" && lastCompletion ? (
                <div className="animate-enter bg-foreground/5 px-5 py-3 rounded-xl max-w-md">
                  <p className="text-sm font-medium text-foreground">
                    {lastCompletion.actualMinutes} focused minute
                    {lastCompletion.actualMinutes === 1 ? "" : "s"} logged.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lastCompletion.completionPercent === 100
                      ? "Full session complete. Quiet work."
                      : "You showed up. That counts."}
                  </p>
                </div>
              ) : status === "idle" && lastBanner ? (
                <div className="animate-enter [animation-delay:400ms] bg-foreground/5 px-4 py-2 rounded-lg flex items-center gap-3">
                  <div className="size-1.5 rounded-full bg-primary" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-tight">
                    Last session: {lastBanner.actualMinutes} focused minutes —{" "}
                    <span className="text-foreground">You showed up.</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* History */}
        <section id="history" className="py-24 border-t border-border animate-enter">
          <div className="flex justify-between items-end mb-12 gap-6 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">History</h2>
              <p className="text-muted-foreground mt-2 max-w-xs">
                The accumulation of small moments. No judgment, just data.
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-extrabold tabular-nums">{weeklyMinutes}</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Weekly minutes
              </div>
              {sessions.length > 0 && (
                <button
                  onClick={() => exportSessionsToCSV(sessions)}
                  className="mt-3 text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No sessions yet. Whenever you're ready.
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:gap-12 items-start">
              {/* Calendar nav */}
              <div className="flex flex-col gap-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d ?? undefined);
                    if (typeof document !== "undefined") {
                      document.getElementById("history-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  modifiers={{
                    hasActivity: (date) => activityDays.has(dateKey(date)),
                  }}
                  modifiersClassNames={{
                    hasActivity:
                      "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary",
                  }}
                  className="pointer-events-auto rounded-md border border-border p-3"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(undefined)}
                    className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {/* List */}
              <div id="history-list" className="min-w-0">
                {dailySummary && (
                  <div className="mb-6 pb-4 border-b border-border flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      {selectedDate!.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="text-foreground font-bold tabular-nums">{dailySummary.total}</span> min ·{" "}
                      <span className="text-foreground font-bold tabular-nums">{dailySummary.count}</span>{" "}
                      {dailySummary.count === 1 ? "session" : "sessions"}
                    </div>
                  </div>
                )}

                {visibleSessions.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">No sessions recorded.</div>
                ) : (
                  <div className="grid gap-1">
                    {visibleSessions.map((s) => (
                      <div
                        key={s.id}
                        className="group flex flex-wrap items-center justify-between p-4 rounded-xl hover:bg-foreground/[0.02] transition-colors border border-transparent hover:border-border gap-4"
                      >
                        <div className="flex items-center gap-6">
                          <span className="font-mono text-xs text-muted-foreground w-16">{formatDate(s.endedAt)}</span>
                          <div>
                            <div className={`font-bold ${s.label ? "" : "italic text-muted-foreground font-medium"}`}>
                              {s.label || "Untitled session"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">Planned: {s.intendedMinutes}m</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 sm:gap-12">
                          <div className="text-right">
                            <div className="text-sm font-mono tabular-nums">{s.actualMinutes}m</div>
                            <div className="text-[10px] uppercase text-muted-foreground tracking-tighter">Actual</div>
                          </div>
                          <div className="w-24 sm:w-32 h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${s.completionPercent}%` }} />
                          </div>
                          <div className="text-right w-12">
                            <span className="font-mono text-sm tabular-nums">{s.completionPercent}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="py-12 border-t border-border mt-16">
        <div className="max-w-screen-xl mx-auto px-6 flex flex-col gap-6">
          <nav className="flex flex-col md:flex-row md:justify-center items-center gap-4 md:gap-8 text-sm">
            <a
              href={THREADS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              Feedback
            </a>
            <span className="hidden md:inline text-muted-foreground/40">|</span>
            <button
              type="button"
              onClick={() => setShowWhyModal(true)}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Why I Built This
            </button>
            <span className="hidden md:inline text-muted-foreground/40">|</span>
            <button
              type="button"
              onClick={() => {
                setEmailSubmitted(false);
                setEmailError(null);
                setShowEmailModal(true);
              }}
              className="text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Stay Updated
            </button>
          </nav>
          <div className="text-center">
            <a
              href="https://www.ilovecreatingthings.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Made by Amit Sharma
            </a>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Build trust, not streaks.</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">DotDotDone · v0.1</p>
          </div>
        </div>
      </footer>

      {/* Return-to-tab modal */}
      {showReturnModal && status === "awaiting" && timerEndedAtRef.current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-enter">
          <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-[calc(100%-2rem)] p-6">
            <h3 className="text-xl font-bold tracking-tight">Your timer finished {formatAgo(sinceEndedMs)}.</h3>
            <p className="text-sm text-muted-foreground mt-2">What would you like to do?</p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={endAndLogPlanned}
                className="w-full px-5 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-primary transition-colors"
              >
                End &amp; Log Then
                <span className="block text-[11px] font-normal opacity-70 mt-0.5">
                  Log {intendedMinutes} min — as if you stopped on time.
                </span>
              </button>
              <button
                onClick={endAndLogNow}
                className="w-full px-5 py-3 rounded-xl ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors font-medium"
              >
                End &amp; Log Now
                <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                  Log all elapsed time since start.
                </span>
              </button>
              <button
                onClick={() => continueSession()}
                className="w-full px-5 py-3 rounded-xl ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors font-medium"
              >
                Continue +{CONTINUE_EXTENSION_MIN}m
                <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                  Keep focusing. Decide later.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Why I Built This modal */}
      {showWhyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-enter p-4"
          onClick={() => setShowWhyModal(false)}
        >
          <div
            className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold tracking-tight">Why I Built This</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                I wanted a simple timer and time log that didn't guilt me, punish me, or try to gamify
                my behaviour.
              </p>
              <p>No streaks. No dead trees. No productivity score.</p>
              <p>
                Just a timer, a history of where my time went, and enough information to help me
                understand my day.
              </p>
              <p>If it helps you too, that's wonderful.</p>
            </div>
            <button
              onClick={() => setShowWhyModal(false)}
              className="mt-6 w-full px-5 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stay Updated modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-enter p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {emailSubmitted ? (
              <>
                <h3 className="text-xl font-bold tracking-tight">Thank you.</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  I'll only reach out when there's something genuinely worth sharing.
                </p>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmail("");
                  }}
                  className="mt-6 w-full px-5 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-primary transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold tracking-tight">Stay Updated</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Leave your email if you'd like occasional updates.
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  This is not an account. You do not need an email to use the app. No spam.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setEmailError(null);
                    const value = email.trim();
                    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                      setEmailError("Please enter a valid email address.");
                      return;
                    }
                    if (!EMAIL_WEBHOOK_URL) {
                      setEmailError("Email signup isn't configured yet.");
                      return;
                    }
                    setEmailSubmitting(true);
                    try {
                      const formData = new FormData();
                      formData.append("timestamp", new Date().toISOString());
                      formData.append("email", value);
                      await fetch(EMAIL_WEBHOOK_URL, {
                        method: "POST",
                        mode: "no-cors",
                        body: formData,
                      });
                      setEmailSubmitted(true);
                    } catch (err) {
                      console.error(err);
                      setEmailError("Something went wrong. Please try again.");
                    } finally {
                      setEmailSubmitting(false);
                    }
                  }}
                  className="mt-5 flex flex-col gap-3"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={emailSubmitting}
                    className="w-full px-5 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-primary transition-colors disabled:opacity-60"
                  >
                    {emailSubmitting ? "Submitting…" : "Submit"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
