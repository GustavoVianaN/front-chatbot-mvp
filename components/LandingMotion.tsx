'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

export function StickyLandingHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`landing-navbar sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-200 ${scrolled ? 'border-[#E4E7EC] bg-white/95 shadow-[0_1px_8px_rgba(16,24,40,.04)] backdrop-blur-sm' : 'border-transparent bg-white'}`}>
      {children}
    </header>
  );
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { threshold: 0.18 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} data-visible={visible} className={`landing-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
