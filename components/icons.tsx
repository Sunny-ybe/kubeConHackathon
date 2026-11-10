// Hand-drawn 24px line icons, 1.75px stroke, currentColor. Decorative: pair them with text or aria-label.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.1l1.4-2h6l1.4 2h2.1A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);

export const SpeakerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
    <path d="M18 6.5a7.8 7.8 0 0 1 0 11" />
  </Svg>
);

export const StopIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
  </Svg>
);

export const TranslateIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6h9M8 4v2m2.6 0c-.8 3.6-3.2 6.6-6.6 8.2" />
    <path d="M5.6 9.4c1 1.8 2.6 3.3 4.6 4.3" />
    <path d="m12.5 20 3.75-9 3.75 9m-6.4-2.6h5.3" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const ShareIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 14.5V4m0 0L8.5 7.5M12 4l3.5 3.5" />
    <path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const ImageIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m4.5 17 4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.25" />
    <path d="m20 20-4.5-4.5" />
  </Svg>
);

export const StackIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="8" width="16" height="11" rx="2" />
    <path d="M7 5h10" />
  </Svg>
);

export const BroadcastIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="1.75" />
    <path d="M8.5 15.5a5 5 0 0 1 0-7m7 0a5 5 0 0 1 0 7" />
    <path d="M5.6 18.4a9 9 0 0 1 0-12.8m12.8 0a9 9 0 0 1 0 12.8" />
  </Svg>
);

export const QrIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM20 14v1M14 20h1" />
  </Svg>
);

export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="9" r="3.25" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M15.5 6.2a3.25 3.25 0 0 1 0 5.6M17.5 14.2A5.5 5.5 0 0 1 20.5 19" />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Svg>
);

export const ExpandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 9.5v-5h5M19.5 9.5v-5h-5M4.5 14.5v5h5M19.5 14.5v5h-5" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M12 8v4.5M12 16h.01" />
  </Svg>
);

export const DiagramIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="6" height="5" rx="1" />
    <rect x="14.5" y="4" width="6" height="5" rx="1" />
    <rect x="9" y="15" width="6" height="5" rx="1" />
    <path d="M6.5 9v2.5h11V9M12 11.5V15" />
  </Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v10.5m0 0L8 10.5m4 4 4-4" />
    <path d="M5 15.5v2A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </Svg>
);

/** Filled play triangle with soft corners, for video badges. */
export const PlayIcon = ({ size = 20, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
    <path
      d="M8 5.9v12.2a1 1 0 0 0 1.5.86l9.7-6.1a1 1 0 0 0 0-1.72L9.5 5.04A1 1 0 0 0 8 5.9z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export const IdCardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 15.5a3 3 0 0 1 6 0M14.5 10h3M14.5 13.5h3" />
  </Svg>
);

/** The Backrow mark: a slide frame seen from the back row, with the accent "record" dot. */
export function BackrowMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.75" y="4.75" width="18.5" height="12" rx="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 20.25h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="17.25" cy="8.75" r="1.75" className="fill-accent" />
    </svg>
  );
}
