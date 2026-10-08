import type { ReactNode } from "react";

/** Standard section wrapper: consistent spacing, optional alternate background. */
export function Section({
  id,
  title,
  alt = false,
  children,
}: {
  id?: string;
  title?: string;
  alt?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`px-4 py-12 ${alt ? "bg-alt" : ""}`} aria-labelledby={id && title ? `${id}-title` : undefined}>
      <div className="mx-auto w-full max-w-xl">
        {title && (
          <h2 id={id ? `${id}-title` : undefined} className="sec-title mb-6">
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}
