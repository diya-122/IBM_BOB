import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { CoverageData, RiskScore, CoverageReport } from '../types';
import { mockCoverageData, mockRiskScores, mockReport } from '../mock/sampleData';

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:4001';
const FIVE_MINUTES = 5 * 60 * 1000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function useCoverageData(): UseQueryResult<CoverageData[], Error> {
  return useQuery<CoverageData[], Error>({
    queryKey: ['coverage'],
    queryFn: async () => {
      try {
        const data = await fetchJson<{ coverageData: CoverageData[] }>(`${API_BASE}/analyze`);
        return data.coverageData;
      } catch {
        return mockCoverageData;
      }
    },
    staleTime: FIVE_MINUTES,
  });
}

export function useRiskScores(): UseQueryResult<RiskScore[], Error> {
  return useQuery<RiskScore[], Error>({
    queryKey: ['risks'],
    queryFn: async () => {
      try {
        const data = await fetchJson<{ riskScores: RiskScore[] }>(`${API_BASE}/analyze`);
        return data.riskScores;
      } catch {
        return mockRiskScores;
      }
    },
  });
}

export function useReport(): UseQueryResult<CoverageReport, Error> {
  return useQuery<CoverageReport, Error>({
    queryKey: ['report'],
    queryFn: async () => {
      try {
        const data = await fetchJson<CoverageReport>(`${API_BASE}/report`);
        return data;
      } catch {
        return mockReport;
      }
    },
  });
}
