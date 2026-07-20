type NotZeroMarkProps = {
  className?: string;
  title?: string;
};

/**
 * The NotZero mark is a grounded lowercase n drawn as a bridge. Most of the
 * span uses the primary brand color; one short keystone uses the bridge accent.
 * The idea is deliberately simple: the existing foundation already carries
 * almost the whole crossing, and NotZero identifies the small connection that
 * completes it. The monochrome application icon joins the same geometry into
 * one continuous, favicon-safe form.
 */
export function NotZeroMark({ className, title }: NotZeroMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M5.5 27 V16 C5.5 9.4 10.2 5.5 14.6 5.5 M17.4 5.5 C21.8 5.5 26.5 9.4 26.5 16 V27"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 5.5 H17.8"
        fill="none"
        stroke="var(--bridge-amber, currentColor)"
        strokeWidth="5.5"
        strokeLinecap="butt"
      />
    </svg>
  );
}
