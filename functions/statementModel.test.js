const {test}=require('node:test');const assert=require('node:assert/strict');const {normalizeStatement}=require('./statementModel');
test('does not substitute gross for missing payout or coerce absent fields to zero',()=>{const r=normalizeStatement({statementAmount:5500,statementStops:null});assert.equal(r.contractorPayout,null);assert.equal(r.statementStops,null);assert.equal(r.statementAmount,5500);});
test('only returns bounded structured fields; no names, notes or addresses',()=>{const r=normalizeStatement({contractorPayout:4264.12,currency:'GBP',name:'secret',notes:['secret'],daily:[{date:'2026-02-30',amount:2},{date:'2026-08-17',stops:10,amount:20,address:'secret'}]});assert.equal(r.contractorPayout,4264.12);assert.equal(r.daily.length,1);assert.equal(JSON.stringify(r).includes('secret'),false);});
test('rejects invalid numeric types and preserves negative payouts',()=>{assert.equal(normalizeStatement({contractorPayout:'100'}).contractorPayout,null);assert.equal(normalizeStatement({contractorPayout:-10.25}).contractorPayout,-10.25);});

test('keeps only generic charge labels and explicit VAT basis',()=>{const r=normalizeStatement({taxBasis:'guessed',charges:[{label:'Private Person',amount:525},{label:'Lease',amount:525}]});assert.equal(r.taxBasis,'unknown');assert.deepEqual(r.charges,[{label:'other',amount:525},{label:'lease',amount:525}]);});

test('handles malformed charge labels without throwing',()=>{assert.deepEqual(normalizeStatement({charges:[{label:123,amount:null},null]}).charges,[{label:'other',amount:null},{label:'other',amount:null}]);});
