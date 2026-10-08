"use client";

import { useRouter } from "next/navigation";
import { siteConfig, type Lang } from "@/config/site";

function setLangCookie(code: Lang) {
  document.cookie = `${siteConfig.languageCookie}=${code}; path=/; max-age=31536000; samesite=lax`;
}

/** Writes the language cookie and refreshes the server-rendered page. */
export function LanguageSwitcher({
  current,
  label,
  className = "",
}: {
  current: Lang;
  label: string;
  className?: string;
}) {
  const router = useRouter();

  function choose(code: Lang) {
    setLangCookie(code);
    router.refresh();
  }

  return (
    <div role="group" aria-label={label} className={`inline-flex rounded-full border border-current/30 p-0.5 ${className}`}>
      {siteConfig.languages.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => choose(l.code)}
          aria-pressed={current === l.code}
          lang={l.code}
          className={`tap rounded-full px-3 text-base font-medium ${
            current === l.code ? "bg-accent text-on-accent" : "opacity-80 hover:opacity-100"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
