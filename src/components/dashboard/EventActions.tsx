"use client";

import { useTransition } from "react";
import { deleteEvent, setPublished } from "@/app/dashboard/actions";

export function EventActions({
  eventId,
  published,
  labels,
}: {
  eventId: string;
  published: boolean;
  labels: { publish: string; unpublish: string; delete: string; deleteConfirm: string };
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} className="btn-outline" onClick={() => start(() => setPublished(eventId, !published))}>
        {published ? labels.unpublish : labels.publish}
      </button>
      <button
        type="button"
        disabled={pending}
        className="tap rounded-full border-2 border-red-800 px-5 font-semibold text-red-800"
        onClick={() => {
          if (window.confirm(labels.deleteConfirm)) start(() => deleteEvent(eventId));
        }}
      >
        {labels.delete}
      </button>
    </div>
  );
}
