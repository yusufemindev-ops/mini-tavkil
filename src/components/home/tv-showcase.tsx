'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { Thumb } from '@/components/catalog/thumb';
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion';
import styles from './tv-showcase.module.css';

/**
 * Hero showcase: a "TV set" that channel-hops through the catalogue's categories,
 * with a CRT switch animation and an ambient glow.
 *
 * Tavkil's version had a second set showing a rotating *premium supplier*.
 * Suppliers never appear on a public surface here (CLAUDE.md §1), so that channel
 * is gone — which is also why the remaining set now fills the stage instead of
 * being one of two overlapping cards.
 *
 * Each channel shows a real image from the category (its own, or its first
 * product's). No picsum: the brand gradient is the fallback.
 */
export type ShowcaseChannel = {
  slug: string;
  name: string;
  imageUrl: string | null;
};

/** The second set's content: a featured product, where Tavkil showed a supplier. */
export type ShowcaseFeature = {
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
};

const ROTATE_MS = 4400;

export function TvShowcase({
  channels,
  features = [],
}: {
  channels: ShowcaseChannel[];
  features?: ShowcaseFeature[];
}) {
  const t = useTranslations('store');
  const total = channels.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  const catInner = useRef<HTMLDivElement>(null);
  const catStatic = useRef<HTMLDivElement>(null);
  const supInner = useRef<HTMLDivElement>(null);
  const supStatic = useRef<HTMLDivElement>(null);
  const ambient = useRef<HTMLDivElement>(null);

  // CRT switch + ambient flash whenever the channel changes.
  useEffect(() => {
    const pulse = (node: HTMLDivElement | null, noise: HTMLDivElement | null) => {
      if (!node || !noise) return;
      node.classList.remove(styles.switching);
      noise.classList.remove(styles.on);
      void node.offsetWidth; // force reflow so the animation restarts
      node.classList.add(styles.switching);
      noise.classList.add(styles.on);
    };
    pulse(catInner.current, catStatic.current);
    pulse(supInner.current, supStatic.current);

    const amb = ambient.current;
    if (amb) {
      amb.style.filter = `blur(52px) hue-rotate(${(index - 2) * 9}deg)`;
      amb.classList.remove(styles.flash);
      void amb.offsetWidth;
      amb.classList.add(styles.flash);
    }
  }, [index]);

  // Auto-rotate; pauses on hover, on focus within, and under reduced motion.
  useEffect(() => {
    if (reduced || paused || total < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % total), ROTATE_MS);
    return () => clearInterval(id);
  }, [index, paused, reduced, total]);

  if (total === 0) return null;

  const go = (i: number) => setIndex(((i % total) + total) % total);
  const channel = channels[index];
  const feature = features.length > 0 ? features[index % features.length] : null;
  const channelNo = String(index + 1).padStart(2, '0');
  const channelTotal = String(total).padStart(2, '0');

  return (
    <div
      className={styles.showcase}
      aria-roledescription="carousel"
      aria-label={t('sc_category')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Keyboard users get the same courtesy as mouse users: rotation stops
      // while focus is inside, so the link under the cursor can't change.
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className={styles.stage}>
        <div ref={ambient} className={styles.ambient} />

        <article className={`${styles.tv} ${styles.scCat}`}>
          <div className={styles.tvScreen}>
            <div ref={catStatic} className={styles.tvStatic} />
            <div ref={catInner} className={styles.tvInner}>
              <Thumb src={channel.imageUrl} className="absolute inset-0 size-full" priority />
              <div className={styles.tvOsd}>
                <span className={styles.tvCh}>
                  CH {channelNo}/{channelTotal}
                </span>
                <span className={styles.tvLive}>
                  <span className={styles.dot} />
                  {t('sc_category')}
                </span>
              </div>
              <div className={styles.tvCap}>
                <span className={styles.k}>
                  {t('sc_category')} {channelNo}
                </span>
                <h2>{channel.name}</h2>
              </div>
            </div>
          </div>
          <div className={styles.tvFoot}>
            <span className={styles.tvBrand}>TAVKIL&nbsp;TV</span>
            <div className={styles.tvCtrl}>
              <span className={styles.tvKnob} />
              <span className={styles.tvKnob} />
              <span className={styles.tvPwr} />
            </div>
          </div>
        </article>

        {/* Second set. Tavkil's showed a premium supplier — name, city, country —
            which is admin-only here (CLAUDE.md §1). A featured product carries no
            price and no supplier, so it fills the same frame safely. */}
        {feature && (
          <article className={`${styles.tv} ${styles.scSup}`}>
            <div className={styles.tvScreen}>
              <div ref={supStatic} className={styles.tvStatic} />
              <div ref={supInner} className={styles.tvInner}>
                <Thumb src={feature.imageUrl} className="absolute inset-0 size-full" />
                <div className={styles.tvOsd}>
                  <span className={styles.tvLive}>
                    <span className={styles.dot} />
                    {t('sc_featured')}
                  </span>
                </div>
                <div className={styles.tvCap}>
                  <span className={styles.k}>{t('sc_featured')}</span>
                  <h3>{feature.name}</h3>
                  {feature.category && <div className={styles.meta}>{feature.category}</div>}
                </div>
              </div>
            </div>
            <div className={styles.tvFoot}>
              <span className={styles.tvBrand}>CH&nbsp;·&nbsp;{t('sc_featured')}</span>
              <div className={styles.tvCtrl}>
                <span className={styles.tvKnob} />
                <span className={styles.tvPwr} />
              </div>
            </div>
          </article>
        )}
      </div>

      {total > 1 && (
        <div className={styles.scNav}>
          <div className={styles.scDots}>
            {channels.map((c, i) => (
              <button
                key={c.slug}
                type="button"
                aria-label={t('sc_go_to', { name: c.name })}
                aria-current={i === index ? 'true' : undefined}
                className={i === index ? styles.on : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <div className={styles.scArrows}>
            <IconButton size="sm" aria-label={t('sc_prev')} onClick={() => go(index - 1)}>
              <ArrowLeft className="rtl:-scale-x-100" />
            </IconButton>
            <IconButton size="sm" aria-label={t('sc_next')} onClick={() => go(index + 1)}>
              <ArrowRight className="rtl:-scale-x-100" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
