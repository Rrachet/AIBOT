'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';

/**
 * Public site navigation.
 *
 * Deliberately unlike the application sidebar: this is a website header, and
 * the two experiences should not be mistaken for each other. What they share
 * is the brand mark, the type and the orange.
 */

const LINKS = [
  { href: '/', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // The header gains a border only once the page has moved, so the hero meets
  // it cleanly at rest.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="site-shell site-header-inner">
        <Link className="site-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            AI
          </span>
          <span className="site-brand-name">AIBOT</span>
        </Link>

        <nav className="site-nav" aria-label="Site">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'is-current' : undefined}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-header-actions">
          <Link className="site-link" href="/login">
            Sign in
          </Link>
          <Link className="primary-button" href="/signup">
            Start free
          </Link>
        </div>

        <button
          type="button"
          className="icon-button site-menu-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'close' : 'menu'} size={18} />
        </button>
      </div>

      {open ? (
        <div className="site-mobile-nav">
          <nav aria-label="Site">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link href="/login">Sign in</Link>
          </nav>
          <Link className="primary-button" href="/signup">
            Start free
          </Link>
        </div>
      ) : null}
    </header>
  );
}
