"use client";

import { useEffect, useState, useCallback } from "react";

/*
 * 8 animation steps, 700ms each (~5.6s per cycle):
 *  0: idle / reset
 *  1: requests arrive
 *  2: req A writes its ID
 *  3: req B writes (safe: own scope, unsafe: overwrites A)
 *  4: delay period
 *  5: req A reads back
 *  6: results appear
 *  7: hold, then loop
 *
 * All elements are always rendered in the DOM to prevent layout shift.
 * Visibility is controlled via opacity only.
 */

const STEP_MS = 700;
const STEPS = 8;
const ID_A = "a3f8";
const ID_B = "7c2e";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function Simulation() {
  const [step, setStep] = useState<Step>(0);
  const [running, setRunning] = useState(true);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setStep((s) => {
        const next = ((s + 1) % STEPS) as Step;
        if (next === 0) setCycle((c) => c + 1);
        return next;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [running]);

  const toggle = useCallback(() => setRunning((r) => !r), []);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* toolbar */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-surface-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              running ? "bg-safe animate-[pulse-safe_2s_ease-in-out_infinite]" : "bg-muted"
            }`}
          />
          <span className="font-mono text-xs text-muted tracking-widest uppercase">
            Simulation
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted tabular-nums">
            cycle {cycle + 1} &middot; step {step}/{STEPS - 1}
          </span>
          <button
            onClick={toggle}
            className="font-mono text-xs border border-border px-2.5 py-1 rounded hover:border-border-hover hover:text-foreground text-muted transition-colors"
          >
            {running ? "pause" : "play"}
          </button>
        </div>
      </div>

      {/* panels — fixed height grid */}
      <div className="grid md:grid-cols-2 gap-px bg-border">
        <SafePanel step={step} />
        <UnsafePanel step={step} />
      </div>
    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────────── */

/** opacity wrapper — always in DOM, never shifts layout */
function Vis({ on, children, className = "" }: { on: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

function Dot({ label, color, on }: { label: string; color: "safe" | "danger"; on: boolean }) {
  const bg = color === "safe" ? "bg-safe" : "bg-danger";
  return (
    <div className={`transition-all duration-400 ${on ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
      <div className={`w-5 h-5 rounded-full ${bg} flex items-center justify-center`}>
        <span className="text-[9px] font-mono font-bold text-background">{label}</span>
      </div>
    </div>
  );
}

/* ── Safe panel ──────────────────────────────────────────────── */

function SafePanel({ step }: { step: Step }) {
  return (
    <div className="bg-surface p-5 h-[320px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-safe" />
        <span className="font-mono text-xs text-safe tracking-wider uppercase">React.cache()</span>
      </div>

      {/* function box */}
      <div className="border border-border rounded-lg p-3 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[10px] text-muted uppercase tracking-wider">fn instance</span>
          <div className="flex gap-1.5">
            <Dot label="A" color="safe" on={step >= 1} />
            <Dot label="B" color="safe" on={step >= 1} />
          </div>
        </div>

        {/* scope boxes — always rendered */}
        <div className="space-y-1.5 flex-1">
          <Vis on={step >= 2}>
            <div className={`border border-safe-border bg-safe-glow rounded px-2.5 py-1 ${step === 5 ? "sim-reading-pulse" : ""}`}>
              <span className="font-mono text-[10px] text-muted">scope A → </span>
              <span className="font-mono text-xs text-safe">{ID_A}</span>
            </div>
          </Vis>
          <Vis on={step >= 3}>
            <div className="border border-safe-border bg-safe-glow rounded px-2.5 py-1">
              <span className="font-mono text-[10px] text-muted">scope B → </span>
              <span className="font-mono text-xs text-safe">{ID_B}</span>
            </div>
          </Vis>
        </div>

        {/* readback */}
        <Vis on={step >= 5} className="mt-2">
          <p className="font-mono text-[11px] text-safe">A reads back → {ID_A} ✓</p>
        </Vis>
      </div>

      {/* results — always in DOM */}
      <div className="mt-3 space-y-1">
        <Vis on={step >= 6}>
          <Row label="A" id={ID_A} ok />
        </Vis>
        <Vis on={step >= 6}>
          <Row label="B" id={ID_B} ok />
        </Vis>
      </div>
    </div>
  );
}

/* ── Unsafe panel ────────────────────────────────────────────── */

function UnsafePanel({ step }: { step: Step }) {
  const overwritten = step >= 3;
  const val = overwritten ? ID_B : ID_A;

  return (
    <div className="bg-surface p-5 h-[320px] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-danger" />
        <span className="font-mono text-xs text-danger tracking-wider uppercase">Module Singleton</span>
      </div>

      {/* function box */}
      <div className="border border-border rounded-lg p-3 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[10px] text-muted uppercase tracking-wider">fn instance</span>
          <div className="flex gap-1.5">
            <Dot label="A" color="danger" on={step >= 1} />
            <Dot label="B" color="danger" on={step >= 1} />
          </div>
        </div>

        {/* singleton — always rendered, value changes */}
        <div className="flex-1">
          <Vis on={step >= 2}>
            <div
              className={`border rounded px-2.5 py-1.5 transition-colors duration-200 ${
                overwritten
                  ? "border-amber/40 bg-amber/5"
                  : "border-danger-border bg-danger-glow"
              } ${step === 3 ? "sim-overwrite-flash" : ""}`}
            >
              <span className="font-mono text-[10px] text-muted">let client = </span>
              <span className={`font-mono text-xs transition-colors duration-200 ${overwritten ? "text-amber" : "text-danger"}`}>
                {"{"} id: &quot;{val}&quot; {"}"}
              </span>
              <Vis on={overwritten && step < 6} className="mt-0.5">
                <span className="font-mono text-[10px] text-amber">↑ B overwrote A</span>
              </Vis>
            </div>
          </Vis>
        </div>

        {/* readback */}
        <Vis on={step >= 5} className="mt-2">
          <p className="font-mono text-[11px] text-danger">
            A reads back → {ID_B} ✗ <span className="text-amber text-[10px]">(wanted {ID_A})</span>
          </p>
        </Vis>
      </div>

      {/* results */}
      <div className="mt-3 space-y-1">
        <Vis on={step >= 6}>
          <Row label="A" id={ID_B} ok={false} />
        </Vis>
        <Vis on={step >= 6}>
          <Row label="B" id={ID_B} ok />
        </Vis>
      </div>
    </div>
  );
}

/* ── Result row ──────────────────────────────────────────────── */

function Row({ label, id, ok }: { label: string; id: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center justify-between font-mono text-[11px] px-2.5 py-1 rounded border ${
        ok
          ? "border-safe-border bg-safe-glow text-safe"
          : "border-danger-border bg-danger-glow text-danger"
      }`}
    >
      <span>Req {label} → <span className="font-bold">{id}</span></span>
      <span>{ok ? "✓ isolated" : "✗ leaked"}</span>
    </div>
  );
}
