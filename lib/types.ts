export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Contact {
  id: number;
  user_id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  priority: Priority;
  last_contacted: string | null;
  next_followup: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// What the browser is allowed to send. Never includes user_id: the database
// fills it from auth.user_id() and RLS rejects forged values.
export interface ContactInput {
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  priority: Priority;
  last_contacted: string | null;
  next_followup: string | null;
  tags: string[];
  notes: string | null;
}

export type SortField = "name" | "priority" | "last_contacted" | "next_followup";
