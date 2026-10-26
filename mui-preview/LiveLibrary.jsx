import React, { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, List, ListItem, ListItemButton, ListItemText, MenuItem, Paper, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import { Add, ArrowBack, ArrowDownward, ArrowUpward, DeleteOutline, EditOutlined, MenuBookOutlined, Refresh, Search } from '@mui/icons-material';
import DOMPurify from 'dompurify';
import RichContentEditor from './RichContentEditor';
import { ConfirmDialog } from './UserAssets';
import KeyManager from './KeyManager';
import { BookCoverAndFile, BookPublishing } from './BookAssets';
import { isSystemAdmin } from './lib/admin-auth';
import { bookKeysUrl, bookReadersUrl, bookUrl, canWrite, canWriteUsers, certificationCourseCandidatesUrl, certificationTraineesUrl, certificationUrl, connection, writeBlockedMessage, groupBooksUrl, groupCertificationsUrl, groupsUrl, loginUrl, readApi, SessionError } from './lib/read-api';
import { addCertificationCourseRequest, bookFormError, bookStatusRequest, certificationFormError, certificationPrivacy, certificationPublishError, certificationStatusRequest, createBookRequest, createCertificationRequest, deleteBookRequest, deleteCertificationRequest, removeCertificationCourseRequest, reorderCertificationCourseRequest, updateBookRequest, updateCertificationRequest, writeApi } from './lib/write-api';
import { userLanguageLabels } from './lib/user-lists';

const date = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
const rowsOf = data => (Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
const countOf = data => (Number.isFinite(data?.resultsCount) ? data.resultsCount : rowsOf(data).length);
const language = code => userLanguageLabels[code] || code || '—';
const percent = value => (Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—');
const statusColor = s => (s === 'Published' ? 'success' : s === 'Archived' ? 'default' : 'warning');
const bookStatuses = ['Draft', 'Published', 'Archived'];
const send = request => writeApi(request.path, request.method, request.body, request.options || { groupId: request.groupId });

// One dialog shell for every create and edit form here.
function FormDialog({ open, title, onClose, onSave, disabled, children, wide }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { if (open) { setBusy(false); setError(null); } }, [open]);
  async function save() { setBusy(true); setError(null); try { await onSave(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth={wide ? 'md' : 'sm'}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent><Stack component="fieldset" disabled={busy} spacing={2} sx={{ border: 0, m: 0, p: 0, pt: 1, minWidth: 0 }}>{children}{error && <Alert severity="error">{error}</Alert>}</Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || disabled} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button></DialogActions>
  </Dialog>;
}
function LanguageField({ value, onChange }) {
  return <TextField select label="Language" value={value || ''} onChange={e => onChange(e.target.value)}>{connection.languages.map(l => <MenuItem key={l} value={l}>{language(l)}</MenuItem>)}</TextField>;
}

function BookFormDialog({ open, groupId, book, onClose, onSaved }) {
  const blank = { name: '', author: '', language: connection.languages[0] || '', description: '', body: '' };
  const [v, setV] = useState(blank);
  useEffect(() => { if (open) setV(book ? { name: book.name || '', author: book.author || '', language: book.language || '', description: book.description || '', body: book.body || '' } : blank); }, [open, book]);
  const set = (k, x) => setV(p => ({ ...p, [k]: x }));
  return <FormDialog open={open} wide title={book ? 'Edit book' : 'New book'} onClose={onClose} disabled={!!bookFormError(v)} onSave={async () => { const r = book ? updateBookRequest(groupId, book.id, v, book) : createBookRequest(groupId, v); await send(r); onSaved(book ? 'Book updated.' : 'Book created.'); }}>
    <TextField required autoFocus label="Title" value={v.name} onChange={e => set('name', e.target.value)} />
    <TextField label="Author" value={v.author} onChange={e => set('author', e.target.value)} />
    <LanguageField value={v.language} onChange={x => set('language', x)} />
    <TextField multiline minRows={3} label="Description" value={v.description} onChange={e => set('description', e.target.value)} />
    <RichContentEditor label="Details" value={v.body} onChange={x => set('body', x)} />
  </FormDialog>;
}

function CertificationFormDialog({ open, groupId, certification, onClose, onSaved }) {
  const blank = { name: '', language: connection.languages[0] || '', description: '', certificateMessage: '', isGroupMembershipRequired: false, isEnrollmentApprovalRequired: false, privacyLevel: 'Public' };
  const [v, setV] = useState(blank);
  useEffect(() => { if (open) setV(certification ? { name: certification.name || '', language: certification.language || '', description: certification.description || '', certificateMessage: certification.certificateMessage || '', isGroupMembershipRequired: !!certification.isGroupMembershipRequired, isEnrollmentApprovalRequired: !!certification.isEnrollmentApprovalRequired, privacyLevel: certification.privacyLevel || 'Public' } : blank); }, [open, certification]);
  const set = (k, x) => setV(p => ({ ...p, [k]: x }));
  return <FormDialog open={open} title={certification ? 'Edit certification' : 'New certification'} onClose={onClose} disabled={!!certificationFormError(v)} onSave={async () => { const r = certification ? updateCertificationRequest(groupId, certification.id, v) : createCertificationRequest(groupId, v); const id = await send(r); onSaved(certification ? 'Certification updated.' : 'Certification created.', id); }}>
    <TextField required autoFocus label="Title" value={v.name} onChange={e => set('name', e.target.value)} helperText={`${v.name.length}/80`} />
    <LanguageField value={v.language} onChange={x => set('language', x)} />
    <TextField multiline minRows={3} label="Description" value={v.description} onChange={e => set('description', e.target.value)} helperText={`${v.description.length}/500`} />
    <TextField multiline minRows={3} label="Certificate message" value={v.certificateMessage} onChange={e => set('certificateMessage', e.target.value)} helperText={`${v.certificateMessage.length}/500`} />
    <FormControlLabel control={<Switch checked={v.isGroupMembershipRequired} onChange={(_, x) => set('isGroupMembershipRequired', x)} />} label="Group membership required" />
    <FormControlLabel control={<Switch checked={v.isEnrollmentApprovalRequired} onChange={(_, x) => set('isEnrollmentApprovalRequired', x)} />} label="Enrollment approval required" />
    <TextField select label="Privacy" value={v.privacyLevel} onChange={e => set('privacyLevel', e.target.value)}>{certificationPrivacy.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField>
  </FormDialog>;
}

// Courses that can still be added. The server accepts one at a time, so one is picked.
function CourseAddDialog({ open, certification, groupId, onClose, onAdded }) {
  const [search, setSearch] = useState(''), [picked, setPicked] = useState(null);
  const query = useDebounced(search.trim());
  useEffect(() => { if (open) { setSearch(''); setPicked(null); } }, [open]);
  const state = useRead(open ? certificationCourseCandidatesUrl(certification.id, { search: query }) : null);
  return <FormDialog open={open} title="Add a course" onClose={onClose} disabled={!picked} onSave={async () => { await send(addCertificationCourseRequest(groupId, certification.id, picked)); onAdded('Course added.'); }}>
    <TextField size="small" label="Search courses" value={search} onChange={e => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
    {state.error ? <Failure error={state.error} /> : state.loading ? <Loading /> :
      <List dense sx={{ maxHeight: 320, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
        {rowsOf(state.data).map(c => <ListItem key={c.id} disablePadding><ListItemButton selected={picked === c.id} onClick={() => setPicked(c.id)}><ListItemText primary={c.name || `Course ${c.id}`} secondary={c.status} /></ListItemButton></ListItem>)}
        {!rowsOf(state.data).length && <ListItem><ListItemText primary={query ? `No courses match "${query}".` : 'No courses can be added.'} /></ListItem>}
      </List>}
  </FormDialog>;
}

function Failure({ error, retry }) {
  const session = error instanceof SessionError;
  return <Alert severity={session ? 'warning' : 'error'} action={session ? <Button component="a" href={loginUrl()} color="inherit">Sign in</Button> : retry && <Button onClick={retry} color="inherit">Retry</Button>}>{error instanceof TypeError ? `Unable to reach ${connection.name}. Check your connection and retry.` : error.message}</Alert>;
}
function Loading() { return <Stack role="status" alignItems="center" sx={{ py: 6 }}><CircularProgress size={26} /><Typography sx={{ mt: 2 }}>Loading…</Typography></Stack>; }
function useRead(url, reload = 0) {
  const [state, setState] = useState({ loading: !!url, data: null, error: null });
  useEffect(() => {
    if (!url) { setState({ loading: false, data: null, error: null }); return; }
    const abort = new AbortController();
    setState(s => ({ loading: true, data: s.data, error: null }));
    readApi(url, abort.signal).then(data => setState({ loading: false, data, error: null })).catch(error => { if (error.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => abort.abort();
  }, [url, reload]);
  return state;
}
function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Books and certifications belong to a group, so the admin picks one of the groups they manage first.
function GroupPicker({ groupId, onChange }) {
  const state = useRead(groupsUrl(0, 100, ''));
  const groups = rowsOf(state.data);
  useEffect(() => { if (!groupId && groups.length) onChange(groups[0].id); }, [groups.length]);
  if (state.error) return <Failure error={state.error} />;
  return <TextField select size="small" label="Group" value={groups.some(g => g.id === groupId) ? groupId : ''} onChange={e => onChange(e.target.value)} sx={{ minWidth: 280 }} disabled={state.loading}>{groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}</TextField>;
}

function Facts({ items }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>{items.map(([label, value]) => <Box key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography component="div" sx={{ wordBreak: 'break-word' }}>{value ?? '—'}</Typography></Box>)}</Box>;
}
const Html = ({ html }) => (html ? <Box sx={{ '& img': { maxWidth: '100%' } }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} /> : <Typography color="text.secondary">—</Typography>);

function SimpleTable({ label, columns, rows, empty = 'Nothing to show.' }) {
  return <TableContainer component={Paper} variant="outlined"><Table size="small" aria-label={label}>
    <TableHead><TableRow>{columns.map(([h]) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
    <TableBody>{rows.map((r, i) => <TableRow key={r.id ?? i} hover>{columns.map(([h, f]) => <TableCell key={h}>{f(r)}</TableCell>)}</TableRow>)}
      {!rows.length && <TableRow><TableCell colSpan={columns.length}><Typography color="text.secondary">{empty}</Typography></TableCell></TableRow>}</TableBody>
  </Table></TableContainer>;
}

function PagedTable({ url, label, columns, empty }) {
  const [page, setPage] = useState(0);
  const state = useRead(url(page));
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <Failure error={state.error} />;
  const total = countOf(state.data);
  return <>
    <SimpleTable label={label} columns={columns} rows={rowsOf(state.data)} empty={empty} />
    {total > 10 && <TablePagination component="div" count={total} page={page} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />}
  </>;
}

// ---------------- Books ----------------
function BookDetail({ groupId, summary, onBack, onChanged, systemAdmin }) {
  const [tab, setTab] = useState('info'), [reload, setReload] = useState(0), [editing, setEditing] = useState(false), [confirm, setConfirm] = useState(null), [notice, setNotice] = useState(null);
  const editable = canWriteUsers();
  const state = useRead(bookUrl(groupId, summary.id), reload);
  const readers = useRead(tab === 'readers' ? bookReadersUrl(groupId, summary.id) : null);
  const b = state.data || summary;
  const assetChanged = message => { setNotice(message); setReload(v => v + 1); onChanged(); };
  return <>
    <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>Back to books</Button>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
      <Avatar variant="rounded" src={b.coverUrl || undefined} sx={{ width: 56, height: 72 }}><MenuBookOutlined /></Avatar>
      <Box><Typography variant="h4">{b.name}</Typography><Stack direction="row" spacing={1} alignItems="center"><Typography color="text.secondary">{b.author || 'No author'}</Typography>{b.publishStatus && <Chip size="small" color={statusColor(b.publishStatus)} variant="outlined" label={b.publishStatus} />}</Stack></Box>
      <Stack direction="row" spacing={1} sx={{ ml: 'auto !important' }}>
        <Button startIcon={<Refresh />} disabled={state.loading} onClick={() => setReload(v => v + 1)}>Refresh</Button>
        {editable && b.publishStatus !== 'Archived' && <Button startIcon={<EditOutlined />} disabled={!state.data} onClick={() => setEditing(true)}>Edit</Button>}
        {editable && b.publishStatus === 'Draft' && b.fileUrl && <Button variant="contained" onClick={() => setConfirm({ title: 'Publish this book?', body: `${b.name} will be published and readers can start using it.`, label: 'Publish', color: 'primary', run: () => send(bookStatusRequest(groupId, summary.id, 'Published')), done: 'Book published.' })}>Publish</Button>}
        {editable && b.publishStatus === 'Published' && <Button color="warning" onClick={() => setConfirm({ title: 'Archive this book?', body: `${b.name} will be archived.`, label: 'Archive', color: 'warning', run: () => send(bookStatusRequest(groupId, summary.id, 'Archived')), done: 'Book archived.' })}>Archive</Button>}
        {editable && <Button color="error" startIcon={<DeleteOutline />} onClick={() => setConfirm({ title: 'Delete this book?', body: `${b.name} will be permanently deleted.`, label: 'Delete', color: 'error', run: () => send(deleteBookRequest(groupId, summary.id)), done: 'Book deleted.', leave: true })}>Delete</Button>}
      </Stack>
    </Stack>
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
    {!editable && <Alert severity="info" sx={{ mb: 2 }}>Book changes are not available in {connection.name}, so this is read-only.</Alert>}
    {state.error && <Failure error={state.error} retry={() => setReload(v => v + 1)} />}
    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab value="info" label="Overview" /><Tab value="media" label="Cover and file" /><Tab value="publishing" label="Revision and stores" /><Tab value="readers" label="Readers" /><Tab value="keys" label="Keys" /></Tabs>
    {tab === 'info' && <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={3}>
      <Facts items={[['Language', language(b.language)], ['Group', b.group?.name], ['Publish status', b.publishStatus], ['Revision status', b.revisionStatus], ['Store', b.storeName || b.store], ['Product ID', b.productId], ['Book file', b.fileUrl ? <a href={b.fileUrl} target="_blank" rel="noreferrer">Open file</a> : 'None']]} />
      <Box><Typography variant="caption" color="text.secondary">Description</Typography><Html html={b.description} /></Box>
      {b.body && <Box><Typography variant="caption" color="text.secondary">Details</Typography><Html html={b.body} /></Box>}
    </Stack></Paper>}
    {tab === 'readers' && (readers.loading ? <Loading /> : readers.error ? <Failure error={readers.error} /> : <SimpleTable label="Book readers" columns={[['Reader', r => r.name || '—'], ['Redeemed', r => date(r.redeemedDate)]]} rows={rowsOf(readers.data)} empty="Nobody has redeemed this book yet." />)}
    {editable && <BookFormDialog open={editing} groupId={groupId} book={state.data} onClose={() => setEditing(false)} onSaved={m => { setEditing(false); setNotice(m); setReload(v => v + 1); onChanged(); }} />}
    <ConfirmDialog open={!!confirm} title={confirm?.title} confirmLabel={confirm?.label} color={confirm?.color} onClose={() => setConfirm(null)} onConfirm={() => confirm.run()} onDone={() => { const c = confirm; setConfirm(null); onChanged(c.done); if (c.leave) onBack(); else { setNotice(c.done); setReload(v => v + 1); } }}>{confirm?.body}</ConfirmDialog>
    {tab === 'media' && state.data && <BookCoverAndFile key={summary.id} groupId={groupId} book={state.data} editable={editable} onChanged={assetChanged} />}
    {tab === 'publishing' && state.data && <BookPublishing key={summary.id} groupId={groupId} book={state.data} editable={editable} isSystemAdmin={systemAdmin} onChanged={assetChanged} />}
    {tab === 'keys' && <KeyManager key={summary.id} kind="book" ownerId={summary.id} groupId={groupId} ownerName={b.name} />}
  </>;
}

export function LiveBooks({ profile }) {
  const [groupId, setGroupId] = useState(null), [search, setSearch] = useState(''), [page, setPage] = useState(0), [status, setStatus] = useState(''), [lang, setLang] = useState(''), [open, setOpen] = useState(null), [reload, setReload] = useState(0);
  const query = useDebounced(search.trim());
  useEffect(() => setPage(0), [query, status, lang, groupId]);
  const state = useRead(groupId ? groupBooksUrl(groupId, { search: query, page, resultsPerPage: 10, languages: lang ? [lang] : [], statuses: status ? [status] : [] }) : null, reload);
  const [creating, setCreating] = useState(false), [notice, setNotice] = useState(null), editable = canWriteUsers();
  if (open) return <BookDetail systemAdmin={isSystemAdmin(profile)} groupId={groupId} summary={open} onBack={() => setOpen(null)} onChanged={m => { if (m) setNotice(m); setReload(v => v + 1); }} />;
  const rows = rowsOf(state.data);
  return <>
    <Typography variant="h4" gutterBottom>Books</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>The books in each group of {connection.name}. Cover, file, revision and store listing changes are on each book.</Typography>
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
      <GroupPicker groupId={groupId} onChange={setGroupId} />
      <TextField size="small" label="Search books" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
      <TextField select size="small" label="Status" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 140 }}><MenuItem value="">All</MenuItem>{bookStatuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
      <TextField select size="small" label="Language" value={lang} onChange={e => setLang(e.target.value)} sx={{ minWidth: 160 }}><MenuItem value="">All</MenuItem>{connection.languages.map(l => <MenuItem key={l} value={l}>{language(l)}</MenuItem>)}</TextField>
      <Button startIcon={<Refresh />} disabled={state.loading} onClick={() => setReload(v => v + 1)}>Refresh</Button>
      {editable && groupId && <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)} sx={{ ml: { md: 'auto !important' } }}>New book</Button>}
    </Stack>
    {editable && groupId && <BookFormDialog open={creating} groupId={groupId} book={null} onClose={() => setCreating(false)} onSaved={m => { setCreating(false); setNotice(m); setReload(v => v + 1); }} />}
    {!groupId ? <Loading /> : state.loading && !state.data ? <Loading /> : state.error ? <Failure error={state.error} retry={() => setReload(v => v + 1)} /> :
      <TableContainer component={Paper} variant="outlined"><Table aria-label="Books">
        <TableHead><TableRow>{['Book', 'Author', 'Language', 'Status', 'Revision'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map(b => <TableRow key={b.id} hover onClick={() => setOpen(b)} sx={{ cursor: 'pointer' }}>
            <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Avatar variant="rounded" src={b.coverUrl || undefined} sx={{ width: 36, height: 46 }}><MenuBookOutlined fontSize="small" /></Avatar><Typography fontWeight={600} fontSize={13}>{b.name}</Typography></Stack></TableCell>
            <TableCell>{b.author || '—'}</TableCell><TableCell>{language(b.language)}</TableCell>
            <TableCell>{b.publishStatus ? <Chip size="small" color={statusColor(b.publishStatus)} variant="outlined" label={b.publishStatus} /> : '—'}</TableCell>
            <TableCell>{b.revisionStatus || '—'}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={5}><Typography color="text.secondary">{query || status || lang ? 'No books match.' : 'This group has no books.'}</Typography></TableCell></TableRow>}
        </TableBody></Table>
        <TablePagination component="div" count={countOf(state.data)} page={page} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
      </TableContainer>}
  </>;
}

// ---------------- Certifications ----------------
function CertificationDetail({ groupId, summary, onBack, onChanged }) {
  const [tab, setTab] = useState('info'), [reload, setReload] = useState(0), [editing, setEditing] = useState(false), [confirm, setConfirm] = useState(null), [notice, setNotice] = useState(null), [adding, setAdding] = useState(false), [busy, setBusy] = useState(false), [moveError, setMoveError] = useState(null);
  const editable = canWrite(groupId);
  const state = useRead(certificationUrl(summary.id), reload);
  const c = state.data || summary;
  return <>
    <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>Back to certifications</Button>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
      <Box><Typography variant="h4">{c.name}</Typography><Stack direction="row" spacing={1} alignItems="center"><Typography color="text.secondary">{language(c.language)}</Typography>{c.status && <Chip size="small" color={statusColor(c.status)} variant="outlined" label={c.status} />}</Stack></Box>
      <Stack direction="row" spacing={1} sx={{ ml: 'auto !important' }}>
        <Button startIcon={<Refresh />} disabled={state.loading} onClick={() => setReload(v => v + 1)}>Refresh</Button>
        {editable && <Button startIcon={<EditOutlined />} disabled={!state.data} onClick={() => setEditing(true)}>Edit</Button>}
        {editable && c.status === 'Draft' && <Button variant="contained" onClick={() => { const e = certificationPublishError(c); if (e) setNotice({ severity: 'warning', text: e }); else setConfirm({ title: 'Publish this certification?', body: `${c.name} will be published.`, label: 'Publish', color: 'primary', run: () => send(certificationStatusRequest(groupId, c, 'Published')), done: 'Certification published.' }); }}>Publish</Button>}
        {editable && c.status === 'Published' && <Button color="warning" onClick={() => setConfirm({ title: 'Archive this certification?', body: `${c.name} will be archived.`, label: 'Archive', color: 'warning', run: () => send(certificationStatusRequest(groupId, c, 'Archived')), done: 'Certification archived.' })}>Archive</Button>}
        {editable && <Button color="error" startIcon={<DeleteOutline />} onClick={() => setConfirm({ title: 'Delete this certification?', body: `${c.name} will be permanently deleted.`, label: 'Delete', color: 'error', run: () => send(deleteCertificationRequest(groupId, summary.id)), done: 'Certification deleted.', leave: true })}>Delete</Button>}
      </Stack>
    </Stack>
    {notice && <Alert severity={notice.severity || 'success'} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.text || notice}</Alert>}
    {!editable && <Alert severity="info" sx={{ mb: 2 }}>{writeBlockedMessage()} This is read-only.</Alert>}
    {state.error && <Failure error={state.error} retry={() => setReload(v => v + 1)} />}
    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab value="info" label="Overview" /><Tab value="courses" label={`Courses (${c.courses?.length ?? 0})`} /><Tab value="participants" label={`Participants${c.enrollmentCount != null ? ` (${c.enrollmentCount})` : ''}`} /></Tabs>
    {tab === 'info' && <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={3}>
      <Facts items={[['Group', c.group?.name], ['Status', c.status], ['Published', date(c.publishDate)], ['Privacy', c.privacyLevel], ['Participants', c.enrollmentCount], ['Group membership required', c.isGroupMembershipRequired ? 'Yes' : 'No'], ['Enrollment approval required', c.isEnrollmentApprovalRequired ? 'Yes' : 'No']]} />
      <Box><Typography variant="caption" color="text.secondary">Description</Typography><Html html={c.description} /></Box>
      <Box><Typography variant="caption" color="text.secondary">Certificate message</Typography><Html html={c.certificateMessage} /></Box>
    </Stack></Paper>}
    {tab === 'courses' && <>
      {moveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMoveError(null)}>{moveError}</Alert>}
      {editable && <Stack direction="row" sx={{ mb: 2 }}><Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Add a course</Button></Stack>}
      <SimpleTable label="Certification courses" columns={[['Order', r => r.order ?? '—'], ['Course', r => r.name || `Course ${r.id}`], ['Status', r => r.status || '—'], ['Type', r => r.type || '—'], ...(editable ? [['Actions', r => { const list = [...(c.courses || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), i = list.findIndex(x => x.id === r.id); const move = async to => { setBusy(true); setMoveError(null); try { await send(reorderCertificationCourseRequest(groupId, summary.id, r.id, to + 1)); setReload(v => v + 1); } catch (e) { setMoveError(e.message); } finally { setBusy(false); } }; return <Stack direction="row"><Tooltip title="Move up"><span><IconButton size="small" aria-label={`Move ${r.name} up`} disabled={busy || i <= 0} onClick={() => move(i - 1)}><ArrowUpward fontSize="small" /></IconButton></span></Tooltip><Tooltip title="Move down"><span><IconButton size="small" aria-label={`Move ${r.name} down`} disabled={busy || i < 0 || i >= list.length - 1} onClick={() => move(i + 1)}><ArrowDownward fontSize="small" /></IconButton></span></Tooltip><Button size="small" color="error" disabled={busy} onClick={() => setConfirm({ title: 'Remove this course?', body: `${r.name} will be removed from ${c.name}.`, label: 'Remove', color: 'error', run: () => send(removeCertificationCourseRequest(groupId, summary.id, r.id)), done: 'Course removed.' })}>Remove</Button></Stack>; }]] : [])]} rows={[...(c.courses || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))} empty="No courses in this certification yet." />
    </>}
    {editable && <CertificationFormDialog open={editing} groupId={groupId} certification={state.data} onClose={() => setEditing(false)} onSaved={m => { setEditing(false); setNotice(m); setReload(v => v + 1); onChanged(); }} />}
    {editable && state.data && <CourseAddDialog open={adding} certification={state.data} groupId={groupId} onClose={() => setAdding(false)} onAdded={m => { setAdding(false); setNotice(m); setReload(v => v + 1); }} />}
    <ConfirmDialog open={!!confirm} title={confirm?.title} confirmLabel={confirm?.label} color={confirm?.color} onClose={() => setConfirm(null)} onConfirm={() => confirm.run()} onDone={() => { const d = confirm; setConfirm(null); onChanged(d.done); if (d.leave) onBack(); else { setNotice(d.done); setReload(v => v + 1); } }}>{confirm?.body}</ConfirmDialog>
    {tab === 'participants' && <PagedTable label="Certification participants" url={page => certificationTraineesUrl(summary.id, page)} empty="Nobody is enrolled yet." columns={[['Trainee', r => r.name || '—'], ['Email', r => r.email || '—'], ['Enrollment', r => r.enrollmentStatus || '—'], ['Enrolled', r => date(r.enrollmentDate)], ['Progress', r => percent(r.progress)]]} />}
  </>;
}

export function LiveCertifications() {
  const [groupId, setGroupId] = useState(null), [search, setSearch] = useState(''), [page, setPage] = useState(0), [open, setOpen] = useState(null), [reload, setReload] = useState(0);
  const query = useDebounced(search.trim());
  useEffect(() => setPage(0), [query, groupId]);
  const state = useRead(groupId ? groupCertificationsUrl(groupId, { search: query, page, resultsPerPage: 10 }) : null, reload);
  const [creating, setCreating] = useState(false), [notice, setNotice] = useState(null), editable = canWrite(groupId);
  if (open) return <CertificationDetail groupId={groupId} summary={open} onBack={() => setOpen(null)} onChanged={m => { if (m) setNotice(m); setReload(v => v + 1); }} />;
  const rows = rowsOf(state.data);
  return <>
    <Typography variant="h4" gutterBottom>Certifications</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>The certifications in each group of {connection.name}. Participant approval is still to come.</Typography>
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
      <GroupPicker groupId={groupId} onChange={setGroupId} />
      <TextField size="small" label="Search certifications" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 260 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
      <Button startIcon={<Refresh />} disabled={state.loading} onClick={() => setReload(v => v + 1)}>Refresh</Button>
      {editable && groupId && <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)} sx={{ ml: { md: 'auto !important' } }}>New certification</Button>}
    </Stack>
    {editable && groupId && <CertificationFormDialog open={creating} groupId={groupId} certification={null} onClose={() => setCreating(false)} onSaved={m => { setCreating(false); setNotice(m); setReload(v => v + 1); }} />}
    {!groupId ? <Loading /> : state.loading && !state.data ? <Loading /> : state.error ? <Failure error={state.error} retry={() => setReload(v => v + 1)} /> :
      <TableContainer component={Paper} variant="outlined"><Table aria-label="Certifications">
        <TableHead><TableRow>{['Certification', 'Language', 'Status', 'Participants', 'Published'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map(c => <TableRow key={c.id} hover onClick={() => setOpen(c)} sx={{ cursor: 'pointer' }}>
            <TableCell><Typography fontWeight={600} fontSize={13}>{c.name}</Typography></TableCell><TableCell>{language(c.language)}</TableCell>
            <TableCell>{c.status ? <Chip size="small" color={statusColor(c.status)} variant="outlined" label={c.status} /> : '—'}</TableCell>
            <TableCell>{c.enrollmentCount ?? '—'}</TableCell><TableCell>{date(c.publishDate)}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={5}><Typography color="text.secondary">{query ? `No certifications match "${query}".` : 'This group has no certifications.'}</Typography></TableCell></TableRow>}
        </TableBody></Table>
        <TablePagination component="div" count={countOf(state.data)} page={page} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
      </TableContainer>}
  </>;
}
