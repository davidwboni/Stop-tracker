import React from 'react';
import {it, expect, vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import StatementComparison, {comparisonLines} from '../components/StatementComparison';
import {insightSummary} from '../components/StatsPage';
vi.mock('../contexts/DataContext',()=>({useData:()=>({})}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));

const summary={gross:10000,fee:600,costs:{contractor:20},rows:[]};
it('does not invent line differences when the statement has only a final payout',()=>{
 expect(comparisonLines(null,summary).every(line=>line.difference===null)).toBe(true);
 expect(comparisonLines({grossPence:10500,feePence:630,chargesPence:2500},summary).map(l=>l.difference)).toEqual([500,30,500]);
});
it('matching payouts stay unresolved until the driver explicitly selects an outcome',()=>{
 const resolve=vi.fn();
 render(<StatementComparison period={{start:'2026-09-01',end:'2026-09-28'}} expected={7400} statement={7400} summary={summary} saved onResolve={resolve}/>);
 expect(screen.getByText('Checked · Unresolved')).toBeInTheDocument();
 expect(resolve).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Mark comparison resolved'}));
 expect(screen.getByRole('button',{name:'Confirm resolved'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Outcome'),{target:{value:'figures_verified'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm resolved'}));
 expect(resolve).toHaveBeenCalledWith('figures_verified');
});
it('a stale comparison cannot be saved or resolved',()=>{
 render(<StatementComparison period={{}} expected={7400} statement={7300} summary={summary} saved stale/>);
 expect(screen.getByRole('button',{name:'Mark comparison resolved'})).toBeDisabled();
});
it('insights group work days, derive excess parcels, and exclude an explicit day off',()=>{
 const result=insightSummary([
  {date:'2026-09-01',stops:120,totalParcels:158,total:251.50},
  {date:'2026-09-01',stops:10,totalParcels:10,total:20.80},
  {date:'2026-09-02',quantity:0,stops:0,total:0},
  {date:'2026-08-01',stops:200,total:500}
 ],{start:'2026-09-01',end:'2026-09-28'});
 expect(result).toMatchObject({stops:130,excess:38,gross:27230});
 expect(result.days).toHaveLength(1);
});
it('missing earnings stay unavailable in insights instead of turning into zero',()=>{
 expect(insightSummary([{date:'2026-09-01',stops:100,total:null}],{start:'2026-09-01',end:'2026-09-28'}).gross).toBeNull();
});
