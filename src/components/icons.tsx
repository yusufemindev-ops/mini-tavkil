import type { SVGProps } from 'react';
import {
  Award,
  Check,
  Container,
  Cpu,
  Factory,
  Lightbulb,
  Lock,
  MapPin,
  Package,
  PackageOpen,
  Ship,
  Shirt,
  Sofa,
  Star,
} from 'lucide-react';

/*
 * The icon set, vendored from Tavkil's `packages/icons` (this repo is not a
 * monorepo).
 *
 * Two changes from the original. First, every icon lucide-react already ships is
 * an alias onto lucide rather than a hand-drawn SVG — hand-written SVG is a rule
 * violation here (CLAUDE.md "Never do"), and lucide's are better-hinted anyway.
 * Second, the four social marks below stay as inline SVG because lucide-react
 * dropped brand icons: `Instagram`, `Facebook`, `TikTok`, and `WhatsApp` are not
 * exported by any version we can install, and a brand mark cannot be substituted
 * with a generic glyph. They are the only inline SVGs in the codebase.
 *
 * Aliases keep the Tavkil names so ported components need no edits.
 */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/* —— Category / trust icons — lucide under the Tavkil names —— */
export const IndustrialIcon = Factory;
export const LightingIcon = Lightbulb;
export const TextilesIcon = Shirt;
export const ElectronicsIcon = Cpu;
export const HomeGoodsIcon = Sofa;
export const PackagingIcon = Package;
export const MapPinIcon = MapPin;
export const StarIcon = Star;
export const AwardIcon = Award;
export const LockIcon = Lock;
export const CheckIcon = Check;
export const PackageIcon = Package;
export const PackageOpenIcon = PackageOpen;
export const ContainerIcon = Container;
export const ShipIcon = Ship;

/* —— Brand marks — no lucide equivalent exists —— */

export function InstagramIcon({ size = 24, ...props }: IconProps) {
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
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
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

export function FacebookIcon({ size = 24, ...props }: IconProps) {
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
      <path d="M17 2h-3a4.5 4.5 0 0 0-4.5 4.5V10H7v4h2.5v8h4v-8H17l.6-4h-4.1V6.5a1 1 0 0 1 1-1H17z" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.043zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

// Registry of every named icon, for the category-icon lookup.
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
