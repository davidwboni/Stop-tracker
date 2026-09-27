import { describe, expect, it } from 'vitest';
import { emptyDraft, draftFromLog, validateDraft, sameWork } from '../features/home/quickEntryModel';
const day = '2026-09-26';
const draft = { ...emptyDraft(), quantity:'120', parcels:'158', extraWork:true, amount:'30.00' };
const validate = value => validateDraft(value, 'flat_stops', true, day, '2026-09-27');
describe('Quick Entry validation and historical work', () => {
  it('accepts the approved example and permits unknown parcels or extras', () => {
    expect(validate(draft)).toEqual({});
    expect(validate({ ...draft, parcels:'', amount:'' })).toEqual({});
  });
  it('rejects fractional stops, impossible parcels and malformed extra payment', () => {
    expect(validate({ ...draft, quantity:'1.2' })).toHaveProperty('quantity');
    expect(validate({ ...draft, parcels:'100' })).toHaveProperty('parcels');
    for (const amount of ['-1', 'Infinity', '1e2', '1.234']) expect(validate({ ...draft, amount })).toHaveProperty('amount');
  });
  it('requires an explicit day-rate choice and allows a day off', () => {
    expect(validateDraft(emptyDraft(), 'per_day', false, day, day)).toHaveProperty('quantity');
    expect(validateDraft({ ...emptyDraft(), quantity:'0' }, 'per_day', false, day, day)).toEqual({});
  });
  it('rejects invalid dates without throwing and future dates', () => {
    expect(validateDraft(draft, 'flat_stops', true, '2020-13-10', day)).toHaveProperty('date');
    expect(validateDraft(draft, 'flat_stops', true, '2026-10-01', day)).toHaveProperty('date');
  });
  it('preserves historical totals when only notes change', () => {
    const baseline = draftFromLog({ stops:120, totalParcels:158, extra:30, total:271.5 }, 'flat_stops');
    expect(sameWork(baseline, { ...baseline, notes:'Updated description' })).toBe(true);
    expect(sameWork(baseline, { ...baseline, quantity:'121' })).toBe(false);
  });
  it('retains an extra-work record even when its optional amount is unknown', () => {
    expect(draftFromLog({ stops:120, extraWork:true, extra:0 }, 'flat_stops').extraWork).toBe(true);
  });
});
