// Driver-confirmed historical percentage repair. Never change saved gross,
// parcels, stops, dates, extra work or pay models based on today's rates.
export const validHistoricalFee = value =>
  value !== '' && value !== null && value !== undefined &&
  typeof value !== 'boolean' && Number.isFinite(Number(value)) &&
  Number(value) >= 0 && Number(value) <= 100;

export const validHistoricalGross = log =>
  log?.total !== '' && log?.total !== null && log?.total !== undefined &&
  Number.isFinite(Number(log.total)) && Number.isSafeInteger(Math.round(Number(log.total) * 100));

export function historicalFeeIssue(logs, period) {
  const rows=(logs||[]).filter(r=>r.date>=period.start&&r.date<=period.end);
  const missingGross=rows.filter(r=>!validHistoricalGross(r));
  const missingFee=rows.filter(r=>validHistoricalGross(r)&&!validHistoricalFee(r.payStructureSnapshot?.contractorFeePercent)&&!validHistoricalFee(r.historicalFeeConfirmation?.percent));
  return {rows,missingGross,missingFee};
}

export function applyConfirmedHistoricalFee(logs,period,feePercent,confirmedAt) {
  if(!validHistoricalFee(feePercent) || !/^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/.test(String(feePercent)))
    throw new Error('Enter a contractor fee from 0 to 100%, with up to two decimal places.');
  const rate=Number(feePercent);
  const {missingFee}=historicalFeeIssue(logs,period);
  if(!missingFee.length)throw new Error('No saved days need a contractor fee.');
  const eligible=new Set(missingFee);
  return logs.map(log=>eligible.has(log)?{
    ...log,
    // Keep the original snapshot untouched. A fee-only snapshot would break
    // historical editing because it has no pay model or earning rates.
    historicalFeeConfirmation:{percent:rate,confirmedAt:confirmedAt||new Date().toISOString(),method:'driver_confirmed_period'}
  }:log);
}
