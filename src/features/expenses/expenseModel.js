import { pennies } from '../home/homeModel';
export const SOURCES = { contractor_charge: 'Contractor charge', my_expense: 'My expense' };
export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value;
export function validateExpense(e) {
  return !!e.id && validDate(e.date) && Number.isFinite(e.amount) && e.amount > 0 && Number.isSafeInteger(pennies(e.amount)) && !!SOURCES[e.source];
}
export function splitExpenseRecords(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid expense records');
  const expenses = rows.filter(e => e.kind !== 'recurring_rule');
  const rules = rows.filter(e => e.kind === 'recurring_rule');
  if (rules.some(e => !validDate(e.nextDate) || !Number.isFinite(e.amount) || e.amount <= 0 || !SOURCES[e.source] || !['weekly','four_weekly','monthly'].includes(e.frequency))) throw new Error('A recurring rule needs checking');
  if (expenses.some(e => !validateExpense(e))) throw new Error('An expense needs checking');
  return { expenses, rules };
}
export function expenseSummary(expenses, period) {
  const records = expenses.filter(e => e.date >= period.start && e.date <= period.end).sort((a,b) => b.date.localeCompare(a.date) || String(a.id).localeCompare(String(b.id)));
  const sum = source => records.filter(e => !source || e.source === source).reduce((s,e) => s + pennies(e.amount),0)/100;
  return { records, total:sum(), contractor:sum('contractor_charge'), own:sum('my_expense') };
}
export function recurringOccurrences(rules, expenses, period) {
  const result = [];
  for (const rule of rules) {
    if (!rule.active || !validDate(rule.nextDate) || !['weekly','four_weekly','monthly'].includes(rule.frequency)) continue;
    const anchor = new Date(rule.nextDate + 'T12:00:00Z');
    for (let n=0;n<2400;n++) {
      let date = new Date(anchor);
      if (rule.frequency === 'monthly') {
        const targetMonth = anchor.getUTCMonth()+n;
        date = new Date(Date.UTC(anchor.getUTCFullYear(), targetMonth, 1,12));
        const last = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
        date.setUTCDate(Math.min(anchor.getUTCDate(),last));
      } else date.setUTCDate(date.getUTCDate()+n*(rule.frequency==='weekly'?7:28));
      const dateKey = date.toISOString().slice(0,10);
      if (dateKey > period.end) break;
      if (dateKey < period.start) continue;
      if (expenses.some(e => e.recurringRuleId===rule.id && e.occurrenceDate===dateKey)) continue;
      result.push({ ...rule, id:'occurrence_' + rule.id + '_' + dateKey, kind:'expense', date:dateKey, recurringRuleId:rule.id, occurrenceDate:dateKey });
    }
  }
  return result.sort((a,b) => a.date.localeCompare(b.date));
}
