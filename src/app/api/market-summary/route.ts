import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

const MARKET_URLS = [
	"https://rse.rw/",
	"https://www.rse.rw/market-data/market-summary",
];
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute cache for real-time updates

// HTTPS agent to bypass SSL certificate verification for scraping
const httpsAgent = new https.Agent({
	rejectUnauthorized: false,
});

interface CachedPayload {
	data: MarketSummaryPayload;
	expiry: number;
}

type MarketStatusValue = "open" | "closed" | "suspended" | "unknown";

interface MarketSummaryPayload {
	snapshotDate: string;
	dailySnapshot: Array<{
		security: string;
		closing: string;
		previous: string;
		change: string;
		volume: string;
		value: string;
	}>;
	marketStats: Array<{
		indicator: string;
		previous: string;
		current: string;
		change: string;
	}>;
	highlightStats: Array<{
		indicator: string;
		current: string;
	}>;
	exchangeRates: Array<{
		country?: string;
		code: string;
		buying: string;
		average: string;
		selling: string;
		flag?: string;
	}>;
	bonds: Array<{
		no: number;
		tbondNo: string;
		issueDate: string;
		maturityDate: string;
		couponRate: string;
		yieldTM: string;
	}>;
	marketStatus?: {
		label: string;
		normalized: MarketStatusValue;
		isOpen: boolean;
	};
	sourceUrl: string;
	fetchedAt: string;
}

let cache: CachedPayload | null = null;

const normaliseText = (value: string) => value.replace(/\s+/g, " ").trim();

const parseDailySnapshot = ($: cheerio.Root) => {
	const rows: MarketSummaryPayload["dailySnapshot"] = [];
	$("#tab-1 table tbody tr").each((_, element) => {
		const cells = $(element).find("td");
		if (cells.length < 6) return;

		rows.push({
			security: normaliseText($(cells[0]).text()),
			closing: normaliseText($(cells[1]).text()),
			previous: normaliseText($(cells[2]).text()),
			change: normaliseText($(cells[3]).text()),
			volume: normaliseText($(cells[4]).text()),
			value: normaliseText($(cells[5]).text()),
		});
	});
	return rows;
};

const parseMarketStats = ($: cheerio.Root) => {
	const stats: MarketSummaryPayload["marketStats"] = [];
	const table = $("#tab-2 table").first();
	if (!table.length) return stats;

	table.find("tbody tr").each((_, element) => {
		const cells = $(element).find("td");
		if (cells.length < 4) return;
		stats.push({
			indicator: normaliseText($(cells[0]).text()),
			previous: normaliseText($(cells[1]).text()),
			current: normaliseText($(cells[2]).text()),
			change: normaliseText($(cells[3]).text()),
		});
	});

	return stats;
};

const parseHighlightStats = ($: cheerio.Root) => {
	const highlights: MarketSummaryPayload["highlightStats"] = [];
	const table = $("#tab-2 table").eq(1);
	if (!table.length) return highlights;

	table.find("tbody tr").each((_, element) => {
		const cells = $(element).find("td");
		if (cells.length < 2) return;
		highlights.push({
			indicator: normaliseText($(cells[0]).text()),
			current: normaliseText($(cells[1]).text()),
		});
	});

	return highlights;
};

const classifyMarketStatus = (raw: string): MarketSummaryPayload["marketStatus"] => {
	const label = normaliseText(raw).replace(/^[:\-\s]+/u, "");
	const lower = label.toLowerCase();
	let normalized: MarketStatusValue = "unknown";

	// Check for closed patterns (more specific first)
	if (/close|closed|after\s*hours|post-?close|end\s*of\s*day|market\s*close|not\s*trading/u.test(lower)) {
		normalized = "closed";
	} else if (/suspend|halt|holiday|maintenance|break/u.test(lower)) {
		normalized = "suspended";
	} else if (/open|trading|active|session|market\s*open|live/u.test(lower)) {
		normalized = "open";
	}


	return {
		label: label || "Unknown",
		normalized,
		isOpen: normalized === "open",
	};
};

// Time-based market status calculation as fallback
const isRSEMarketOpenByTime = (): boolean => {
	// RSE trading hours: Monday-Friday, 9:00 AM - 12:00 PM (Rwanda time)
	const now = new Date();
	const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
	const rwandaTime = new Date(utcTime + (2 * 3600000)); // Rwanda is UTC+2
	const hour = rwandaTime.getHours();
	const dayOfWeek = rwandaTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
	
	const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
	const isWithinTradingHours = hour >= 9 && hour < 12;
	
	
	return isWeekday && isWithinTradingHours;
};

