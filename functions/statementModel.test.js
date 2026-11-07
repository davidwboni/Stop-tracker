const {test}=require('node:test');const assert=require('node:assert/strict');const {normalizeStatement}=require('./statementModel');
test('does not substitute gross for missing payout or coerce absent fields to zero',()=>{const r=normalizeStatement({statementAmount:5500,statementStops:null});assert.equal(r.contractorPayout,null);assert.equal(r.statementStops,null);assert.equal(r.statementAmount,5500);});
test('only returns bounded structured fields; no names, notes or addresses',()=>{const r=normalizeStatement({contractorPayout:4264.12,currency:'GBP',name:'secret',notes:['secret'],daily:[{date:'2026-02-30',amount:2},{date:'2026-08-17',stops:10,amount:20,address:'secret'}]});assert.equal(r.contractorPayout,4264.12);assert.equal(r.daily.length,1);assert.equal(JSON.stringify(r).includes('secret'),false);});
test('rejects invalid numeric types and preserves negative payouts',()=>{assert.equal(normalizeStatement({contractorPayout:'100'}).contractorPayout,null);assert.equal(normalizeStatement({contractorPayout:-10.25}).contractorPayout,-10.25);});

test('keeps only generic charge labels and explicit VAT basis',()=>{const r=normalizeStatement({taxBasis:'guessed',charges:[{label:'Private Person',amount:525},{label:'Lease',amount:525}]});assert.equal(r.taxBasis,'unknown');assert.deepEqual(r.charges,[{label:'other',amount:525},{label:'lease',amount:525}]);});

test('handles malformed charge labels without throwing',()=>{assert.deepEqual(normalizeStatement({charges:[{label:123,amount:null},null]}).charges,[{label:'other',amount:null},{label:'other',amount:null}]);});

test('preserves explicit printed VAT and before-VAT payout separately without guessing',()=>{
 const extracted=normalizeStatement({currency:'GBP',taxBasis:'included',contractorPayout:4421.63,vatAmount:736.94,beforeVatPayout:3684.69});
 assert.equal(extracted.contractorPayout,4421.63);
 assert.equal(extracted.vatAmount,736.94);
 assert.equal(extracted.beforeVatPayout,3684.69);
 const unknown=normalizeStatement({taxBasis:'included',contractorPayout:4421.63});
 assert.equal(unknown.vatAmount,null);
 assert.equal(unknown.beforeVatPayout,null);
});

test('extracts generic extra payments including post-period payment dates without exposing payee details',()=>{
 const source={
   periodStart:'2026-09-14',periodEnd:'2026-10-11',
   deliverySubtotal:1200.35,extraPaymentsTotal:70.20,
   extraPayments:[
     {date:'2026-09-17',reason:'Route cover',amount:30,person:'PRIVATE_NAME',bankAccount:'PRIVATE_BANK'},
     {date:'2026-10-16',reason:'Fuel Supplement',amount:40.20,person:'PRIVATE_NAME'}
   ],
   note:'PRIVATE_NOTE'
 };
 const result=normalizeStatement(source);
 assert.equal(result.deliverySubtotal,1200.35);
 assert.equal(result.extraPaymentsTotal,70.20);
 assert.deepEqual(result.extraPayments,[
   {date:'2026-09-17',category:'route_cover',amount:30},
   {date:'2026-10-16',category:'fuel_supplement',amount:40.20}
 ]);
 assert.equal(JSON.stringify(result).includes('PRIVATE_'),false);
});
test('does not convert absent extra payments into zero and rejects malformed entries',()=>{
 const result=normalizeStatement({extraPaymentsTotal:'70.20',extraPayments:[
   {date:'2026-09-17',category:'Other Driver',amount:'30'},
   {date:'2026-09-17',category:'Other Driver',amount:30},
   {date:'2026-02-30',category:'collection',amount:20}
 ]});
 assert.equal(result.extraPaymentsTotal,null);
 assert.deepEqual(result.extraPayments,[
   {date:'2026-09-17',category:'other',amount:30},
   {date:null,category:'collection',amount:20}
 ]);
});
