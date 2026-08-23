import { Link } from "react-router";

export function StrainSectionHeader({
  title,
  seeMoreHref,
}: {
  title: string;
  seeMoreHref?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[1.375rem] font-medium leading-tight tracking-tight sm:text-[1.5rem]">
        {title}
      </h2>
      {seeMoreHref && (
        <Link
          to={seeMoreHref}
          className="shrink-0 text-[13px] font-semibold text-primary hover:text-primary/80"
        >
          See more
        </Link>
      )}
    </div>
  );
}
