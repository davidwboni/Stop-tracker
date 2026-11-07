// Read-only scope inference for OCR dates. A malformed header must never
// silently widen a comparison to include unrelated saved workdays.
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const lengthDays=(start,end)=>(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
export function statementDateRange(statement){
 const {periodStart:start,periodEnd:end}=statement||{};
 if(!validDate(start)||!validDate(end)||start>end||lengthDays(start,end)>366)return null;
 return {start,end,id:start+'_'+end};
}
export function inferStatementPeriod(statement,periodOptions=[]){
 const raw=statementDateRange(statement);
 const daily=Array.isArray(statement?.daily)?statement.daily:[];
 const dates=[...new Set(daily.map(x=>x?.date).filter(validDate))].sort();
 const first=dates[0],last=dates[dates.length-1];
 const dense=dates.length>=5&&first&&last&&lengthDays(first,last)<=35;
 // Four-week statements commonly list zero-payment off-days; these are
 // relevant evidence for period boundaries, not logged work requirements.
 const suspicious=!!(dense&&raw&&(raw.start>first||raw.end<last||
   (lengthDays(raw.start,raw.end)>35&&raw.end>last&&lengthDays(last,raw.end)>5)));
 if(!suspicious) return {raw,suggested:raw,needsConfirmation:false,reason:'header',firstDay:first||null,lastDay:last||null};
 const suitable=(periodOptions||[]).filter(p=>{
   if(!validDate(p?.start)||!validDate(p?.end)||p.start>p.end||lengthDays(p.start,p.end)>35)return false;
   const inside=dates.filter(d=>d>=p.start&&d<=p.end).length;
   const firstNear=Math.abs(lengthDays(p.start,first)-1)<=2;
   const lastNear=last<=p.end&&lengthDays(last,p.end)<=4;
   return firstNear&&lastNear&&inside>=5&&inside/dates.length>=0.9;
 }).sort((a,b)=>{
   const aExact=(a.start===first?2:0)+(a.end===last?1:0);
   const bExact=(b.start===first?2:0)+(b.end===last?1:0);
   return bExact-aExact;
 });
 const candidate=suitable[0];
 // Only propose a range supported by the dated rows. If no saved payment
 // cycle matches, propose the observed dates, never a made-up 28-day end.
 const suggested=candidate?{start:candidate.start,end:candidate.end,id:candidate.start+'_'+candidate.end}:
    {start:first,end:last,id:first+'_'+last};
 return {raw,suggested,needsConfirmation:true,reason:'daily_dates_disagree',firstDay:first,lastDay:last};
}
