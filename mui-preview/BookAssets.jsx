import React, { useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Add, DeleteOutline, MenuBookOutlined, UploadOutlined } from '@mui/icons-material';
import { writeApi } from './lib/write-api';
import { addStoreListingRequest, bookFileError, canChangeCover, canChangeFile, canManagePublished, coverError, MAX_PRODUCT_URL, MAX_STORE_NAME, removeCoverRequest, removeFileRequest, removeStoreListingRequest, revisionLabel, revisionRequest, storeListingError, uploadBookFile, uploadCover } from './lib/book-assets';
import { ConfirmDialog } from './UserAssets';

const send = request => writeApi(request.path, request.method, request.body, request.options);
const fileNameOf = url => { try { return decodeURIComponent(String(url).split('#')[0].split('?')[0].split('/').pop()); } catch { return 'Book file'; } };

// One file picker with its own save and cancel: the chosen file is only sent when "Upload" is pressed.
function FilePick({ label, accept, file, setFile, disabled, check }) {
  const problem = file ? check(file) : null;
  return <Stack spacing={1}>
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Button component="label" variant="outlined" startIcon={<UploadOutlined />} disabled={disabled}>{label}<input hidden type="file" accept={accept} onChange={event => { setFile(event.target.files?.[0] || null); event.target.value = ''; }} /></Button>
      {file && <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{file.name}</Typography>}
    </Stack>
    {problem && <Alert severity="warning">{problem}</Alert>}
  </Stack>;
}

// Cover image (until the book is archived) and the EPUB file (only while the book is a draft), as in the old admin.
export function BookCoverAndFile({ groupId, book, editable, onChanged }) {
  const [cover, setCover] = useState(null), [epub, setEpub] = useState(null), [busy, setBusy] = useState(null), [error, setError] = useState(null), [confirm, setConfirm] = useState(null);
  const coverOpen = editable && canChangeCover(book), fileOpen = editable && canChangeFile(book);
  async function run(name, work, done) {
    setBusy(name); setError(null);
    try { await work(); onChanged(done); return true; } catch (e) { setError(e.message); return false; } finally { setBusy(null); }
  }
  const saveCover = async () => { if (await run('cover', () => uploadCover(groupId, book.id, cover), 'Cover saved.')) setCover(null); };
  const saveFile = async () => { if (await run('file', () => uploadBookFile(groupId, book.id, epub), 'Book file uploaded.')) setEpub(null); };
  return <Stack spacing={3}>
    {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
    <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
      <Typography variant="h6" component="h2">Cover</Typography>
      <Avatar variant="rounded" src={book.coverUrl || undefined} sx={{ width: 120, height: 150 }}><MenuBookOutlined sx={{ fontSize: 40 }} /></Avatar>
      {!coverOpen && <Typography variant="body2" color="text.secondary">{!editable ? 'The cover can only be changed where this environment allows book changes.' : 'An archived book keeps its cover.'}</Typography>}
      {coverOpen && <>
        <FilePick label="Choose image" accept="image/*" file={cover} setFile={setCover} disabled={busy !== null} check={coverError} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="contained" disabled={busy !== null || !cover || Boolean(coverError(cover))} onClick={saveCover}>{busy === 'cover' ? 'Uploading…' : 'Upload cover'}</Button>
          <Button disabled={busy !== null || !cover} onClick={() => setCover(null)}>Cancel selection</Button>
          <Button color="error" startIcon={<DeleteOutline />} disabled={busy !== null || !book.coverUrl} onClick={() => setConfirm({ title: 'Remove the cover?', body: 'The book will show the default cover again.', label: 'Remove', run: () => send(removeCoverRequest(groupId, book.id)), done: 'Cover removed.' })}>Remove cover</Button>
        </Stack>
      </>}
    </Stack></Paper>
    <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
      <Typography variant="h6" component="h2">Book file</Typography>
      <Typography>{book.fileUrl ? <>Current file: <a href={book.fileUrl} target="_blank" rel="noreferrer">{fileNameOf(book.fileUrl)}</a></> : 'No file has been uploaded yet.'}</Typography>
      {!fileOpen && <Typography variant="body2" color="text.secondary">{!editable ? 'The file can only be changed where this environment allows book changes.' : 'The file can only be changed while the book is a draft.'}</Typography>}
      {fileOpen && <>
        <Typography variant="body2" color="text.secondary">EPUB files only. Uploading a new file replaces the current one.</Typography>
        <FilePick label="Choose EPUB file" accept=".epub" file={epub} setFile={setEpub} disabled={busy !== null} check={bookFileError} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="contained" disabled={busy !== null || !epub || Boolean(bookFileError(epub))} onClick={saveFile}>{busy === 'file' ? 'Uploading…' : 'Upload file'}</Button>
          <Button disabled={busy !== null || !epub} onClick={() => setEpub(null)}>Cancel selection</Button>
          <Button color="error" startIcon={<DeleteOutline />} disabled={busy !== null || !book.fileUrl} onClick={() => setConfirm({ title: 'Remove the book file?', body: 'Readers will not be able to open this book until a new file is uploaded.', label: 'Remove', run: () => send(removeFileRequest(groupId, book.id)), done: 'Book file removed.' })}>Remove file</Button>
        </Stack>
      </>}
    </Stack></Paper>
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.title} confirmLabel={confirm?.label} onClose={() => setConfirm(null)} onConfirm={() => confirm.run()} onDone={() => { const done = confirm.done; setConfirm(null); onChanged(done); }}>{confirm?.body}</ConfirmDialog>
  </Stack>;
}

