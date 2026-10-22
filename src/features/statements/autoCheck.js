// Independent, read-only statement-to-work reconciliation preview.
// AI figures are *unverified*. Never invent absent totals, dates or missing days.
const safePence=value=>typeof value==='number'&&Number.isFinite(value)&&Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):null;
const safeStops=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function buildStatementAutoCheck(statement,period,rows=[],days=[],expectedPence=null){
  const currencyOk=statement?.currency==='GBP';
  const periodOk=statement?.periodStart===period.start&&statement?.periodEnd===period.end;
  const rawPayout=safePence(statement?.contractorPayout);
  const vat=safePence(statement?.vatAmount);
  const printedNet=safePence(statement?.beforeVatPayout);
  let payoutBeforeVat=null,vatSource='unknown';
  if(currencyOk&&rawPayout!=null){
    if(['excluded','not_applicable'].includes(statement.taxBasis)){
      payoutBeforeVat=rawPayout;vatSource='before_vat';
    }else if(statement.taxBasis==='included'){
      // Only use amounts actually extracted from the statement. Never apply
      // an assumed VAT rate, even if the driver is in the UK.
      if(printedNet!=null&&printedNet>=0&&printedNet<=rawPayout&&
        (vat==null||rawPayout-printedNet===vat)){
        payoutBeforeVat=printedNet;vatSource='printed_net';
      }else if(vat!=null&&vat>0&&vat<rawPayout){
        payoutBeforeVat=rawPayout-vat;vatSource='printed_vat';
      }
    }
  }
  const entries=new Map();
  for(let i=0;i<rows.length;i++){
    const r=rows[i], day=days[i];
    if(!r?.date||r.date<period.start||r.date>period.end)continue;
    if(!entries.has(r.date))entries.set(r.date,{date:r.date,loggedStops:0,grossPence:0,hasGross:true});
    const e=entries.get(r.date);
    const count=r.stops==null||r.stops===''?null:safeStops(Number(r.stops));
    if(count==null)e.loggedStops=null;
    else if(e.loggedStops!=null)e.loggedStops+=count;
    const gross=day&&!day.unavailable?safePence(day.gross):null;
    if(gross==null)e.hasGross=false;else e.grossPence+=gross;
  }
  const statementRows=new Map();
  let outsidePeriod=0;
  for(const item of Array.isArray(statement?.daily)?statement.daily:[]){
    if(!item?.date)continue;
    if(item.date<period.start||item.date>period.end){outsidePeriod++;continue;}
    if(!statementRows.has(item.date))statementRows.set(item.date,[]);
    statementRows.get(item.date).push(item);
  }
  const hasDaily=Array.isArray(statement?.daily)&&statement.daily.length>0;
  const dayRows=[];
  if(hasDaily&&currencyOk&&periodOk){
    const dates=new Set([...entries.keys(),...statementRows.keys()]);
    for(const date of [...dates].sort()){
      const own=entries.get(date),listed=statementRows.get(date)||[];
      const item=listed[0];
      const theirsStops=listed.length===1?safeStops(item.stops):null;
      const theirsGross=listed.length===1?safePence(item.amount):null;
      const oursGross=own?.hasGross?own.grossPence:null;
      const mismatch=listed.length>1||!own||listed.length===0||
        (theirsStops!=null&&own.loggedStops!=null&&theirsStops!==own.loggedStops)||
        (theirsGross!=null&&oursGross!=null&&theirsGross!==oursGross);
      const compared=(theirsStops!=null&&own?.loggedStops!=null)||(theirsGross!=null&&oursGross!=null);
      const status=mismatch?'review':compared?'match':'unknown';
      dayRows.push({date,status,reason:listed.length>1?'Duplicate dates on statement':!own?'Not logged in Stop Tracker':listed.length===0?'No statement row for logged day':status==='unknown'?'Insufficient daily figures':null,loggedStops:own?.loggedStops??null,statementStops:theirsStops,loggedGross:oursGross,statementGross:theirsGross});
    }
  }
  const flagged=dayRows.filter(r=>r.status==='review');
  const matched=dayRows.filter(r=>r.status==='match');
  const unknown=dayRows.filter(r=>r.status==='unknown');
  const canCompare=currencyOk&&periodOk&&payoutBeforeVat!=null&&Number.isSafeInteger(expectedPence);
  return {currencyOk,periodOk,rawPayout,vat,printedNet,payoutBeforeVat,vatSource,
    expectedPence:Number.isSafeInteger(expectedPence)?expectedPence:null,
    difference:canCompare?payoutBeforeVat-expectedPence:null,canCompare,hasDaily,
    flagged,matched,unknown,dayRows,outsidePeriod,
    summaryOnly:statement?.extractionMode==='summary_only'};
}
