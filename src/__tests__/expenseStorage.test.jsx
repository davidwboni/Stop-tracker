import { beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import useExpenses from '../hooks/useExpenses';
const fixture=vi.hoisted(()=>({adopt:vi.fn(),period:'2026-09-14_2026-10-11'}));
vi.mock('../services/firebase',()=>({db:{}}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'expenses-test',isGuest:true}})}));
vi.mock('../contexts/DataContext',()=>({useData:()=>({payPeriodAnchor:'2026-09-14',periodRecords:{[fixture.period]:{status:'reconciled'}},adoptPeriodRecords:fixture.adopt})}));
const entry={id:'fuel',date:'2026-09-26',amount:45.2,source:'my_expense',category:'Fuel'};
beforeEach(()=>{localStorage.clear();fixture.adopt.mockReset();});
it('saves under the guest identity and flags a checked period for review',async()=>{
 const {result}=renderHook(()=>useExpenses());
 await waitFor(()=>expect(result.current.loading).toBe(false));
 await act(async()=>{await result.current.save(entry);});
 expect(JSON.parse(localStorage.getItem('expenses_expenses-test'))).toEqual([expect.objectContaining(entry)]);
 expect(fixture.adopt).toHaveBeenCalledWith({[fixture.period]:expect.objectContaining({status:'needs_review',needsReview:true})});
});
it('keeps a recurring rule out of recorded expenses and can stop it',async()=>{
 localStorage.setItem('expenses_expenses-test',JSON.stringify([entry]));
 const {result}=renderHook(()=>useExpenses());
 await waitFor(()=>expect(result.current.loading).toBe(false));
 await act(async()=>{await result.current.makeRecurring(entry,'monthly','2026-10-26');});
 expect(result.current.expenses).toHaveLength(1);
 expect(result.current.rules).toHaveLength(1);
 await act(async()=>{await result.current.stopRecurring('rule_fuel');});
 expect(result.current.rules[0].active).toBe(false);
 expect(result.current.expenses[0].amount).toBe(45.2);
});
it('rejects a second record for an already-linked recurring occurrence',async()=>{
 localStorage.setItem('expenses_expenses-test',JSON.stringify([{...entry,recurringRuleId:'rule',occurrenceDate:entry.date}]));
 const {result}=renderHook(()=>useExpenses());
 await waitFor(()=>expect(result.current.loading).toBe(false));
 await expect(result.current.save({...entry,id:'duplicate',recurringRuleId:'rule',occurrenceDate:entry.date})).rejects.toThrow('already recorded');
 expect(JSON.parse(localStorage.getItem('expenses_expenses-test'))).toHaveLength(1);
});
