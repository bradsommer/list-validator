/**
 * FreshSegments logo — SVG recreation of the brand mark.
 *
 * The logo consists of three stacked horizontal bars (teal gradient,
 * decreasing widths) followed by the wordmark "FreshSegments".
 *
 * Usage:
 *   <FreshSegmentsLogo />                   – default size (auto)
 *   <FreshSegmentsLogo className="h-8" />   – constrain height
 *   <FreshSegmentsLogo iconOnly />           – icon without text
 */

interface FreshSegmentsLogoProps {
  className?: string;
  iconOnly?: boolean;
  /** When true, renders text in white (for dark backgrounds) */
  dark?: boolean;
}

export function FreshSegmentsLogo({ className = '', iconOnly = false, dark = false }: FreshSegmentsLogoProps) {
  if (iconOnly) {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="FreshSegments"
      >
        {/* Three horizontal bars — stacked, decreasing width */}
        <rect x="4" y="8" width="32" height="6" rx="3" fill="#0D9488" />
        <rect x="4" y="17" width="24" height="6" rx="3" fill="#14B8A6" />
        <rect x="4" y="26" width="16" height="6" rx="3" fill="#5EEAD4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 260 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FreshSegments"
    >
      {/* Icon: three horizontal bars */}
      <rect x="4" y="8" width="32" height="6" rx="3" fill="#0D9488" />
      <rect x="4" y="17" width="24" height="6" rx="3" fill="#14B8A6" />
      <rect x="4" y="26" width="16" height="6" rx="3" fill="#5EEAD4" />

      {/* Wordmark */}
      <text
        x="44"
        y="28"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="20"
        fill={dark ? '#FFFFFF' : '#111827'}
      >
        FreshSegments
      </text>
    </svg>
  );
}
