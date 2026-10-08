"use client";

import { useState, useTransition } from "react";
import { addGuests, deleteGuest } from "@/app/dashboard/actions";
import { format, type Dict } from "@/i18n";
import { whatsappShareUrl } from "@/lib/event-utils";

export interface GuestRow {
  id: string;
  name: string;
  token: string;
  expected_count: number;
  phone: string | null;
  replied: boolean;
}

export function GuestManager({
  eventId,
  title,
  baseUrl,
  guests,
  maxGuests,
  labels,
}: {
  eventId: string;
  title: string;
  /** Absolute event URL without query string. */
  baseUrl: string;
  guests: GuestRow[];
  maxGuests: number;
  labels: Dict["dash"]["guests"];
}) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const link = (g: GuestRow) => `${baseUrl}?g=${encodeURIComponent(g.token)}`;

  function add() {
    start(async () => {
      const r = await addGuests(eventId, text);
      if (r.ok) {
        setText("");
        setMsg({ ok: true, text: format(labels.added, { n: r.added }) });
      } else {
        const errors = labels.errors as Record<string, string>;
        setMsg({ ok: false, text: errors[r.error] ?? labels.errors.failed });
      }
    });
  }

  async function copy(g: GuestRow) {
    try {
      await navigator.clipboard.writeText(link(g));
      setCopied(g.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt(labels.copyLink, link(g));
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-muted">{labels.intro}</p>

      <div className="card space-y-3 p-4">
        <label htmlFor="bulk" className="block text-lg font-semibold">{labels.bulkTitle}</label>
        <p className="text-sm text-muted">{labels.bulkHint}</p>
        <textarea id="bulk" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={labels.bulkPlaceholder} className="field" />
        <button type="button" disabled={pending || !text.trim()} className="btn-accent disabled:opacity-60" onClick={add}>
          {pending ? labels.adding : labels.add}
        </button>
        {msg && <p role="status" className={`font-semibold ${msg.ok ? "text-green-800" : "text-red-800"}`}>{msg.text}</p>}
        <p className="text-sm text-muted">{format(labels.limit, { max: maxGuests })}</p>
      </div>

      {guests.length === 0 ? (
        <p className="text-muted">{labels.empty}</p>
      ) : (
        <ul className="space-y-3">
          {guests.map((g) => (
            <li key={g.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-lg font-semibold">{g.name}</p>
                <p className="text-sm text-muted">
                  {labels.count}: {g.expected_count} ·{" "}
                  <span className={g.replied ? "font-semibold text-green-800" : ""}>{g.replied ? labels.replied : labels.waiting}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-outline" onClick={() => copy(g)}>
                  {copied === g.id ? labels.copied : labels.copyLink}
                </button>
                <a
                  className="btn-accent"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={whatsappShareUrl(`${format(labels.message, { name: g.name, title })} ${link(g)}`, g.phone)}
                >
                  {labels.whatsapp}
                </a>
                <button type="button" className="tap px-2 text-red-800 underline" disabled={pending} onClick={() => start(() => deleteGuest(eventId, g.id))}>
                  {labels.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
