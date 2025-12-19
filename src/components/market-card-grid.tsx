"use client";

import Link from "next/link";
import type { JSX } from "react";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiActivity, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { useMarketSummary } from "@/hooks/useMarketSummary";

type SortKey = "change" | "volume" | "value" | "closing";

type Accent = {
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  highlight: string;
};

const ACCENTS: Accent[] = [
  {
    bg: "from-sky-400/10 via-sky-500/5 to-blue-500/10",
    border: "border-sky-500/40",
    badge: "bg-sky-500/15",
    badgeText: "text-sky-500",
    highlight: "text-sky-500",
  },
  {
    bg: "from-emerald-400/10 via-green-500/5 to-emerald-500/10",
    border: "border-emerald-500/40",
    badge: "bg-emerald-500/15",
    badgeText: "text-emerald-500",
    highlight: "text-emerald-500",
  },
  {
    bg: "from-purple-500/10 via-indigo-500/5 to-purple-500/10",
    border: "border-purple-500/40",
    badge: "bg-purple-500/15",
    badgeText: "text-purple-500",
    highlight: "text-purple-400",
  },
  {
    bg: "from-amber-400/10 via-orange-400/5 to-amber-400/10",
    border: "border-amber-500/40",
    badge: "bg-amber-500/15",
    badgeText: "text-amber-500",
    highlight: "text-amber-500",
  },
];

function parseNumeric(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9+\-.]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface Security {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  high: number;
  low: number;
  source: "rse" | "database";
  sector?: string;
}

