const DAY_MS = 86400000;

export const isoDate = (date) => {
  const d = new Date(date);
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};

const localDate = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return new Date(value.getFullYear(),value.getMonth(),value.getDate());
  return new Date(String(value).slice(0,10) + 'T00:00:00');
};

export const getPeriodForDate = (anchorDate, targetDate = new Date(), lengthDays = 28) => {
  const anchor=localDate(anchorDate), target=localDate(targetDate);
  const days=Math.floor((target-anchor)/DAY_MS);
  const index=Math.floor(days/lengthDays);
  const start=new Date(anchor); start.setDate(start.getDate()+index*lengthDays);
  const end=new Date(start); end.setDate(end.getDate()+lengthDays-1);
  return { id:`${isoDate(start)}_${isoDate(end)}`, start:isoDate(start), end:isoDate(end), index, lengthDays };
};

export const getPeriodLogs = (logs, period) => (logs || []).filter(l => l.date >= period.start && l.date <= period.end);

export const summarizePeriod = (logs, period) => {
  const rows=getPeriodLogs(logs,period);
  return { ...period, logs:rows, daysLogged:new Set(rows.map(r=>r.date)).size, stops:rows.reduce((s,r)=>s+(Number(r.stops)||0),0), expected:rows.reduce((s,r)=>s+(Number(r.total)||0),0) };
};

export const listPeriods = (logs, anchorDate, count=6, now=new Date()) => {
  const current=getPeriodForDate(anchorDate,now);
  return Array.from({length:count},(_,i)=>{
    const start=localDate(current.start); start.setDate(start.getDate()-i*current.lengthDays);
    return summarizePeriod(logs,getPeriodForDate(anchorDate,start,current.lengthDays));
  });
};
