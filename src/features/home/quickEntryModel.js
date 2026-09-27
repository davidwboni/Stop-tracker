export const emptyDraft = () => ({ quantity: '', parcels: '', miles: '', extraWork: false, extraType: '', amount: '', notes: '' });

export function draftFromLog(log, model) {
  if (!log) return emptyDraft();
  const quantity = log.quantity ?? (model === 'per_day' ? (Number(log.stops) > 0 ? 1 : 0) : model === 'hourly' ? log.hours : model === 'per_mile' ? log.miles : log.stops);
  return {
    quantity: quantity == null ? '' : String(quantity),
    parcels: log.totalParcels == null ? '' : String(log.totalParcels),
    miles: log.miles == null ? '' : String(log.miles),
    extraWork: log.extraWork ?? (Number(log.extra) > 0 || !!log.extraType),
    extraType: log.extraType || '', amount: log.extra == null ? '' : String(log.extra), notes: log.notes || '',
  };
}

export function validateDraft(draft, model, parcelsRelevant, date, today) {
  const errors = {};
  const decimal = value => /^\d+(\.\d{1,2})?$/.test(value) && Number.isFinite(Number(value));
  const whole = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
  const parsedDate = new Date(date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) errors.date = 'Choose today or an earlier valid date.';
  if (model === 'per_day') {
    if (!['0', '1'].includes(draft.quantity)) errors.quantity = 'Choose whether you worked.';
  } else if (['flat_stops', 'tiered_stops', 'sliding_scale'].includes(model)) {
    if (!whole(draft.quantity)) errors.quantity = 'Enter a whole number of stops, including 0 if none.';
  } else if (!decimal(draft.quantity)) errors.quantity = 'Enter a valid work quantity with up to two decimal places.';
  if (parcelsRelevant && draft.parcels !== '' && (!whole(draft.parcels) || Number(draft.parcels) < Number(draft.quantity))) errors.parcels = 'Total parcels must be a whole number at least as large as stops.';
  if (model === 'sliding_scale' && !decimal(draft.miles)) errors.miles = 'Enter miles driven with up to two decimal places.';
  if (draft.extraWork && draft.amount !== '' && !decimal(draft.amount)) errors.amount = 'Enter an amount of £0 or more with up to two decimal places.';
  return errors;
}

export function sameWork(a, b) {
  return Number(a.quantity) === Number(b.quantity)
    && a.parcels === b.parcels
    && Number(a.miles || 0) === Number(b.miles || 0)
    && Number(a.extraWork ? a.amount || 0 : 0) === Number(b.extraWork ? b.amount || 0 : 0);
}
