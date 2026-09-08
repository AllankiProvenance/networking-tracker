"use client";

import type { Contact, SortField } from "@/lib/types";

const SORTABLE: { field: SortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "priority", label: "Priority" },
  { field: "last_contacted", label: "Last contacted" },
  { field: "next_followup", label: "Next follow-up" },
];

const PRIORITY_STYLES: Record<Contact["priority"], string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-gray-100 text-gray-600",
};

export default function ContactList({
  contacts,
  sortField,
  ascending,
  onSort,
  onEdit,
  onDelete,
}: {
  contacts: Contact[];
  sortField: SortField;
  ascending: boolean;
  onSort: (field: SortField) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}) {
  if (contacts.length === 0) {
    return <p className="py-12 text-center text-gray-500">No contacts yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
          <tr>
            {SORTABLE.map(({ field, label }) => (
              <th key={field} className="px-4 py-3">
                <button type="button" onClick={() => onSort(field)} className="font-medium uppercase">
                  {label}
                  {sortField === field ? (ascending ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
            <th className="px-4 py-3">Company / Role</th>
            <th className="px-4 py-3">Tags</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">{c.email ?? c.phone ?? ""}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[c.priority]}`}>
                  {c.priority}
                </span>
              </td>
              <td className="px-4 py-3">{c.last_contacted ?? "—"}</td>
              <td className="px-4 py-3">{c.next_followup ?? "—"}</td>
              <td className="px-4 py-3">
                {[c.company, c.role].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {c.tags.length > 0 ? c.tags.join(", ") : "—"}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button type="button" onClick={() => onEdit(c)} className="mr-3 text-gray-600 underline">
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(c)} className="text-red-600 underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
