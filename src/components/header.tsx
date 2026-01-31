"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import { HiOutlineSearch, HiOutlineUser, HiOutlineChevronDown } from "react-icons/hi";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useMarketSummary } from "@/hooks/useMarketSummary";
import { LanguageSelector } from "@/components/translation/LanguageSelector";

const links = [
  { label: "Home", target: "home" },
  { label: "Market", target: "market" },
  {label: "Securities", target: "securities" },
  { label: "Services", target: "services" },
  { label: "About us", target: "about-us" },
  { label: "Contact us", target: "contactUs" },
];

type TrendDirection = "up" | "down" | "flat";

interface SecurityAsset {
  pattern: RegExp;
  src: string;
  alt: string;
}

const SECURITY_ASSETS: SecurityAsset[] = [
  { pattern: /RSI|ALSI|index/i, src: "/imgs/shares.svg", alt: "Rwanda Stock Indices" },
  { pattern: /BLR|BRALIRWA/i, src: "/imgs/bralirwa.webp", alt: "Bralirwa Plc" },
  { pattern: /BOK|BK/i, src: "/imgs/BK.png", alt: "BK Group" },
  { pattern: /EQTY|EQUITY/i, src: "/imgs/equity.webp", alt: "Equity Group" },
  { pattern: /MTN|MTNR/i, src: "/imgs/mtn.webp", alt: "MTN Rwanda" },
  { pattern: /KCB/i, src: "/imgs/kcb.webp", alt: "KCB Group" },
  { pattern: /USL|UCHUMI/i, src: "/imgs/shares.svg", alt: "Uchumi Supermarkets" },
  { pattern: /RHB|RHUG/i, src: "/imgs/shares.svg", alt: "Rwanda Housing Bank" },
  { pattern: /CMR|CRYSTAL|COOP/i, src: "/imgs/shares.svg", alt: "Crystal Telecom" },
  { pattern: /IMR|I&M/i, src: "/imgs/shares.svg", alt: "I&M Bank" },
  { pattern: /NMG|NATION/i, src: "/imgs/shares.svg", alt: "Nation Media Group" },
];

const DEFAULT_SECURITY_ASSET = { src: "/imgs/shares.svg", alt: "Rwanda Stock Exchange" };

const resolveSecurityAsset = (security?: string) => {
  if (!security) {
    return DEFAULT_SECURITY_ASSET;
  }
  const match = SECURITY_ASSETS.find((asset) => asset.pattern.test(security));
  if (match) {
    return { src: match.src, alt: match.alt };
  }
  return { ...DEFAULT_SECURITY_ASSET, alt: security };
};

const parseChangeDescriptor = (rawChange?: string): { display: string; trend: TrendDirection } => {
  const change = rawChange?.replace(/\s+/g, " ").trim() ?? "";
  if (!change) {
    return { display: "+0.00", trend: "flat" };
  }
  const numericMatch = change.match(/-?\d+(?:\.\d+)?/);
  const numeric = numericMatch ? Number.parseFloat(numericMatch[0]) : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return { display: change, trend: "flat" };
  }
  if (Math.abs(numeric) < 1e-6) {
    const display = change.startsWith("+") || change.startsWith("-") ? change : `+${change}`;
    return { display, trend: "flat" };
  }
	const display = change.startsWith("+") || change.startsWith("-") ? change : `${numeric > 0 ? "+" : ""}${change}`;
  return { display, trend: numeric > 0 ? "up" : "down" };
};

interface TickerSecurity {
	id: string;
	name: string;
	price: string;
	change: string;
	trend: TrendDirection;
	logo: { src: string; alt: string };
}