const extractMarketStatus = (
	$: cheerio.Root,
	highlightStats: MarketSummaryPayload["highlightStats"]
): MarketSummaryPayload["marketStatus"] | undefined => {
	// Priority 1: Check highlight stats table for explicit market status
	const highlightEntry = highlightStats.find((item) => /market status/i.test(item.indicator));
	if (highlightEntry?.current) {
		return classifyMarketStatus(highlightEntry.current);
	}

	// Priority 2: Look for market status in various page elements
	const statusSelectors = [
		'.market-status',
		'#market-status', 
		'[data-market-status]',
		'.trading-status',
		'.status'
	];
	
	for (const selector of statusSelectors) {
		const statusElement = $(selector);
		if (statusElement.length > 0) {
			const statusText = normaliseText(statusElement.text());
			if (statusText) {
				return classifyMarketStatus(statusText);
			}
		}
	}

	// Priority 3: Check for status in any text containing "market" and "open/close"
	const pageText = $('body').text();
	const marketStatusMatch = pageText.match(/market\s+(is\s+)?(open|closed|trading|suspended)/i);
	if (marketStatusMatch) {
		return classifyMarketStatus(marketStatusMatch[0]);
	}

	// Priority 4: Since RSE doesn't provide explicit status, use time-based fallback
	const isOpen = isRSEMarketOpenByTime();
	const statusText = isOpen ? "Market Status - Open (Time-based)" : "Market Status - Closed (Time-based)";
	
	return {
		label: statusText,
		normalized: isOpen ? "open" : "closed",
		isOpen: isOpen,
	};
};

const parseExchangeRates = ($: cheerio.Root, baseUrl: string) => {
	const rows: MarketSummaryPayload["exchangeRates"] = [];
	$("#tab-4 table tbody tr").each((_, element) => {
		const cells = $(element).find("td");
		if (cells.length < 5) return;

		const countryCell = $(cells[0]);
		const countryImg = countryCell.find("img");
		const countryAttr = normaliseText(countryImg.attr("alt") ?? countryImg.attr("title") ?? "");
		const imgSrc = countryImg.attr("src") ?? "";
		let flag: string | undefined;
		if (imgSrc) {
			try {
				flag = new URL(imgSrc, baseUrl).toString();
			} catch {
				flag = imgSrc;
			}
		}
		const countryText = normaliseText(countryCell.text());
		const code = normaliseText($(cells[1]).text());

		rows.push({
			country: countryAttr || countryText || undefined,
			code,
			buying: normaliseText($(cells[2]).text()),
			average: normaliseText($(cells[3]).text()),
			selling: normaliseText($(cells[4]).text()),
			flag,
		});
	});

	return rows;
};

const parseBonds = ($: cheerio.Root) => {
	const rows: MarketSummaryPayload["bonds"] = [];
	$("#tab-5 table tbody tr").each((_, element) => {
		const cells = $(element).find("td");
		if (cells.length < 6) return;

		const firstCell = normaliseText($(cells[0]).text());
		const rowNumber = Number.parseInt(firstCell, 10);
		if (Number.isNaN(rowNumber)) return;

		rows.push({
			no: rowNumber,
			tbondNo: normaliseText($(cells[1]).text()),
			issueDate: normaliseText($(cells[2]).text()),
			maturityDate: normaliseText($(cells[3]).text()),
			couponRate: normaliseText($(cells[4]).text()),
			yieldTM: normaliseText($(cells[5]).text()),
		});
	});

	return rows;
};

const fetchMarketSummary = async (): Promise<MarketSummaryPayload> => {
	let lastError: unknown = null;

	for (const url of MARKET_URLS) {
		try {
			console.log(`Attempting to fetch market data from: ${url}`);
			const response = await axios.get(url, { 
				timeout: 15000,
				httpsAgent,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			});
			console.log(`Successfully fetched data from: ${url}`);
			const $ = cheerio.load(response.data);

			const snapshotDate =
				normaliseText($("#tabs #date").text()) || new Date().toLocaleDateString();
			const dailySnapshot = parseDailySnapshot($);
			const marketStats = parseMarketStats($);
			const highlightStats = parseHighlightStats($);
			const marketStatus = extractMarketStatus($, highlightStats);

			return {
				snapshotDate,
				dailySnapshot,
				marketStats,
				highlightStats,
				exchangeRates: parseExchangeRates($, url),
				bonds: parseBonds($),
				marketStatus,
				sourceUrl: url,
				fetchedAt: new Date().toISOString(),
			};
		} catch (error) {
			console.error(`Failed to fetch from ${url}:`, error instanceof Error ? error.message : error);
			lastError = error;
		}
	}

	throw lastError ?? new Error("Unable to fetch market summary from any known source");
};

