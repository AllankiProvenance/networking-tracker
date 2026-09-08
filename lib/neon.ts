import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

// Browser-side client. Both URLs are public by design: they are endpoints,
// not credentials. Every Data API request carries the signed-in user's JWT
// (attached automatically by neon-js) and is enforced by grants + RLS in
// Postgres. DATABASE_URL is never imported anywhere under app/, components/,
// or lib/.
export const neon = createClient({
  auth: {
    url: process.env.NEXT_PUBLIC_NEON_AUTH_URL!,
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: process.env.NEXT_PUBLIC_NEON_DATA_API_URL!,
  },
});
