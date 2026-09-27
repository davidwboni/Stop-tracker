import { openDB } from 'idb';
import { ref, uploadBytes, getBlob, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from './firebase';

export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export function validateReceipt(file) {
  if (!file || !RECEIPT_TYPES.includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP or PDF receipt. Convert HEIC photos to JPEG first.');
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error('Choose a receipt smaller than 8 MB.');
}
const localDB = () => openDB('stop-tracker-receipts', 1, { upgrade(db) { db.createObjectStore('receipts'); } });
const owned = (uid, receipt) => receipt?.path?.startsWith(`users/${uid}/receipts/`) && !receipt.path.includes('..');
export async function retainReceipt(uid, expenseId, file, isGuest) {
  validateReceipt(file);
  if (!uid || !expenseId || [uid,expenseId].some(value => typeof value !== 'string' || value.includes('/') || value.includes('..'))) throw new Error('Your account or expense is unavailable.');
  const path = `users/${uid}/receipts/${expenseId}/${crypto.randomUUID()}`;
  if (isGuest) { const db = await localDB(); await db.put('receipts', file, path); }
  else await uploadBytes(ref(storage, path), file, { contentType: file.type, cacheControl: 'private, no-store' });
  return { path, type: file.type, local: !!isGuest }; // No public download URL or original filename.
}
export async function removeReceipt(uid, receipt) {
  if (!owned(uid, receipt)) return;
  if (receipt.local) { const db = await localDB(); await db.delete('receipts', receipt.path); }
  else { try { await deleteObject(ref(storage, receipt.path)); } catch (error) { if (error.code !== 'storage/object-not-found') throw error; } }
}
export async function readReceipt(uid, receipt) {
  if (!owned(uid, receipt)) throw new Error('Receipt unavailable.');
  const blob = receipt.local ? await (await localDB()).get('receipts', receipt.path) : await getBlob(ref(storage, receipt.path), 8 * 1024 * 1024);
  if (!blob) throw new Error('Receipt unavailable on this device.');
  return blob;
}
export const getReceiptStatus = async () => (await httpsCallable(functions, 'getReceiptStatus')()).data;
const base64 = blob => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read this receipt.'));
  reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob);
});
export async function extractReceipt(file) {
  validateReceipt(file);
  const images = [];
  if (file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist/webpack');
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 4) throw new Error('Choose a receipt with up to 4 pages. No pages have been processed.');
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.5, 1800 / Math.max(original.width, original.height)) });
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        try {
          const context = canvas.getContext('2d', { alpha: false });
          if (!context) throw new Error('Could not prepare this PDF. Use a photo or enter it manually.');
          context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .85));
          if (!blob) throw new Error('Could not read this PDF page.');
          images.push({ mimeType: 'image/jpeg', fileBase64: await base64(blob) });
        } finally { page.cleanup(); canvas.width = 1; canvas.height = 1; }
      }
    } finally { await task.destroy(); }
  } else images.push({ mimeType: file.type, fileBase64: await base64(file) });
  if (images.reduce((sum, image) => sum + image.fileBase64.length, 0) > 12_000_000) throw new Error('This receipt is too large to scan. Choose a smaller file.');
  return (await httpsCallable(functions, 'extractExpenseReceipt', { timeout: 100000 })({ images })).data;
}
