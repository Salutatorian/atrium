import { useEffect, useState } from "react";
import {
  hasSeenYearLookback,
  isYearLookbackSeason,
  markYearLookbackSeen,
  yearLookbackTargetYear,
  YearLookback,
} from "./YearLookback";

/**
 * Opens the year lookback once on first launch during the quiet Jan window.
 * Outside that window this renders nothing.
 */
export function YearLookbackAutoOpen() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    if (!isYearLookbackSeason()) return;
    const target = yearLookbackTargetYear();
    if (hasSeenYearLookback(target)) return;
    setYear(target);
  }, []);

  if (year === null) return null;

  return (
    <YearLookback
      year={year}
      onClose={() => {
        markYearLookbackSeen(year);
        setYear(null);
      }}
    />
  );
}