export default function Header() {
  const [isPaused, setIsPaused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, dashboardPath, loading } = useAuth();
  const { data: marketSummary, loading: marketLoading, error: marketError } = useMarketSummary();
  const tickerWrapperRef = useRef<HTMLDivElement>(null);
  const tickerTrackRef = useRef<HTMLDivElement>(null);

  const primaryCtaHref = "/auth/login";
  const primaryCtaLabel = "Sign in";
  const showPrimaryCta = !loading || isAuthenticated;

  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [tickerDuration, setTickerDuration] = useState<number>(35);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);

  const securities = useMemo<TickerSecurity[]>(() => {
    return (marketSummary?.dailySnapshot ?? []).map((row, index) => {
      const { display, trend } = parseChangeDescriptor(row.change);
      const logo = resolveSecurityAsset(row.security);
      return {
        id: `security-${index}-${row.security ?? index}`,
        name: row.security || "—",
        price: row.closing || "N/A",
        change: display,
        trend,
        logo,
      };
    });
  }, [marketSummary?.dailySnapshot]);

  const loopedSecurities = useMemo(() => {
    if (securities.length > 1) {
      return [...securities, ...securities];
    }
    return securities;
  }, [securities]);

  const statusInfo = marketSummary?.marketStatus;
  const isTickerLoading = marketLoading && securities.length === 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const recalculateTickerSpeed = useCallback(() => {
    const wrapper = tickerWrapperRef.current;
    const track = tickerTrackRef.current;
    if (!wrapper || !track) {
      return;
    }

    const wrapperWidth = wrapper.offsetWidth;
    const trackWidth = track.scrollWidth;

    if (!trackWidth || trackWidth <= wrapperWidth + 16) {
      setShouldAnimate(false);
      return;
    }

    const pixelsPerSecond = 40; // tweak to control baseline speed
    const duration = Math.max(25, Math.min(90, trackWidth / pixelsPerSecond));
    setTickerDuration(duration);
    setShouldAnimate(true);
  }, []);

  useEffect(() => {
    if (!loopedSecurities.length) {
      setShouldAnimate(false);
      return;
    }

    const handle = () => recalculateTickerSpeed();
    const raf = requestAnimationFrame(handle);
    window.addEventListener("resize", handle);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handle);
    };
  }, [loopedSecurities, recalculateTickerSpeed]);

  const handleScrollTo = (target: string) => {
    const section = document.getElementById(target);
    if (section) {
      const yOffset = -80;
      const y = section.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      const allElements = document.querySelectorAll('[id]');
    }
  };

  return (
    <>
      <header className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-20 relative">
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/logo.svg"
                alt="logo"
                width={130}
                height={40}
                className="w-24"
                priority
              />
            </Link>
          </div>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm">
            {links.map(({ label, target }) => (
              <button
                key={target}
                onClick={() => handleScrollTo(target)}
                className="text-gray-700 hover:text-[#006b7d] transition font-medium"
              >
                {label}
              </button>
            ))}
          </nav>

          {/* RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search */}
            <div ref={searchContainerRef} className="relative">
              <form className="flex items-center border border-gray-300 rounded-full px-3 py-1 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#006b7d]">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className="text-gray-600 hover:text-[#006b7d] transition"
                >
                  <HiOutlineSearch className="h-5 w-5" />
                </button>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search..."
                  className={`absolute right-0 top-0 h-full bg-white border border-gray-300 rounded-full pl-10 pr-3 outline-none transition-all duration-300 ${
                    isSearchOpen
                      ? "opacity-100 w-40 sm:w-56 shadow-lg"
                      : "opacity-0 w-0 pointer-events-none"
                  }`}
                />
              </form>
            </div>

            {/* Language Selector */}
            <LanguageSelector />

            {/* Sign In */}
            {showPrimaryCta && (
                <Link
                className="hidden sm:flex bg-linear-to-r from-[#2d94b0] to-[#004f64] transition text-white px-4 sm:px-5 py-2 rounded-full font-medium text-sm items-center gap-2 shadow cursor-pointer"
                href={primaryCtaHref}
                >
                {primaryCtaLabel === "Sign in" && <HiOutlineUser className="h-4 w-4" />}
                {primaryCtaLabel}
                </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8"
            >
              <span
                className={`h-0.5 w-6 bg-gray-800 transition-transform ${
                  isMenuOpen ? "rotate-45 translate-y-1.5" : ""
                }`}
              />
              <span
                className={`h-0.5 w-6 bg-gray-800 my-1 ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 w-6 bg-gray-800 transition-transform ${
                  isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                }`}
              />
            </button>
          </div>

          {/* MOBILE MENU */}
          {isMenuOpen && (
            <div className="absolute top-20 left-0 w-full bg-white border-t border-gray-200 flex flex-col items-center py-4 space-y-4 shadow-md md:hidden">
              {links.map(({ label, target }) => (
                <button
                  key={target}
                  onClick={() => {
                    handleScrollTo(target);
                    setIsMenuOpen(false);
                  }}
                  className="text-gray-700 hover:text-[#006b7d] font-medium"
                >
                  {label}
                </button>
              ))}
              <Link
                href={primaryCtaHref}
                className="bg-linear-to-r from-[#2d94b0] to-[#004f64] text-white px-5 py-2 rounded-full hover:bg-[#005566] transition font-medium text-sm"
              >
                {primaryCtaLabel}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* STOCK SCROLL BAR */}
      <div className="bg-[#01667D] py-2 mt-20 fixed w-full z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="uppercase tracking-wide text-xs font-semibold bg-[#009e3d] text-white px-3 py-1">
              Equities
            </div>

            <div
              ref={tickerWrapperRef}
              className="flex-1 overflow-hidden"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div
                ref={tickerTrackRef}
                className={`ticker-track text-xs font-medium text-white ${
                  shouldAnimate ? "animate-scroll" : ""
                }`}
                style={{
                  animationDuration: `${tickerDuration}s`,
                  animationPlayState: isPaused ? "paused" : "running",
                }}
              >
                {isTickerLoading && (
                  <div className="shrink-0 mx-4 text-white">
                    Loading live market data...
                  </div>
                )}

                {!isTickerLoading && !!loopedSecurities.length &&
                  loopedSecurities.map((item, index) => {
                    const arrow =
                      item.trend === "up" ? "▲" : item.trend === "down" ? "▼" : "—";
                    const changeClass =
                      item.trend === "up"
                        ? "text-green-600"
                        : item.trend === "down"
                          ? "text-red-500"
                          : "text-gray-600";

                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className="shrink-0 flex items-center gap-3 bg-[#01667D] text-white px-3 py-1 min-h-[38px] min-w-[220px]"
                      >
                        <Image
                          src={item.logo.src}
                          alt={item.logo.alt}
                          width={48}
                          height={24}
                          className="h-6 w-12 object-contain"
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white sm:text-sm font-semibold uppercase tracking-wide">
                            {item.name}
                          </span>
                          <span className="text-xs sm:text-sm text-white">
                            {item.price} Rwf
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs text-white sm:text-sm font-semibold ${changeClass}`}
                          >
                            <span className="leading-none">{arrow}</span>
                            <span>{item.change}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {!isTickerLoading && !loopedSecurities.length && (
                  <div className="shrink-0 mx-4 text-gray-600">
                    {marketError
                      ? "Live market data is unavailable right now."
                      : "No market trades recorded today."}
                  </div>
                )}
              </div>
            </div>

            {statusInfo && (
              <div
                className={`uppercase tracking-wide text-xs font-semibold px-3 py-1 ${
                  statusInfo.isOpen
                    ? "bg-[#009e3d]"
                    : statusInfo.normalized === "suspended"
                      ? "bg-amber-500"
                      : "bg-[#f11616]"
                } text-white`}
              >
                {statusInfo.isOpen ? "● MARKET OPEN" : "● MARKET CLOSED"}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-track {
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          white-space: nowrap;
          will-change: transform;
        }
        .animate-scroll {
          animation: scroll linear infinite;
        }
      `}</style>
    </>
  );
}
