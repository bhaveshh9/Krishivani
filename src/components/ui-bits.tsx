import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_META, type RainStatus } from "@/lib/demo-data";
import { useBackendStatus } from "@/lib/api";

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-status-moderate/40 bg-status-moderate/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-status-moderate",
        className,
      )}
    >
      Prototype / Demo Data
    </span>
  );
}

export function StatusBadge({ status }: { status: RainStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: meta.colorVar }} />
      {meta.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  demo,
}: {
  title: string;
  subtitle?: string;
  demo?: boolean;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {demo && <DemoTag />}
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Card({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Shows whether live data comes from the Flask backend or the built-in Demo Mode fallback. */
export function BackendBadge() {
  const online = useBackendStatus();
  if (online === null) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
      online ? "border-status-normal/40 bg-status-normal/10 text-status-normal" : "border-status-severe/40 bg-status-severe/10 text-status-severe")}>
      <span className={cn("size-1.5 rounded-full", online ? "bg-status-normal" : "bg-status-severe")} />
      {online ? "Flask backend connected" : "Backend offline — Demo Mode (built-in sample data)"}
    </span>
  );
}
