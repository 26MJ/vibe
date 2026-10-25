export type PeriodType = "daily" | "weekly" | "weekend";

export type BoxOfficeItem = {
  rank: number;
  movieName: string;
  openDate: string;
  salesAmount: number;
  audienceCount: number;
  accumulatedAudience: number;
};

const demoStart = "2026-09-07";
const demoEnd = "2026-09-13";

const movies = [
  {
    rank: 1,
    movieName: "별빛 탐정",
    openDate: "2026-09-02",
    salesAmount: 120_000_000,
    audienceCount: 12_000,
    accumulatedAudience: 165_000,
  },
  {
    rank: 2,
    movieName: "바다의 노래",
    openDate: "2026-09-04",
    salesAmount: 89_000_000,
    audienceCount: 8_900,
    accumulatedAudience: 92_000,
  },
  {
    rank: 3,
    movieName: "우리의 내일",
    openDate: "2026-08-27",
    salesAmount: 55_000_000,
    audienceCount: 5_500,
    accumulatedAudience: 248_000,
  },
] as const;

const multipliers: Record<PeriodType, number> = {
  daily: 1,
  weekly: 7,
  weekend: 3,
};

export function isDemoDate(date: string) {
  return date >= demoStart && date <= demoEnd;
}

export function getDemoBoxOffice(date: string, periodType: PeriodType): BoxOfficeItem[] {
  if (!isDemoDate(date)) {
    return [];
  }

  const dayOffset = Number(date.slice(-2)) - 7;
  const multiplier = multipliers[periodType];

  return movies.map((movie, index) => ({
    ...movie,
    rank: ((movie.rank + dayOffset + index) % movies.length) + 1,
    salesAmount: movie.salesAmount * multiplier,
    audienceCount: movie.audienceCount * multiplier,
    accumulatedAudience: movie.accumulatedAudience + movie.audienceCount * dayOffset,
  })).sort((left, right) => left.rank - right.rank);
}

export const demoPeriod = { start: demoStart, end: demoEnd } as const;
