import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const css=readFileSync(resolve(process.cwd(),'src/index.css'),'utf8');
const home=readFileSync(resolve(process.cwd(),'src/styles/home.css'),'utf8');
const dark=css.slice(css.indexOf('  .dark {'));
function color(block,key){
 const m=block.match(new RegExp('--'+key+':\\s*(#[a-f0-9]{6})\\s*;','i'));
 if(!m)throw new Error('Missing color token '+key);
 return m[1];
}
function luminance(hex){
 const v=[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)/255)
  .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
 return .2126*v[0]+.7152*v[1]+.0722*v[2];
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
describe('V5 brand contrast on mobile and desktop themes',()=>{
 it('keeps readable text on filled primary buttons in dark mode',()=>{
   expect(contrast(color(dark,'primary'),color(dark,'primary-foreground'))).toBeGreaterThanOrEqual(4.5);
   expect(contrast(color(dark,'primary'),color(dark,'card'))).toBeGreaterThanOrEqual(4.5);
 });
 it('keeps the same accessible primary action in light mode',()=>{
   const light=css.slice(css.indexOf('  :root {'),css.indexOf('  .dark {'));
   expect(contrast(color(light,'primary'),color(light,'primary-foreground'))).toBeGreaterThanOrEqual(4.5);
   expect(contrast(color(light,'muted-foreground'),color(light,'card'))).toBeGreaterThanOrEqual(4.5);
 });
 it('keeps the established solid purple home CTA readable',()=>{
   const fill=(home.match(/\\.home-primary[^}]+background:(#[0-9a-f]{6})/i)||[])[1];
   expect(fill).toBeTruthy();
   expect(contrast(fill,'#ffffff')).toBeGreaterThanOrEqual(4.5);
 });
});
