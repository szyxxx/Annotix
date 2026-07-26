import type { ReactNode } from "react";
import type { User } from "../lib/api";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "studio";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const styles = {
    primary:
      "bg-accent text-white hover:bg-accent-hover shadow-[0_1px_2px_rgba(99,91,255,0.4)]",
    secondary: "bg-surface text-ink border border-hairline hover:bg-bg",
    ghost: "text-muted hover:text-ink hover:bg-black/5",
    danger: "bg-surface text-red-600 border border-hairline hover:bg-red-50",
    studio:
      "bg-studio-raised text-studio-ink border border-studio-line hover:border-accent/60",
  }[variant];
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none ${styles}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-black/5 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
            value === opt.value
              ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              : "text-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Mono class chip — `0 · person` with the label color. The Annotix motif. */
export function ClassChip({
  idx,
  name,
  color,
  dark,
}: {
  idx: number;
  name: string;
  color: string;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] ${
        dark ? "bg-white/10 text-studio-ink" : "bg-black/5 text-ink"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className={dark ? "text-studio-muted" : "text-faint"}>{idx}</span>
      {name}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <h2 className="mb-4 text-[17px] font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[14px] placeholder:text-faint focus:border-accent focus:outline-none transition-colors";

export function PresenceAvatars({ users, dark }: { users: User[]; dark?: boolean }) {
  if (users.length === 0) return null;
  return (
    <div className="flex items-center -space-x-1.5" title={users.map((u) => u.name).join(", ")}>
      {users.slice(0, 5).map((u, i) => (
        <span
          key={`${u.id}-${i}`}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ${
            dark ? "ring-studio-panel" : "ring-surface"
          }`}
          style={{ background: u.color }}
        >
          {u.name.slice(0, 1).toUpperCase()}
        </span>
      ))}
      {users.length > 5 && (
        <span className={`pl-2 text-[11px] ${dark ? "text-studio-muted" : "text-muted"}`}>
          +{users.length - 5}
        </span>
      )}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 py-20 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
