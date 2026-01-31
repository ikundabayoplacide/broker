"use client";

import { useEffect, useMemo, useState } from "react";

export interface MarketDataRow {
	security: string;
	closing: string;
	previous: string;
	change: string;
	volume: string;
	value: string;
}

export interface MarketStatusInfo {
	label: string;
	normalized: "open" | "closed" | "suspended" | "unknown";
	isOpen: boolean;
}

export interface MarketSummaryResponse {
	snapshotDate: string;
	dailySnapshot: MarketDataRow[];
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
	marketStatus?: MarketStatusInfo;
	sourceUrl?: string;
	fetchedAt?: string;
}

export interface UseMarketSummaryState {
	data: MarketSummaryResponse | null;
	loading: boolean;
	error: string | null;
}

export function useMarketSummary(): UseMarketSummaryState {
	const [data, setData] = useState<MarketSummaryResponse | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		async function fetchSummary() {
			setLoading(true);
			try {
				const response = await fetch("/api/market-summary", {
					signal: controller.signal,
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}

				const payload = (await response.json()) as MarketSummaryResponse;
				
				const processedData = {
					...payload,
					dailySnapshot: payload.dailySnapshot ?? [],
					marketStats: payload.marketStats ?? [],
					highlightStats: payload.highlightStats ?? [],
					exchangeRates: payload.exchangeRates ?? [],
					bonds: payload.bonds ?? [],
					marketStatus: payload.marketStatus,
				};
				
				setData(processedData);
				setError(null);
			} catch (err) {
				if (!controller.signal.aborted) {
					console.error("Failed to fetch market summary", err);
					setError("Live market data is unavailable right now. Please try again later.");
				}
			} finally {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			}
		}

		fetchSummary();

		return () => controller.abort();
	}, []);

	return useMemo(
		() => ({
			data,
			loading,
			error,
		}),
		[data, loading, error]
	);
}