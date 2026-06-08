import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  narrow = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <main className="flex-1">
      <div className={`mx-auto w-full px-5 py-12 sm:px-8 sm:py-16 ${narrow ? "max-w-4xl" : "max-w-7xl"}`}>
        <header className="mb-10 max-w-3xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
          {description ? <p className="mt-5 text-lg leading-8 text-muted">{description}</p> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