export function MarketCardGrid(): JSX.Element {
  const { data, loading: marketLoading, error: marketError } = useMarketSummary();
  const [sortKey, setSortKey] = useState<SortKey>("change");
  const [securities, setSecurities] = useState<Security[]>([]);
  const [securitiesLoading, setSecuritiesLoading] = useState(true);

  // Fetch combined securities from API
  useEffect(() => {
    const fetchSecurities = async () => {
      try {
        const response = await fetch("/api/securities");
        if (!response.ok) throw new Error("Failed to fetch securities");
        const result = await response.json();
        setSecurities(result.data || []);
      } catch (err) {
        console.error("Error fetching securities:", err);
      } finally {
        setSecuritiesLoading(false);
      }
    };
    fetchSecurities();
  }, []);

  // Combine market summary data with securities API
  const snapshot = useMemo(() => {
    // If we have securities from API, use them
    if (securities.length > 0) {
      return securities.map((sec) => ({
        security: sec.symbol,
        closing: sec.price.toString(),
        previous: ((sec.price / (1 + sec.change / 100)) || sec.price).toFixed(2),
        change: sec.change >= 0 ? `+${sec.change}%` : `${sec.change}%`,
        volume: sec.volume,
        value: (parseNumeric(sec.volume) * sec.price).toString(),
      }));
    }
    // Otherwise fallback to market summary
    return data?.dailySnapshot ?? [];
  }, [securities, data?.dailySnapshot]);

  const loading = marketLoading || securitiesLoading;
  const error = marketError;

  const enriched = useMemo(() => {
    return snapshot.map((row, idx) => {
      const changeValue = parseNumeric(row.change);
      const closingValue = parseNumeric(row.closing);
      const volumeValue = parseNumeric(row.volume);
      const valueValue = parseNumeric(row.value);
      const positive = changeValue > 0;
      const negative = changeValue < 0;

      return {
        ...row,
        index: idx,
        changeValue,
        closingValue,
        volumeValue,
        valueValue,
        positive,
        negative,
        tone: ACCENTS[idx % ACCENTS.length],
      };
    });
  }, [snapshot]);

  const sortedCards = useMemo(() => {
    const cards = [...enriched];
    cards.sort((a, b) => {
      switch (sortKey) {
        case "volume":
          return b.volumeValue - a.volumeValue;
        case "value":
          return b.valueValue - a.valueValue;
        case "closing":
          return b.closingValue - a.closingValue;
        case "change":
        default:
          return b.changeValue - a.changeValue;
      }
    });
    return cards;
  }, [enriched, sortKey]);

  const hasSnapshot = sortedCards.length > 0;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Enhanced Header */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-12"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 bg-white rounded-3xl shadow-lg border border-slate-200/60 p-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4 flex-1"
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="h-10 w-1 bg-linear-to-b from-[#026379] to-cyan-400 rounded-full origin-top"
              />
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Live Securities
              </h2>
            </div>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              Real-time market data presented in actionable trading cards. Monitor prices, 
              track momentum, and execute trades with a single click.
            </p>
            {data?.snapshotDate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700"
              >
                <FiActivity className="h-4 w-4 animate-pulse" />
                <span className="font-medium">Last updated: {data.snapshotDate}</span>
              </motion.div>
            )}
          </motion.div>

          {/* Enhanced Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Sort by</span>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="bg-transparent border-none text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="change">Change %</option>
                <option value="volume">Volume</option>
                <option value="value">Value</option>
                <option value="closing">Price</option>
              </select>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#004B5B] to-[#026379] px-5 py-3.5 text-sm uppercase text-white tracking-wider shadow-md">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="font-bold">Grid View</span>
            </div>
          </motion.div>
        </div>
      </motion.header>

      {loading && (
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="rounded-3xl border-2 border-slate-200/60 bg-white p-7 min-h-80 shadow-lg"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-3 flex-1">
                  <motion.div
                    animate={{
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="h-6 w-24 bg-slate-200 rounded-full"
                  />
                  <motion.div
                    animate={{
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      delay: 0.2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="h-8 w-40 bg-slate-200 rounded-xl"
                  />
                </div>
                <motion.div
                  animate={{
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="h-16 w-16 bg-slate-200 rounded-2xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="h-20 bg-slate-100 rounded-2xl"
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <motion.div
                  animate={{
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="h-12 flex-1 bg-slate-200 rounded-xl"
                />
                <motion.div
                  animate={{
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="h-12 flex-1 bg-slate-200 rounded-xl"
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-rose-200 bg-rose-50/80 px-6 py-8 text-rose-600 text-center"
        >
          <p className="font-semibold text-base">{error}</p>
          <p className="text-sm text-rose-500 mt-2">
            Please refresh the page to attempt another fetch from the exchange.
          </p>
        </motion.div>
      )}

      {!loading && !error && !hasSnapshot && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500"
        >
          <p className="text-base">There are no securities in today&apos;s snapshot yet. Check back soon for live opportunities.</p>
        </motion.div>
      )}

      {hasSnapshot && (
        <div className="grid gap-7 md:gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {sortedCards.map((card, index) => {
            const trendIcon = card.positive ? FiTrendingUp : card.negative ? FiTrendingDown : FiActivity;
            const TrendIcon = trendIcon;
            const changeTone = card.positive
              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : card.negative
              ? "text-rose-600 bg-rose-50 border-rose-200"
              : "text-slate-600 bg-slate-50 border-slate-200";

            return (
              <motion.article
                key={`${card.security}-${card.index}`}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, margin: "-80px", amount: 0.3 }}
                transition={{
                  duration: 0.7,
                  delay: (index % 3) * 0.15, // Stagger by row
                  ease: [0.25, 0.46, 0.45, 0.94], // Custom easing
                }}
                whileHover={{
                  y: -12,
                  scale: 1.03,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                className="group relative overflow-hidden rounded-3xl border-2 border-slate-200/60 bg-white p-7 shadow-lg hover:shadow-2xl hover:border-[#026379]/30"
              >
                {/* Decorative gradient background on hover */}
                <div className="absolute inset-0 bg-linear-to-br from-[#026379]/0 via-cyan-500/0 to-blue-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-5"></div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col gap-6">
                  {/* Header Section */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Trend Badge */}
                      <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${changeTone}`}>
                        <TrendIcon className="h-4 w-4" />
                        {card.positive ? "Bullish" : card.negative ? "Bearish" : "Neutral"}
                      </div>
                      
                      {/* Security Name */}
                      <h3 className="text-2xl font-bold text-slate-900 leading-tight group-hover:text-[#026379] transition-colors">
                        {card.security || "Unnamed Security"}
                      </h3>
                    </div>

                    {/* Price Badge */}
                    <div className="relative h-18 w-18 shrink-0 rounded-2xl bg-linear-to-br from-[#004B5B] to-[#026379] flex items-center justify-center shadow-md group-hover:shadow-xl transition-all group-hover:scale-110">
                      <span className="text-white text-lg font-bold">{card.closing || "—"}</span>
                      <div className="absolute -inset-1 bg-linear-to-br from-cyan-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-all"></div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-all group-hover:border-[#026379]/20 group-hover:bg-[#026379]/5">
                      <dt className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Closing</dt>
                      <dd className="text-lg font-bold text-slate-900">{card.closing || "—"}</dd>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-all group-hover:border-[#026379]/20 group-hover:bg-[#026379]/5">
                      <dt className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Previous</dt>
                      <dd className="text-lg font-bold text-slate-900">{card.previous || "—"}</dd>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-all group-hover:border-[#026379]/20 group-hover:bg-[#026379]/5">
                      <dt className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Volume</dt>
                      <dd className="text-lg font-bold text-slate-900">{card.volume || "—"}</dd>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-all group-hover:border-[#026379]/20 group-hover:bg-[#026379]/5">
                      <dt className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Value</dt>
                      <dd className="text-lg font-bold text-slate-900">{card.value || "—"}</dd>
                    </div>
                  </dl>

                  {/* Footer with Change and Actions */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    {/* Change Indicator */}
                    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${changeTone}`}>
                      <TrendIcon className="h-4 w-4" />
                      <span>{card.change || "0.00"}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link
                        href="/forms/PurchaseOrderForm"
                        className="group/btn inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition-all hover:bg-emerald-600 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300"
                      >
                        <span>Buy</span>
                        <svg className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <Link
                        href="/forms/SaleOrderForm"
                        className="inline-flex items-center justify-center rounded-xl border-2 border-rose-400 bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-rose-500 transition-all hover:bg-rose-500 hover:text-white hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-rose-300"
                      >
                        <span>Sell</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MarketCardGrid;
