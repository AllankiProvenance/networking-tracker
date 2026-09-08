"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { neon } from "@/lib/neon";

// Client-side convenience only: it redirects signed-out visitors to /sign-in.
// The real enforcement is in the database — without a valid session JWT the
// Data API returns nothing, regardless of what the UI renders.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    neon.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.session) setAuthed(true);
        else router.replace("/sign-in");
      })
      .catch(() => {
        if (!cancelled) router.replace("/sign-in");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authed) return <p className="p-8 text-gray-500">Loading…</p>;
  return <>{children}</>;
}
