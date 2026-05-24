import { BRAND } from "./brand";

/**
 * The leashd wordmark: lowercase mono brand + a blinking green terminal cursor
 * block, the project's signature mark. The cursor blink respects
 * prefers-reduced-motion (see globals.css .leashd-cursor).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-mono font-bold lowercase tracking-tight text-foreground ${className ?? ""}`}
    >
      {BRAND}
      <span
        aria-hidden
        className="leashd-cursor ml-[0.12em] inline-block h-[0.95em] w-[0.5em] translate-y-[0.06em] rounded-[2px] bg-primary"
      />
    </span>
  );
}
