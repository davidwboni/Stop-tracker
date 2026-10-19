import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const storage=readFileSync(resolve(process.cwd(),'storage.rules'),'utf8');
const android=readFileSync(resolve(process.cwd(),'android/app/src/main/AndroidManifest.xml'),'utf8');
const transfer=readFileSync(resolve(process.cwd(),'android/app/src/main/res/xml/data_extraction_rules.xml'),'utf8');

describe('Mobile and storage policy source gates',()=>{
 it('has no broad owner-write wildcard bypassing receipt/profile limits',()=>{
  expect(storage).not.toMatch(/allow read, write: if owner\(uid\)/);
  expect(storage).toMatch(/match \/users\/\{uid\}\/\{folder\}\/\{rest=\*\*\}/);
  expect(storage).toMatch(/allow write: if false;/);
 });
 it('limits receipt and profile uploads by content type, size and permanent account',()=>{
  expect(storage).toContain('8 * 1024 * 1024');
  expect(storage).toContain('2 * 1024 * 1024');
  expect(storage).toContain("firebase.sign_in_provider != 'anonymous'");
  expect(storage).toContain("image/(jpeg|png|webp)");
 });
 it('opts financial guest data out of Android backup and device transfer',()=>{
  expect(android).toContain('android:allowBackup="false"');
  expect(android).toContain('@xml/data_extraction_rules');
  expect(transfer).toContain('<cloud-backup>');
  expect(transfer).toContain('<device-transfer>');
 });
});
