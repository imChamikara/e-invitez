"use client";

import { useState } from "react";
import { whatsappShareUrl } from "@/lib/event-utils";

export function ShareButtons({
  url,
  text,
  labels,
}: {
  url: string;
  text: string;
  labels: { whatsapp: string; copy: string; copied: string };
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: select-and-copy fallback.
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <a href={whatsappShareUrl(`${text} ${url}`)} target="_blank" rel="noopener noreferrer" className="btn-accent">
        {labels.whatsapp}
      </a>
      <button type="button" onClick={copy} className="btn-outline" aria-live="polite">
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
