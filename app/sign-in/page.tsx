"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { neon } from "@/lib/neon";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "sign-in"
          ? await neon.auth.signIn.email({ email, password })
          : await neon.auth.signUp.email({ email, password, name });
      if (result.error) {
        setError(result.error.message ?? "Authentication failed.");
      } else {
        router.replace("/");
      }
    } catch {
      setError("Could not reach the auth server. Check your configuration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-semibold">Networking Tracker</h1>
      <p className="mb-6 text-sm text-gray-500">
        {mode === "sign-in" ? "Sign in to your account" : "Create an account"}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <input
            className="rounded border border-gray-300 bg-white px-3 py-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded border border-gray-300 bg-white px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border border-gray-300 bg-white px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-gray-900 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 text-sm text-gray-600 underline"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
        }}
      >
        {mode === "sign-in"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
