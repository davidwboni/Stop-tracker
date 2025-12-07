/**
 * Pay Period Utilities
 * Handles 4-week (28-day) pay period calculations from a configurable anchor date
 */

export interface Period {
  index: number;
  start: Date;
  end: Date;
  label: string;
}

const PERIOD_LENGTH_DAYS = 28;

/**
 * Calculates the pay period for a given date based on an anchor date
 * @param anchorISO - The anchor date in ISO format (YYYY-MM-DD)
 * @param date - The date to calculate the period for
 * @returns Period information including index, start, and end dates
 */
export function getPeriodFromDate(anchorISO: string, date: Date): Period {
  const anchor = new Date(anchorISO);
  anchor.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Calculate the number of days between anchor and target
  const daysDiff = Math.floor((targetDate.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate which period this date falls into
  const periodIndex = Math.floor(daysDiff / PERIOD_LENGTH_DAYS);

  // Calculate the start date of this period
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + (periodIndex * PERIOD_LENGTH_DAYS));

  // Calculate the end date (exclusive)
  const end = new Date(start);
  end.setDate(start.getDate() + PERIOD_LENGTH_DAYS);

  // Create label
  const formatDate = (d: Date) => {
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  };

  const label = `${formatDate(start)} - ${formatDate(new Date(end.getTime() - 24 * 60 * 60 * 1000))}`;

  return {
    index: periodIndex,
    start,
    end,
    label,
  };
}

/**
 * Gets a list of pay periods going back from today
 * @param anchorISO - The anchor date in ISO format (YYYY-MM-DD)
 * @param countBack - Number of periods to go back (default: 6)
 * @returns Array of Period objects
 */
export function getPeriods(anchorISO: string, countBack: number = 6): Period[] {
  const today = new Date();
  const currentPeriod = getPeriodFromDate(anchorISO, today);

  const periods: Period[] = [];

  // Get current period and previous periods
  for (let i = 0; i <= countBack; i++) {
    const periodIndex = currentPeriod.index - i;
    const anchor = new Date(anchorISO);

    const start = new Date(anchor);
    start.setDate(anchor.getDate() + (periodIndex * PERIOD_LENGTH_DAYS));

    const end = new Date(start);
    end.setDate(start.getDate() + PERIOD_LENGTH_DAYS);

    const formatDate = (d: Date) => {
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();
      const year = d.getFullYear();
      return `${month} ${day}, ${year}`;
    };

    const shortFormatDate = (d: Date) => {
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();
      return `${month} ${day}`;
    };

    const endDateForLabel = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const label = `${shortFormatDate(start)} - ${shortFormatDate(endDateForLabel)}`;

    periods.push({
      index: periodIndex,
      start,
      end,
      label,
    });
  }

  return periods;
}

/**
 * Checks if a date falls within a given period
 * @param date - The date to check
 * @param period - The period to check against
 * @returns boolean indicating if the date is within the period
 */
export function isDateInPeriod(date: Date, period: Period): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate >= period.start && checkDate < period.end;
}

/**
 * Generates a suggested anchor date (28 days ago from today, rounded to Sunday)
 * @returns ISO date string for suggested anchor
 */
export function getSuggestedAnchorDate(): string {
  const today = new Date();

  // Go back 28 days
  const suggested = new Date(today);
  suggested.setDate(today.getDate() - 28);

  // Round to the previous Sunday
  const dayOfWeek = suggested.getDay();
  suggested.setDate(suggested.getDate() - dayOfWeek);

  return suggested.toISOString().split('T')[0];
}

export default {
  getPeriodFromDate,
  getPeriods,
  isDateInPeriod,
  getSuggestedAnchorDate,
};
