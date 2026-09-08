"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { neon } from "@/lib/neon";
import { PRIORITIES, type Contact, type ContactInput, type Priority, type SortField } from "@/lib/types";
import AuthGate from "@/components/AuthGate";
import ContactForm from "@/components/ContactForm";
import ContactList from "@/components/ContactList";

export default function HomePage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [ascending, setAscending] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting and filtering are pushed to the database as Data API query
  // params (?priority=eq.x&order=...). No user_id filter is sent: RLS
  // scopes every query to the signed-in user's rows.
  const load = useCallback(async () => {
    let query = neon.from("contacts").select("*");
    if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);
    const { data, error } = await query.order(sortField, { ascending });
    if (error) setError(error.message);
    else {
      setError(null);
      setContacts((data ?? []) as Contact[]);
    }
  }, [sortField, ascending, priorityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(input: ContactInput): Promise<boolean> {
    // No user_id in the payload: the column default auth.user_id() fills it
    // server-side and the INSERT policy's WITH CHECK verifies it.
    const result = editing
      ? await neon.from("contacts").update(input).eq("id", editing.id).select().single()
      : await neon.from("contacts").insert(input).select().single();
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setError(null);
    setShowForm(false);
    setEditing(null);
    await load();
    return true;
  }

  async function remove(contact: Contact) {
    if (!window.confirm(`Delete ${contact.name}?`)) return;
    const { error } = await neon.from("contacts").delete().eq("id", contact.id);
    if (error) setError(error.message);
    else await load();
  }

  async function signOut() {
    await neon.auth.signOut();
    router.replace("/sign-in");
  }

  function toggleSort(field: SortField) {
    if (field === sortField) setAscending(!ascending);
    else {
      setSortField(field);
      setAscending(true);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Networking Tracker</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add contact
          </button>
          <button type="button" onClick={signOut} className="text-sm text-gray-600 underline">
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {(showForm || editing) && (
        <ContactForm
          initial={editing}
          onSave={save}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
            setError(null);
          }}
        />
      )}

      <div className="mb-4 flex items-center gap-2 text-sm">
        <label htmlFor="priority-filter" className="text-gray-600">
          Priority:
        </label>
        <select
          id="priority-filter"
          className="rounded border border-gray-300 bg-white px-2 py-1"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
        >
          <option value="all">all</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <ContactList
        contacts={contacts}
        sortField={sortField}
        ascending={ascending}
        onSort={toggleSort}
        onEdit={(c) => {
          setEditing(c);
          setShowForm(true);
        }}
        onDelete={remove}
      />
    </main>
  );
}
