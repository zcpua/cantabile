import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
        {description ? <p className="mt-3 leading-7 text-muted">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link className="text-sm font-semibold text-burgundy underline-offset-4 hover:underline" href={href}>
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
