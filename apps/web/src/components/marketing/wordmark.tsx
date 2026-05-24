import { BRAND } from "./brand";

/**
 * The leashd wordmark: lowercase mono brand + a static green terminal cursor
 * block, the project's signature mark. The block is as tall as the letters and
 * sits flush on the baseline.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-mono font-bold lowercase tracking-tight text-foreground ${className ?? ""}`}
    >
      {BRAND}
      <span
        aria-hidden
        className="ml-[0.1em] inline-block h-[0.72em] w-[0.42em] bg-primary"
      />
    </span>
  );
}
