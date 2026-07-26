import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "../lib/api";
import { useSession } from "../lib/store";
import { Button, inputClass } from "./ui";

/** First-run identity claim. No passwords — self-hosted team tool; real auth later. */
export function NameGate({ children }: { children: ReactNode }) {
  const { user, setUser } = useSession();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      setUser(await api.createUser(name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-mono text-[13px] text-accent">[ · ]</span>
          <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Annotix</h1>
          <p className="mt-1 text-[14px] text-muted">
            Label images. Train better models.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-2xl bg-surface p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          <label className="mb-1.5 block text-[13px] font-medium text-muted">
            Your display name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            className={inputClass}
          />
          <p className="mt-2 text-[12px] text-faint">
            Teammates see this name while you annotate together.
          </p>
          {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
          <div className="mt-4">
            <Button type="submit" disabled={busy || !name.trim()}>
              Start annotating
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
