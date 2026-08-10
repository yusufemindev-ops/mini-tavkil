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

const ROTATE_MS = 4400;

export function TvShowcase({ channels }: { channels: ShowcaseChannel[] }) {
  const t = useTranslations('store');
  const total = channels.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  const inner = useRef<HTMLDivElement>(null);
  const noise = useRef<HTMLDivElement>(null);
  const ambient = useRef<HTMLDivElement>(null);

  // CRT switch + ambient flash whenever the channel changes.
  useEffect(() => {
    const innerNode = inner.current;
    const noiseNode = noise.current;
    if (innerNode && noiseNode) {
      innerNode.classList.remove(styles.switching);
      noiseNode.classList.remove(styles.on);
      void innerNode.offsetWidth; // force reflow so the animation restarts
      innerNode.classList.add(styles.switching);
      noiseNode.classList.add(styles.on);
    }

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
            <div ref={noise} className={styles.tvStatic} />
            <div ref={inner} className={styles.tvInner}>
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