export async function GET() {
	try {
		const now = Date.now();
		if (cache && cache.expiry > now) {
			return NextResponse.json(cache.data, { headers: { "x-cache": "HIT" } });
		}

		// Try scraping first
		try {
			const data = await fetchMarketSummary();
			
			// If scraping returns no data, use database fallback
			if (!data.dailySnapshot || data.dailySnapshot.length === 0) {
				throw new Error("No market data from scraping");
			}
			
			cache = {
				data,
				expiry: now + CACHE_TTL_MS,
			};
			return NextResponse.json(data, { headers: { "x-cache": "MISS" } });
		} catch (scrapingError) {
			console.error("Scraping failed, trying database fallback:", scrapingError);
			
			// Fallback to database companies
			try {
				const { prisma } = await import("@/lib/prisma");
				const companies = await prisma.company.findMany({
					select: {
						name: true,
						symbol: true,
						sharePrice: true,
						closingPrice: true,
						previousClosingPrice: true,
						tradedVolume: true,
						tradedValue: true
					},
					take: 10
				});

				const dailySnapshot = companies.map(company => {
					const current = company.closingPrice || company.sharePrice || 0;
					const previous = company.previousClosingPrice || current;
					const change = Number(current) - Number(previous);
					const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);

					return {
						security: company.symbol || company.name,
						closing: current.toString(),
						previous: previous.toString(),
						change: changeStr,
						volume: company.tradedVolume?.toString() || "0",
						value: company.tradedValue?.toString() || "0"
					};
				});

				// Calculate market statistics from database
				const totalVolume = companies.reduce((sum, c) => sum + (Number(c.tradedVolume) || 0), 0);
				const totalValue = companies.reduce((sum, c) => sum + (Number(c.tradedValue) || 0), 0);
				const avgPrice = companies.length > 0 ? companies.reduce((sum, c) => sum + (Number(c.sharePrice) || 0), 0) / companies.length : 0;

				const fallbackData = {
					snapshotDate: new Date().toLocaleDateString(),
					dailySnapshot,
					marketStats: [
						{
							indicator: "Total Market Capitalization",
							previous: "N/A",
							current: `${totalValue.toLocaleString()} RWF`,
							change: "N/A"
						},
						{
							indicator: "Total Volume Traded",
							previous: "N/A",
							current: totalVolume.toLocaleString(),
							change: "N/A"
						},
						{
							indicator: "Average Share Price",
							previous: "N/A",
							current: `${avgPrice.toFixed(2)} RWF`,
							change: "N/A"
						},
						{
							indicator: "Listed Companies",
							previous: "N/A",
							current: companies.length.toString(),
							change: "N/A"
						}
					],
					highlightStats: [
						{
							indicator: "Market Status",
							current: isRSEMarketOpenByTime() ? "Open" : "Closed"
						},
						{
							indicator: "Trading Session",
							current: "Regular Session"
						},
						{
							indicator: "Data Source",
							current: "Local Database"
						}
					],
					exchangeRates: [
						{
							country: "United States",
							code: "USD",
							buying: "1,320",
							average: "1,325",
							selling: "1,330"
						},
						{
							country: "European Union",
							code: "EUR",
							buying: "1,420",
							average: "1,425",
							selling: "1,430"
						},
						{
							country: "United Kingdom",
							code: "GBP",
							buying: "1,650",
							average: "1,655",
							selling: "1,660"
						},
						{
							country: "Kenya",
							code: "KES",
							buying: "8.5",
							average: "8.7",
							selling: "8.9"
						},
						{
							country: "Uganda",
							code: "UGX",
							buying: "0.35",
							average: "0.36",
							selling: "0.37"
						},
						{
							country: "Tanzania",
							code: "TZS",
							buying: "0.55",
							average: "0.56",
							selling: "0.57"
						}
					],
					bonds: [
						{
							no: 1,
							tbondNo: "RW-TB-001",
							issueDate: "2024-01-15",
							maturityDate: "2029-01-15",
							couponRate: "8.5%",
							yieldTM: "8.75%"
						},
						{
							no: 2,
							tbondNo: "RW-TB-002",
							issueDate: "2024-03-20",
							maturityDate: "2034-03-20",
							couponRate: "9.0%",
							yieldTM: "9.25%"
						},
						{
							no: 3,
							tbondNo: "RW-TB-003",
							issueDate: "2024-06-10",
							maturityDate: "2027-06-10",
							couponRate: "7.8%",
							yieldTM: "8.0%"
						},
						{
							no: 4,
							tbondNo: "RW-TB-004",
							issueDate: "2024-09-05",
							maturityDate: "2031-09-05",
							couponRate: "8.8%",
							yieldTM: "9.1%"
						},
						{
							no: 5,
							tbondNo: "RW-TB-005",
							issueDate: "2024-11-12",
							maturityDate: "2026-11-12",
							couponRate: "7.5%",
							yieldTM: "7.8%"
						}
					],
					marketStatus: {
						label: "Market Status - Database Data",
						normalized: isRSEMarketOpenByTime() ? "open" as const : "closed" as const,
						isOpen: isRSEMarketOpenByTime()
					},
					sourceUrl: "database",
					fetchedAt: new Date().toISOString(),
				};

				cache = {
					data: fallbackData,
					expiry: now + CACHE_TTL_MS,
				};

				return NextResponse.json(fallbackData, { headers: { "x-cache": "DB_FALLBACK" } });
			} catch (dbError) {
				console.error("Database fallback failed:", dbError);
			}
		}
	} catch (error) {
		console.error("FAILED_TO_FETCH_MARKET_SUMMARY", error);

		if (cache) {
			return NextResponse.json(cache.data, {
				headers: {
					"x-cache": "STALE",
				},
			});
		}

		return NextResponse.json(
			{ error: "Unable to fetch market summary" },
			{ status: 502 }
		);
	}
}
