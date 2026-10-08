"use client";

import { useTransition } from "react";
import { deleteWish, setWishApproved } from "@/app/dashboard/actions";
import type { Dict } from "@/i18n";

export interface WishAdminRow {
  id: string;
  name: string;
  message: string;
  is_approved: boolean;
}

export function WishModerator({ eventId, wishes, labels }: { eventId: string; wishes: WishAdminRow[]; labels: Dict["dash"]["wishesAdmin"] }) {
  const [pending, start] = useTransition();
  if (!wishes.length) return <p className="text-muted">{labels.empty}</p>;
  return (
    <ul className="space-y-3">
      {wishes.map((w) => (
        <li key={w.id} className={`card p-4 ${w.is_approved ? "" : "opacity-60"}`}>
          <p className="whitespace-pre-line">{w.message}</p>
          <p className="mt-1 font-semibold">— {w.name} {!w.is_approved && <span className="text-muted">({labels.hidden})</span>}</p>
          <div className="mt-2 flex gap-4">
            <button type="button" disabled={pending} className="tap underline" onClick={() => start(() => setWishApproved(eventId, w.id, !w.is_approved))}>
              {w.is_approved ? labels.hide : labels.show}
            </button>
            <button type="button" disabled={pending} className="tap text-red-800 underline" onClick={() => start(() => deleteWish(eventId, w.id))}>
              {labels.delete}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