function StoreListingDialog({ open, groupId, bookId, onClose, onAdded }) {
  const blank = { storeName: '', productUrl: '' };
  const [values, setValues] = useState(blank), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const problem = storeListingError(values);
  React.useEffect(() => { if (open) { setValues(blank); setBusy(false); setError(null); } }, [open]);
  async function save() {
    setBusy(true); setError(null);
    try { await send(addStoreListingRequest(groupId, bookId, values)); onAdded(); } catch (e) { setError(e.message); setBusy(false); }
  }
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm">
    <DialogTitle>Add a store listing</DialogTitle>
    <DialogContent><Stack component="fieldset" disabled={busy} spacing={2} sx={{ border: 0, m: 0, p: 0, pt: 1, minWidth: 0 }}>
      <TextField required autoFocus label="Store" value={values.storeName} onChange={event => setValues(current => ({ ...current, storeName: event.target.value }))} slotProps={{ htmlInput: { maxLength: MAX_STORE_NAME } }} />
      <TextField required type="url" label="Link to the book in the store" value={values.productUrl} onChange={event => setValues(current => ({ ...current, productUrl: event.target.value }))} slotProps={{ htmlInput: { maxLength: MAX_PRODUCT_URL } }} />
      {error && <Alert severity="error">{error}</Alert>}
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || Boolean(problem)} onClick={save}>{busy ? 'Saving…' : 'Add listing'}</Button></DialogActions>
  </Dialog>;
}

// Revision status and store listings: published books, system administrators only (as in the old admin).
export function BookPublishing({ groupId, book, editable, isSystemAdmin, onChanged }) {
  const [adding, setAdding] = useState(false), [confirm, setConfirm] = useState(null);
  const allowed = canManagePublished(book, isSystemAdmin), revised = book.revisionStatus === 'Revised', listings = Array.isArray(book.externalProductLocations) ? book.externalProductLocations : [];
  const change = editable && allowed;
  return <Stack spacing={3}>
    {!allowed && <Alert severity="info">Revision and store listings are managed by system administrators, on published books.</Alert>}
    <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
      <Typography variant="h6" component="h2">Revision</Typography>
      <Stack direction="row" spacing={1} alignItems="center"><Typography>Status:</Typography><Chip size="small" variant="outlined" color={revised ? 'success' : 'default'} label={revisionLabel(book.revisionStatus)} /></Stack>
      <Typography variant="body2" color="text.secondary">Readers see a book in the store only after it is published and marked as revised.</Typography>
      {change && <Box><Button variant="outlined" onClick={() => setConfirm({ title: revised ? 'Mark as not revised?' : 'Mark as revised?', body: revised ? `${book.name} will no longer be treated as revised.` : `${book.name} will be treated as revised.`, label: revised ? 'Mark as not revised' : 'Mark as revised', color: 'primary', run: () => send(revisionRequest(groupId, book.id, !revised)), done: revised ? 'Marked as not revised.' : 'Marked as revised.' })}>{revised ? 'Mark as not revised' : 'Mark as revised'}</Button></Box>}
    </Stack></Paper>
    <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6" component="h2">Store listings</Typography>{change && <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Add listing</Button>}</Stack>
      <TableContainer><Table size="small" aria-label="Store listings">
        <TableHead><TableRow><TableCell>Store</TableCell><TableCell>Link</TableCell>{change && <TableCell align="right">Actions</TableCell>}</TableRow></TableHead>
        <TableBody>
          {!listings.length ? <TableRow><TableCell colSpan={change ? 3 : 2}><Typography color="text.secondary" sx={{ py: 1 }}>No store listings.</Typography></TableCell></TableRow>
            : listings.map(row => <TableRow key={row.id ?? row.productUrl} hover>
              <TableCell>{row.storeName || row.store || '—'}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.productUrl ? <a href={row.productUrl} target="_blank" rel="noreferrer">{row.productUrl}</a> : '—'}</TableCell>
              {change && <TableCell align="right"><Tooltip title="Remove this listing"><span><IconButton color="error" aria-label={`Remove the ${row.storeName || 'store'} listing`} disabled={!row.id} onClick={() => setConfirm({ title: 'Remove this store listing?', body: `The ${row.storeName || 'store'} listing will be removed from ${book.name}.`, label: 'Remove', run: () => send(removeStoreListingRequest(groupId, book.id, row.id)), done: 'Store listing removed.' })}><DeleteOutline fontSize="small" /></IconButton></span></Tooltip></TableCell>}
            </TableRow>)}
        </TableBody>
      </Table></TableContainer>
    </Stack></Paper>
    {change && <StoreListingDialog open={adding} groupId={groupId} bookId={book.id} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); onChanged('Store listing added.'); }} />}
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.title} confirmLabel={confirm?.label} color={confirm?.color || 'error'} onClose={() => setConfirm(null)} onConfirm={() => confirm.run()} onDone={() => { const done = confirm.done; setConfirm(null); onChanged(done); }}>{confirm?.body}</ConfirmDialog>
  </Stack>;
}
