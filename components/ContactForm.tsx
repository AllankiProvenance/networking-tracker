"use client";

import { useState } from "react";
import { PRIORITIES, type Contact, type ContactInput, type Priority } from "@/lib/types";

// All validation here is UX only. The trusted validation lives in Postgres:
// NOT NULL + CHECK constraints on the contacts table reject bad rows no
// matter what a client sends.
export default function ContactForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Contact | null;
  onSave: (input: ContactInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [lastContacted, setLastContacted] = useState(initial?.last_contacted ?? "");
  const [nextFollowup, setNextFollowup] = useState(initial?.next_followup ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const opt = (v: string) => (v.trim() === "" ? null : v.trim());
    const ok = await onSave({
      name: name.trim(),
      company: opt(company),
      role: opt(role),
      email: opt(email),
      phone: opt(phone),
      priority,
      last_contacted: opt(lastContacted),
      next_followup: opt(nextFollowup),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: opt(notes),
    });
    setBusy(false);
    if (!ok) return; // parent shows the database error
  }

  const field = "rounded border border-gray-300 bg-white px-3 py-2 text-sm";

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
    >
      <h2 className="col-span-full text-lg font-medium">
        {initial ? "Edit contact" : "New contact"}
      </h2>
      <input className={field} placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
      <select
        className={field}
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p} priority
          </option>
        ))}
      </select>
      <input className={field} placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
      <input className={field} placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
      <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Last contacted
        <input className={field} type="date" value={lastContacted} onChange={(e) => setLastContacted(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Next follow-up
        <input className={field} type="date" value={nextFollowup} onChange={(e) => setNextFollowup(e.target.value)} />
      </label>
      <input
        className={`${field} col-span-full`}
        placeholder="Tags (comma-separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <textarea
        className={`${field} col-span-full`}
        placeholder="Notes"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="col-span-full flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
