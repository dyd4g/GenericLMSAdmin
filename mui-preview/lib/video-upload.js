import * as tus from 'tus-js-client';
import { BlockBlobClient } from '@azure/storage-blob';

const MB = 1024 * 1024;
// Same block sizes as the old admin: small blocks for small files, bigger blocks as files grow.
export const azureBlockSize = size => size <= 4 * MB ? 256 * 1024 : size <= 32 * MB ? MB : size <= 256 * MB ? 4 * MB : 8 * MB;
export const knownProviders = ['AzureBlobStorage', 'Vimeo'];

// Each handler starts an upload to the URL the server returned and resolves to a function that cancels it.
async function azureUpload(uploadUrl, file, { onProgress, onError, onSuccess }) {
  const abort = new AbortController();
  new BlockBlobClient(uploadUrl).uploadData(file, {
    abortSignal: abort.signal,
    blockSize: azureBlockSize(file.size),
    maxSingleShotSize: 8 * MB,
    concurrency: 1,
    onProgress: p => onProgress(Math.min(100, (p.loadedBytes / file.size) * 100)),
  }).then(onSuccess, e => { if (!abort.signal.aborted) onError(e instanceof Error ? e : new Error('Azure upload failed')); });
  return async () => abort.abort();
}

async function vimeoUpload(uploadUrl, file, { onProgress, onError, onSuccess }) {
  const upload = new tus.Upload(file, {
    uploadUrl,
    storeFingerprintForResuming: false, // never resume an old attempt by accident
    onShouldRetry: error => ![400, 401, 403].includes(error?.originalResponse?.getStatus?.() || 0),
    onError,
    onProgress: (sent, total) => onProgress(sent === total ? 100 : Math.floor((sent / total) * 100)),
    onSuccess,
  });
  upload.start();
  return async () => { try { await upload.abort(true); } catch { /* already stopped */ } };
}

const handlers = { AzureBlobStorage: azureUpload, Vimeo: vimeoUpload };
export function uploadHandlerFor(provider) {
  if (!knownProviders.includes(provider)) throw new Error(`This environment returned an unsupported upload provider (${provider}).`);
  return handlers[provider];
}
export const startUpload = (provider, uploadUrl, file, callbacks) => uploadHandlerFor(provider)(uploadUrl, file, callbacks);
