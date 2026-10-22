import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {parsePreviousWorkCsv} from '../features/home/previousWorkImport';
import PreviousWorkImport from '../components/PreviousWorkImport';
describe('historical work CSV safety',()=>{
 it('parses driver-authored rows with decimals, dates and optional parcels without fabricating rates',()=>{
   const rows=parsePreviousWorkCsv('date,stops,parcels,gross\n2026-09-14,120,158,249.60\n2026-09-15,100,121,208.00\n');
   expect(rows).toHaveLength(2);
   expect(rows[0]).toMatchObject({date:'2026-09-14',stops:120,totalParcels:158,total:249.60,origin:'driver_csv_import'});
   expect(rows[0].payStructureSnapshot).toBeUndefined();
 });
 it('refuses duplicate workday dates, unparseable dates and missing gross values',()=>{
   expect(()=>parsePreviousWorkCsv('date,stops,gross\n2026-09-14,10,20\n2026-09-14,11,22')).toThrow(/repeated date/);
   expect(()=>parsePreviousWorkCsv('date,stops,gross\n2026-31-01,10,20')).toThrow(/YYYY-MM-DD/);
   expect(()=>parsePreviousWorkCsv('date,stops,gross\n2026-09-14,10,')).toThrow(/gross amount/);
   expect(()=>parsePreviousWorkCsv('date,stops,gross\n2026-09-14,10,-2')).toThrow(/gross amount/);
 });
 it('blocks importing dates already saved and requires the owner\'s explicit confirmation',async()=>{
   const onImport=vi.fn().mockResolvedValue(),onClose=vi.fn();
   render(<PreviousWorkImport existing={[{date:'2026-09-14'}]} onImport={onImport} onClose={onClose}/>);
   const file=new File(['date,stops,gross\n2026-09-14,120,200'],'old.csv',{type:'text/csv'});
   Object.defineProperty(file,'text',{value:async()=> 'date,stops,gross\n2026-09-14,120,200'});
   fireEvent.change(screen.getByLabelText('Choose previous work CSV'),{target:{files:[file]}});
   expect(await screen.findByText(/dates already exist/)).toBeInTheDocument();
   expect(screen.queryByRole('button',{name:/Import 1 workdays/})).toBeDisabled();
   expect(onImport).not.toHaveBeenCalled();
 });
 it('imports only after the driver confirms provenance and previews values',async()=>{
   const onImport=vi.fn().mockResolvedValue(),onClose=vi.fn();
   render(<PreviousWorkImport existing={[]} onImport={onImport} onClose={onClose}/>);
   const file=new File(['fake'],'work.csv',{type:'text/csv'});
   Object.defineProperty(file,'text',{value:async()=> 'date,stops,gross\n2026-09-14,120,200'});
   fireEvent.change(screen.getByLabelText('Choose previous work CSV'),{target:{files:[file]}});
   const button=await screen.findByRole('button',{name:'Import 1 workdays'});
   expect(button).toBeDisabled();
   fireEvent.click(screen.getByRole('checkbox'));
   expect(button).toBeEnabled();
   fireEvent.click(button);
   await waitFor(()=>expect(onImport).toHaveBeenCalledOnce());
   expect(onImport.mock.calls[0][0][0].total).toBe(200);
   expect(onClose).toHaveBeenCalled();
 });
});