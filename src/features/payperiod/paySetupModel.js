import { calculateDayEarnings } from './payStructure';
import { pennies } from '../home/homeModel';
export const rateFields={flat_stops:'ratePerStop',per_day:'ratePerDay',hourly:'ratePerHour',per_mile:'ratePerMile'};
export const rateLabels={flat_stops:'Rate per stop',per_day:'Rate per day',hourly:'Rate per hour',per_mile:'Rate per mile'};
export const blankPay=model=>({model,contractorFeePercent:0,excessParcelRate:0,...(rateFields[model]?{[rateFields[model]]:''}:{}),...(model==='per_mile'?{baseFee:0}:{}),...(model==='tiered_stops'?{thresholds:[{stopCount:'',rate:''},{rate:''}]}:{}),...(model==='sliding_scale'?{stopBands:[''],mileBands:[''],rateMatrix:[['']]}:{})});
const numeric=v=>v!==''&&v!=null&&/^\d+(\.\d{1,4})?$/.test(String(v))&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=1000000;
const ascending=values=>values.length>0&&values.length<=20&&values.every((v,i)=>numeric(v)&&Number.isInteger(Number(v))&&(i===0||Number(v)>Number(values[i-1])));
export function validatePaySetup(config){
 if(!config)return 'Choose a pay method.';
 if(rateFields[config.model]&&!numeric(config[rateFields[config.model]]))return 'Enter a valid rate, with up to four decimal places.';
 if(config.model==='per_mile'&&!numeric(config.baseFee))return 'Enter a valid daily base payment, or 0.';
 if(!numeric(config.contractorFeePercent)||Number(config.contractorFeePercent)>100)return 'Confirm a contractor percentage between 0 and 100.';
 if(!numeric(config.excessParcelRate))return 'Enter a valid excess parcel rate, or turn it off.';
 if(config.model==='tiered_stops'){
  const tiers=config.thresholds;
  if(!Array.isArray(tiers)||tiers.length<2||tiers.length>20||!ascending(tiers.slice(0,-1).map(t=>t.stopCount))||Number(tiers[0].stopCount)<1||tiers.some(t=>!numeric(t.rate)))return 'Use increasing whole-stop tier limits and fill every rate.';
 }else if(config.model==='sliding_scale'){
  if(!Array.isArray(config.stopBands)||!Array.isArray(config.mileBands)||!ascending(config.stopBands)||!ascending(config.mileBands)||!Array.isArray(config.rateMatrix)||config.rateMatrix.length!==config.stopBands.length||config.rateMatrix.some(row=>!Array.isArray(row)||row.length!==config.mileBands.length||row.some(v=>!numeric(v))))return 'Use increasing whole-number bands and fill every grid rate.';
 }else if(!rateFields[config.model])return 'Choose a supported pay method.';
 return '';
}
export function cleanPaySetup(c){
 const error=validatePaySetup(c);if(error)throw new Error(error);
 const out={model:c.model,contractorFeePercent:Number(c.contractorFeePercent),excessParcelRate:Number(c.excessParcelRate)};
 if(rateFields[c.model])out[rateFields[c.model]]=Number(c[rateFields[c.model]]);
 if(c.model==='per_mile')out.baseFee=Number(c.baseFee);
 if(c.model==='tiered_stops')out.thresholds=c.thresholds.map((t,i)=>i===c.thresholds.length-1?{rate:Number(t.rate)}:{stopCount:Number(t.stopCount),rate:Number(t.rate)});
 if(c.model==='sliding_scale'){out.stopBands=c.stopBands.map(Number);out.mileBands=c.mileBands.map(Number);out.rateMatrix=c.rateMatrix.map(row=>row.map(Number));}
 return out;
}
export function payExample(c){
 if(validatePaySetup(c))return null;
 const quantity=({per_day:1,hourly:8,per_mile:80})[c.model]||120;
 const excess=['flat_stops','tiered_stops','sliding_scale'].includes(c.model)?38:0;
 const gross=pennies(calculateDayEarnings(cleanPaySetup(c),{quantity,miles:80}))+pennies(excess*Number(c.excessParcelRate));
 const fee=Math.round(gross*Number(c.contractorFeePercent)/100);
 return {quantity,excess,gross:gross/100,fee:fee/100,after:(gross-fee)/100};
}
