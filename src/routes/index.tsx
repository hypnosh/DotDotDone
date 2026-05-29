import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addSession,
  exportSessionsToCSV,
  loadSessions,
  type FocusSession,
} from "@/lib/focus-storage";

export const Route = createFileRoute("/")({
  component: Index,
});

const DURATIONS = [15, 25, 45, 60];

type Status = "idle" | "running" | "paused" | "complete";

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

function Index() {
  const [intendedMinutes, setIntendedMinutes] = useState(25);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0); // seconds of actual focus
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [lastCompletion, setLastCompletion] = useState<FocusSession | null>(
    null,
  );

  const startedAtRef = useRef<string | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // Timer tick — only when running
  useEffect(() => {
    if (status !== "running") return;
    const total = intendedMinutes * 60;
    const id = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= total) {
          window.clearInterval(id);
          finalize(total, total);
          return total;
        }
        return next;
      });
    }, 1000);
    tickRef.current = id;
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, intendedMinutes]);

  function start() {
    if (status === "idle" || status === "complete") {
      setElapsed(0);
      setLastCompletion(null);
      startedAtRef.current = new Date().toISOString();
    }
    setStatus("running");
  }

  function pause() {
    setStatus("paused");
  }

  function end() {
    const total = intendedMinutes * 60;
    finalize(elapsed, total);
  }

  function finalize(actualSeconds: number, totalSeconds: number) {
    if (tickRef.current) window.clearInterval(tickRef.current);
    const startedAt = startedAtRef.current ?? new Date().toISOString();
    const actualMinutes = Math.max(0, Math.round(actualSeconds / 60));
    const intended = Math.round(totalSeconds / 60);
    const completionPercent =
      intended > 0
        ? Math.min(100, Math.round((actualSeconds / totalSeconds) * 100))
        : 0;

    const session: FocusSession = {
      id: crypto.randomUUID(),
      label: label.trim() || undefined,
      startedAt,
      endedAt: new Date().toISOString(),
      intendedMinutes: intended,
      actualMinutes,
      completionPercent,
    };

    const all = addSession(session);
    setSessions(all);
    setLastCompletion(session);
    setStatus("complete");
    setElapsed(0);
    startedAtRef.current = null;
  }

  function reset() {
    if (tickRef.current) window.clearInterval(tickRef.current);
    setStatus("idle");
    setElapsed(0);
    setLastCompletion(null);
    startedAtRef.current = null;
  }

  const totalSeconds = intendedMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

  const weeklyMinutes = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions
      .filter((s) => new Date(s.endedAt).getTime() >= cutoff)
      .reduce((sum, s) => sum + s.actualMinutes, 0);
  }, [sessions]);

  const lastBanner = lastCompletion ?? sessions[0] ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-8 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <span className="font-mono text-xs tracking-widest uppercase">
            DotDotDone
          </span>
        </div>
        <div className="flex gap-8 text-[13px] font-medium">
          <a href="#timer" className="text-foreground">
            Timer
          </a>
          <a
            href="#history"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            History
          </a>
        </div>
      </nav>

      <main className="max-w-screen-xl mx-auto px-6">
        {/* Timer */}
        <section
          id="timer"
          className="flex flex-col items-center justify-center py-24 md:py-32"
        >
          <div className="animate-enter [animation-delay:100ms] text-center w-full">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What are we focusing on?"
              disabled={status === "running"}
              className="bg-transparent border-none text-center text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none text-xl font-normal w-full max-w-md mb-8 disabled:opacity-60"
            />

            <div className="relative flex flex-col items-center">
              <div className="text-[110px] sm:text-[140px] md:text-[200px] font-extrabold tracking-tighter leading-none select-none tabular-nums">
                {formatClock(status === "idle" ? totalSeconds : remaining)}
              </div>
              {status === "running" && (
                <div className="absolute -inset-4 rounded-full border border-primary/20 animate-breathe pointer-events-none" />
              )}
            </div>

            {/* Progress bar */}
            <div className="mx-auto mt-8 w-full max-w-md h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
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
              <div className="flex items-center gap-3">
                {status === "running" ? (
                  <>
                    <button
                      onClick={pause}
                      className="px-10 py-4 bg-foreground text-background rounded-full font-bold hover:bg-primary transition-all active:scale-95"
                    >
                      Pause
                    </button>
                    <button
                      onClick={end}
                      className="px-6 py-4 rounded-full ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors font-medium"
                    >
                      End session
                    </button>
                  </>
                ) : status === "paused" ? (
                  <>
                    <button
                      onClick={start}
                      className="px-10 py-4 bg-foreground text-background rounded-full font-bold hover:bg-primary transition-all active:scale-95"
                    >
                      Resume
                    </button>
                    <button
                      onClick={end}
                      className="px-6 py-4 rounded-full ring-1 ring-border text-foreground hover:bg-foreground/5 transition-colors font-medium"
                    >
                      End session
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
        <section
          id="history"
          className="py-24 border-t border-border animate-enter"
        >
          <div className="flex justify-between items-end mb-12 gap-6 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">History</h2>
              <p className="text-muted-foreground mt-2 max-w-xs">
                The accumulation of small moments. No judgment, just data.
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-extrabold tabular-nums">
                {weeklyMinutes}
              </div>
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
            <div className="grid gap-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="group flex flex-wrap items-center justify-between p-4 rounded-xl hover:bg-foreground/[0.02] transition-colors border border-transparent hover:border-border gap-4"
                >
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-xs text-muted-foreground w-16">
                      {formatDate(s.endedAt)}
                    </span>
                    <div>
                      <div
                        className={`font-bold ${
                          s.label
                            ? ""
                            : "italic text-muted-foreground font-medium"
                        }`}
                      >
                        {s.label || "Untitled session"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Planned: {s.intendedMinutes}m
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:gap-12">
                    <div className="text-right">
                      <div className="text-sm font-mono tabular-nums">
                        {s.actualMinutes}m
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground tracking-tighter">
                        Actual
                      </div>
                    </div>
                    <div className="w-24 sm:w-32 h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${s.completionPercent}%` }}
                      />
                    </div>
                    <div className="text-right w-12">
                      <span className="font-mono text-sm tabular-nums">
                        {s.completionPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="py-12 border-t border-border mt-16">
        <div className="max-w-screen-xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            Build trust, not streaks.
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            DotDotDone · v0.1
          </p>
        </div>
      </footer>
    </div>
  );
}
