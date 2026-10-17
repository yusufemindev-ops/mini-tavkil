import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr', 'ar'],
  defaultLocale: 'en',
  /**
   * `Secure` on the locale cookie.
   *
   * next-intl writes NEXT_LOCALE without it, so the cookie was legal to send over
   * plain HTTP. HSTS already makes that nearly impossible here, but "nearly" is
   * doing work: the preload list only protects browsers that have seen the header
   * or ship the domain preloaded, and a first visit on a hostile network is
   * exactly the case HSTS cannot cover. It carries no secret — it is a language
   * preference — so this is defence in depth rather than a fix, and it costs
   * nothing.
   */
  localeCookie: { secure: true, sameSite: 'lax' },
});
