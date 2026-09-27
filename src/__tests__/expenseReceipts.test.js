import {describe,it,expect,vi,beforeEach} from 'vitest';
import { validateReceipt, retainReceipt, readReceipt } from '../services/expenseReceipts';
const fixture=vi.hoisted(()=>({upload:vi.fn(),read:vi.fn()}));
vi.mock('../services/firebase',()=>({storage:{},functions:{}}));
vi.mock('firebase/storage',()=>({ref:(_,path)=>path,uploadBytes:fixture.upload,getBlob:fixture.read,deleteObject:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
describe('Receipt storage boundaries',()=>{
 it('rejects oversized and unsupported files before upload',async()=>{
  expect(()=>validateReceipt({type:'text/html',size:10})).toThrow('JPEG');
  await expect(retainReceipt('owner','expense',{type:'application/pdf',size:9*1024*1024},false)).rejects.toThrow('8 MB');
  expect(fixture.upload).not.toHaveBeenCalled();
 });
 it('returns private metadata without a filename or public URL',async()=>{
  const receipt=await retainReceipt('owner','expense',new File(['abc'],'sensitive-name.png',{type:'image/png'}),false);
  expect(receipt.path).toMatch(/^users\/owner\/receipts\/expense\//);
  expect(Object.keys(receipt).sort()).toEqual(['local','path','type']);
 });
 it('refuses cross-user receipt paths before fetching',async()=>{
  await expect(readReceipt('other',{path:'users/owner/receipts/e/file'})).rejects.toThrow('unavailable');
  expect(fixture.read).not.toHaveBeenCalled();
 });
});
