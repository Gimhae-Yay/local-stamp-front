import type { ReactNode } from "react";

export type ConsoleNavIconName =
  | "home"
  | "content"
  | "calendar"
  | "checkin"
  | "coupon"
  | "mission"
  | "stampbook"
  | "users"
  | "region"
  | "payment"
  | "refund"
  | "manual-refund"
  | "admin"
  | "revision"
  | "withdrawal";

const paths: Record<ConsoleNavIconName, ReactNode> = {
  home: (
    <>
      <path d="m3.5 9 6.5-5.5L16.5 9" />
      <path d="M5.5 8.5v8h9v-8M8.5 16.5v-5h3v5" />
    </>
  ),
  content: (
    <>
      <path d="M5 4.5h10a1.5 1.5 0 0 1 1.5 1.5v11.5H6.5A1.5 1.5 0 0 1 5 16V4.5Z" />
      <path d="M8 8h5.5M8 11h5.5M8 14h3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="13" height="12" rx="2" />
      <path d="M6.5 3.5v3M13.5 3.5v3M3.5 8.5h13M7 11.5h2M11 11.5h2M7 14.5h2" />
    </>
  ),
  checkin: (
    <>
      <path d="M6 3.5H4.5a1 1 0 0 0-1 1V6M14 3.5h1.5a1 1 0 0 1 1 1V6M6 16.5H4.5a1 1 0 0 1-1-1V14M14 16.5h1.5a1 1 0 0 0 1-1V14" />
      <path d="m7 10 2 2 4-4" />
    </>
  ),
  coupon: (
    <>
      <path d="M3.5 7.5A2.5 2.5 0 0 0 6 10a2.5 2.5 0 0 0-2.5 2.5V15a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-2.5A2.5 2.5 0 0 0 14 10a2.5 2.5 0 0 0 2.5-2.5V5A1.5 1.5 0 0 0 15 3.5H5A1.5 1.5 0 0 0 3.5 5v2.5Z" />
      <path d="M10 6.5v1M10 9.5v1M10 12.5v1" />
    </>
  ),
  mission: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="3" />
      <path d="m12.5 7.5 3.5-3.5M13.5 4h2.5v2.5" />
    </>
  ),
  stampbook: (
    <>
      <path d="M4 4.5h9.5A2.5 2.5 0 0 1 16 7v9.5H6.5A2.5 2.5 0 0 1 4 14V4.5Z" />
      <path d="M6.5 16.5A2.5 2.5 0 0 1 9 14h7M8 8h4M8 11h3" />
    </>
  ),
  users: (
    <>
      <circle cx="8" cy="7" r="3" />
      <path d="M3.5 16c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5M12.5 5.5a2.5 2.5 0 0 1 0 4.8M13.5 12c1.8.5 2.8 1.8 3 4" />
    </>
  ),
  region: (
    <>
      <path d="M15.5 8.5c0 4.1-5.5 8-5.5 8s-5.5-3.9-5.5-8a5.5 5.5 0 1 1 11 0Z" />
      <circle cx="10" cy="8.5" r="2" />
    </>
  ),
  payment: (
    <>
      <rect x="3" y="5" width="14" height="10" rx="2" />
      <path d="M3 8.5h14M6 12h3" />
    </>
  ),
  refund: (
    <>
      <path d="M5.5 6.5H13a3.5 3.5 0 0 1 0 7H7" />
      <path d="m7.5 3.5-3 3 3 3M7 13.5l1.5 1.5L7 16.5" />
    </>
  ),
  "manual-refund": <path d="M10.5 3.5 5 11h4l-.5 5.5L15 8.5h-4.5V3.5Z" />,
  admin: (
    <>
      <circle cx="10" cy="7" r="3" />
      <path d="M4.5 16c.5-3.1 2.3-4.6 5.5-4.6s5 1.5 5.5 4.6" />
      <path d="m14.3 5.7.9.9 1.8-1.8" />
    </>
  ),
  revision: (
    <>
      <path d="M5 4.5h8l2.5 2.5v9.5H5v-12Z" />
      <path d="M13 4.5V7h2.5M7.5 10h5M7.5 13h3" />
    </>
  ),
  withdrawal: (
    <>
      <path d="M5.5 6.5H13a3.5 3.5 0 0 1 0 7H7" />
      <path d="m7.5 3.5-3 3 3 3" />
    </>
  ),
};

export function ConsoleNavIcon({ name }: { name: ConsoleNavIconName }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}
