import {describe,it,expect} from 'vitest';
import {findStatementContentBounds} from '../features/statements/prepareImage';
import {describeStatementExtractionError} from '../features/statements/extractionError';
function sample(w,h,painter){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4, v=painter(x,y)?255:0;
  data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 return data;
}
describe('statement screenshot preparation',()=>{
 it('crops a full-width white pay statement out of a tall dark screenshot',()=>{
   const w=160,h=360,pixels=sample(w,h,(x,y)=>x>13&&x<148&&y>=120&&y<197);
   const crop=findStatementContentBounds(pixels,w,h);
   expect(crop).not.toBeNull();
   expect(crop.y).toBeGreaterThan(100);
   expect(crop.y+crop.height).toBeLessThan(220);
   expect(crop.x).toBeLessThanOrEqual(13);
   expect(crop.x+crop.width).toBeGreaterThanOrEqual(148);
 });
 it('does not trim a document that already fills the image',()=>{
   expect(findStatementContentBounds(sample(160,180,()=>true),160,180)).toBeNull();
 });
 it('does not crop isolated interface text or dark-themed evidence',()=>{
   expect(findStatementContentBounds(sample(160,240,(x,y)=>y%25<2&&x>30&&x<135),160,240)).toBeNull();
 });
 it('does not crop unreadably small or unsupported pixel inputs',()=>{
   expect(findStatementContentBounds(null,160,240)).toBeNull();
   expect(findStatementContentBounds(sample(24,24,()=>true),24,24)).toBeNull();
 });
});
describe('safe AI extraction error display',()=>{
 it('shows previously hidden DS-LENGTH with actionable original-PDF advice',()=>{
   const actual=describeStatementExtractionError({code:'functions/failed-precondition',message:'The AI response was cut off (DS-LENGTH). Try a cropped image.'});
   expect(actual).toMatch(/DS-LENGTH/);
   expect(actual).toMatch(/original PDF/);
   expect(actual).toMatch(/functions\/failed-precondition/);
 });
 it('shows provider billing code without logging arbitrary response details',()=>{
   const actual=describeStatementExtractionError({code:'functions/failed-precondition',message:'Statement AI billing or credit is unavailable (DS-402). Private bank details: secret'});
   expect(actual).toMatch(/DS-402/);
   expect(actual).not.toContain('Private bank');
   expect(actual).not.toContain('secret');
 });
 it('uses targeted message for no readable payout and hides arbitrary error contents',()=>{
   expect(describeStatementExtractionError({code:'functions/failed-precondition',message:'No usable statement totals were found.'})).toMatch(/clearly readable payout/);
   expect(describeStatementExtractionError({code:'functions/failed-precondition',message:'account=private-address'})).not.toContain('private-address');
 });
 it('preserves a retriable file and recognizes temporary limits',()=>{
   expect(describeStatementExtractionError({code:'functions/resource-exhausted'})).toMatch(/daily scan limit/);
   expect(describeStatementExtractionError({code:'functions/internal'})).toMatch(/Your file is still selected/);
 });
});