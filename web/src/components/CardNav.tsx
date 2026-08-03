import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { GoArrowUpRight } from 'react-icons/go';
import './CardNav.css';

export type CardNavLink = {
  label: string;
  href?: string;
  ariaLabel?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  badge?: string;
};

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links?: CardNavLink[];
};

export type QuickNavLink = {
  label: string;
  onClick: () => void;
  active?: boolean;
  icon?: React.ReactNode;
};

export type CardNavProps = {
  logo?: string;
  logoAlt?: string;
  brandTitle?: string;
  items?: CardNavItem[];
  quickLinks?: QuickNavLink[];
  rightContent?: React.ReactNode;
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  onLogoClick?: () => void;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const CardNav: React.FC<CardNavProps> = ({
  logo,
  logoAlt = 'Logo',
  brandTitle,
  items = [],
  quickLinks = [],
  rightContent,
  className = '',
  ease = 'power3.out',
  baseColor = '#FFFFFF',
  menuColor = '#0E0E0E',
  buttonBgColor = '#C9FE6E',
  buttonTextColor = '#0E0E0E',
  ctaText = 'Get Started',
  onCtaClick,
  onLogoClick
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = (): number => {
    const navEl = navRef.current;
    if (!navEl) return 280;

    const contentEl = navEl.querySelector('.card-nav-content') as HTMLElement | null;
    if (contentEl) {
      const wasVisible = contentEl.style.visibility;
      const wasPointerEvents = contentEl.style.pointerEvents;
      const wasPosition = contentEl.style.position;

      contentEl.style.visibility = 'visible';
      contentEl.style.pointerEvents = 'auto';
      contentEl.style.position = 'static';

      // Force reflow
      void contentEl.offsetHeight;

      const topBar = 64;
      const padding = 16;
      const contentHeight = contentEl.scrollHeight;

      contentEl.style.visibility = wasVisible;
      contentEl.style.pointerEvents = wasPointerEvents;
      contentEl.style.position = wasPosition;

      return topBar + contentHeight + padding;
    }
    return 280;
  };

  const createTimeline = (): gsap.core.Timeline | null => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 64, overflow: 'visible' });
    const validCards = cardsRef.current.filter(Boolean);
    gsap.set(validCards, { y: 30, opacity: 0 });

    const tl = gsap.timeline({
      paused: true,
      onStart: () => {
        gsap.set(navEl, { overflow: 'hidden' });
      },
      onComplete: () => {
        gsap.set(navEl, { overflow: 'visible' });
      },
      onReverseStart: () => {
        gsap.set(navEl, { overflow: 'hidden' });
      },
      onReverseComplete: () => {
        gsap.set(navEl, { overflow: 'visible' });
      }
    });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.35,
      ease
    });

    tl.to(validCards, { y: 0, opacity: 1, duration: 0.3, ease, stagger: 0.05 }, '-=0.15');

    return tl;
  };

  useIsomorphicLayoutEffect(() => {
    cardsRef.current = [];
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items]);

  useIsomorphicLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const closeMenu = () => {
    setIsHamburgerOpen(false);
    setIsExpanded(false);
    const tl = tlRef.current;
    if (!tl) return;
    tl.eventCallback('onReverseComplete', () => {
      if (navRef.current) gsap.set(navRef.current, { overflow: 'visible' });
      tl.eventCallback('onReverseComplete', null);
    });
    tl.reverse();
  };

  const openMenu = () => {
    setIsHamburgerOpen(true);
    setIsExpanded(true);
    const tl = tlRef.current;
    if (!tl) return;
    tl.eventCallback('onReverseComplete', null);
    tl.play(0);
  };

  const toggleMenu = () => {
    if (isExpanded || isHamburgerOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleLinkClick = (lnk: CardNavLink, e: React.MouseEvent) => {
    closeMenu();
    if (lnk.onClick) {
      e.preventDefault();
      lnk.onClick();
    } else if (lnk.href?.startsWith('#')) {
      e.preventDefault();
      const targetEl = document.querySelector(lnk.href);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogoClick = () => {
    closeMenu();
    if (onLogoClick) {
      onLogoClick();
    } else {
      window.location.href = '/';
    }
  };

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el;
  };

  const handleMouseEnter = () => {
    // Menu opens ONLY when clicking the hamburger icon
  };

  const handleMouseLeave = () => {
    if (isExpanded || isHamburgerOpen) {
      closeMenu();
    }
  };

  return (
    <div
      className={`card-nav-container ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor }}>
        <div className="card-nav-top">
          {/* Left section: Hamburger + Logo */}
          <div className="card-nav-left">
            <button
              type="button"
              className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
              onClick={toggleMenu}
              aria-label={isExpanded ? 'Close menu' : 'Open menu'}
              aria-expanded={isExpanded}
              style={{ color: menuColor || '#0E0E0E' }}
            >
              <div className="hamburger-line" />
              <div className="hamburger-line" />
            </button>

            <div
              className="logo-container"
              onClick={handleLogoClick}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLogoClick();
                }
              }}
              aria-label={logoAlt}
            >
              {logo && <img src={logo} alt={logoAlt} className="logo" />}
              {brandTitle && <span className="logo-title">{brandTitle}</span>}
            </div>
          </div>

          {/* Middle section: Desktop Quick Nav Links */}
          {quickLinks.length > 0 && (
            <div className="card-nav-quick-links">
              {quickLinks.map((ql, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    closeMenu();
                    ql.onClick();
                  }}
                  className={`quick-nav-pill ${ql.active ? 'active' : ''}`}
                >
                  {ql.icon && <span className="quick-nav-icon">{ql.icon}</span>}
                  <span>{ql.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Right section: Right controls or CTA */}
          <div className="card-nav-right">
            {rightContent ? (
              rightContent
            ) : (
              <button
                type="button"
                className="card-nav-cta-button"
                onClick={() => {
                  closeMenu();
                  if (onCtaClick) onCtaClick();
                }}
                style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
              >
                {ctaText}
              </button>
            )}
          </div>
        </div>

        {/* Mega-Menu Cards Container (The 3 Nav Cards Dropdown) */}
        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-header">
                <span className="nav-card-label">{item.label}</span>
                <span className="nav-card-badge">0{idx + 1}</span>
              </div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <a
                    key={`${lnk.label}-${i}`}
                    className="nav-card-link"
                    href={lnk.href || '#'}
                    onClick={(e) => handleLinkClick(lnk, e)}
                    aria-label={lnk.ariaLabel || lnk.label}
                  >
                    {lnk.icon && <span className="link-custom-icon">{lnk.icon}</span>}
                    <span className="link-label-text">{lnk.label}</span>
                    {lnk.badge && <span className="link-badge">{lnk.badge}</span>}
                    {GoArrowUpRight ? (
                      <GoArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                    ) : (
                      <svg className="nav-card-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
