import type { ReactNode, SVGProps } from 'react';

// Tavkil custom SVG icon set, shared between the storefront and the admin
// dashboard. Framework- and Tailwind-agnostic: sizing defaults via the `size`
// prop (→ width/height, default 24), and `className` is passed through so each
// app applies its own color (text-*) / size overrides. Icons inherit
// `currentColor`.

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/* —— Category icons (v1–v6) —— */

export function IndustrialIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
    </Icon>
  );
}

export function LightingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </Icon>
  );
}

export function TextilesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 8 12 3 4 8v8l8 5 8-5z" />
      <path d="M4 8l8 5 8-5M12 13v8" />
    </Icon>
  );
}

export function ElectronicsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
    </Icon>
  );
}

export function HomeGoodsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10h18M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M7 15h2" />
    </Icon>
  );
}

export function PackagingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </Icon>
  );
}

/* —— Utility icons —— */

export function MapPinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="10" r="3" />
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" />
    </Icon>
  );
}

export function StarIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden
      {...props}
    >
      <polygon points="12 2 15 9 22 9.2 16.5 13.7 18.5 21 12 16.7 5.5 21 7.5 13.7 2 9.2 9 9" />
    </svg>
  );
}

export function AwardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.5 13.1 17 22l-5-3-5 3 1.5-8.9" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Icon>
  );
}

export function CheckIcon({ strokeWidth, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth ?? 3} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

/* —— Order-request morph icons (empty → open → full → ship) —— */

export function PackageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </Icon>
  );
}

export function PackageOpenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 22v-9" />
      <path d="M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.66 1.66 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z" />
      <path d="M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13" />
      <path d="M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36z" />
    </Icon>
  );
}

export function ContainerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.7 1.7 0 0 0-1.7 0l-10.3 6c-.5.3-.9.9-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.7 1.7 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z" />
      <path d="M10 21.9V14L2.1 9.1" />
      <path d="m10 14 11.9-6.9" />
      <path d="M14 19.8v-8.1" />
      <path d="M18 17.5V9.4" />
    </Icon>
  );
}

export function ShipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
      <path d="M12 10v4" />
      <path d="M12 2v3" />
    </Icon>
  );
}

/* —— Social icons —— */

export function InstagramIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function TikTokIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden
      {...props}
    >
      <path d="M16.5 3c.3 2 1.5 3.6 3.5 4v2.6a6.7 6.7 0 0 1-3.5-1.1v6.1a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.7a2.7 2.7 0 1 0 1.9 2.6V3z" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 2h-3a4.5 4.5 0 0 0-4.5 4.5V10H7v4h2.5v8h4v-8H17l.6-4h-4.1V6.5a1 1 0 0 1 1-1H17z" />
    </Icon>
  );
}

export function WhatsAppIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.043zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

// Registry of every brand icon (e.g. for an icon browser in either app).
export const BRAND_ICONS = {
  Industrial: IndustrialIcon,
  Lighting: LightingIcon,
  Textiles: TextilesIcon,
  Electronics: ElectronicsIcon,
  HomeGoods: HomeGoodsIcon,
  Packaging: PackagingIcon,
  MapPin: MapPinIcon,
  Star: StarIcon,
  Award: AwardIcon,
  Lock: LockIcon,
  Check: CheckIcon,
  Package: PackageIcon,
  PackageOpen: PackageOpenIcon,
  Container: ContainerIcon,
  Ship: ShipIcon,
  WhatsApp: WhatsAppIcon,
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
  Facebook: FacebookIcon,
} as const;
