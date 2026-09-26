import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { CoverageData, RiskScore, CoverageReport } from '../types';
import { mockCoverageData, mockRiskScores, mockReport } from '../mock/sampleData';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useCoverageData(): UseQueryResult<CoverageData[], Error> {
  return useQuery<CoverageData[], Error>({
    queryKey: ['coverage'],
    queryFn: () => Promise.resolve(mockCoverageData),
    staleTime: FIVE_MINUTES,
  });
}

export function useRiskScores(): UseQueryResult<RiskScore[], Error> {
  return useQuery<RiskScore[], Error>({
    queryKey: ['risks'],
    queryFn: () => Promise.resolve(mockRiskScores),
  });
}

export function useReport(): UseQueryResult<CoverageReport, Error> {
  return useQuery<CoverageReport, Error>({
    queryKey: ['report'],
    queryFn: () => Promise.resolve(mockReport),
  });
}
