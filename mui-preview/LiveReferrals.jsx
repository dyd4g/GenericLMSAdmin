import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Add, ContentCopy, EditOutlined, QrCode2, Refresh, Search } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { canWriteUsers, connection, loginUrl, readApi, referralCategoriesUrl, referralShareLink, referralsUrl, SessionError } from './lib/read-api';
import { analyticsService, createReferralRequest, referralFormError, updateReferralRequest, writeApi } from './lib/write-api';

const PAGE_SIZE = 10;

function Failure({ error, retry }) {
  const session = error instanceof SessionError;
  return <Alert severity={session ? 'warning' : 'error'} action={session ? <Button component="a" href={loginUrl()} color="inherit">Sign in</Button> : <Button onClick={retry} color="inherit">Retry</Button>}>{error instanceof TypeError ? `Unable to reach ${connection.name}. Check your connection and retry.` : error.message}</Alert>;
}

function useCategories() {
  const [state, setState] = useState({ rows: [], error: null });
  useEffect(() => {
    const abort = new AbortController();
    readApi(referralCategoriesUrl(), abort.signal).then(data => setState({ rows: Array.isArray(data) ? data : [], error: null })).catch(e => { if (e.name !== 'AbortError') setState({ rows: [], error: e.message }); });
    return () => abort.abort();
  }, []);
  return state;
}

function ReferralDialog({ open, referral, categories, onClose, onSaved }) {
  const blank = { name: '', shortName: '', code: '', externalId: '', categoryId: '' };
  const [values, setValues] = useState(blank), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => {
    if (!open) return;
    setBusy(false); setError(null);
    setValues(referral ? { name: referral.name || '', shortName: referral.shortName || '', code: referral.code || '', externalId: referral.externalId || '', categoryId: referral.category?.id != null ? String(referral.category.id) : '' } : { ...blank, categoryId: categories.rows[0] ? String(categories.rows[0].id) : '' });
  }, [open, referral, categories.rows]);
  const set = (field, value) => setValues(v => ({ ...v, [field]: value }));
  const problem = referralFormError(values);
  async function save() {
    setBusy(true); setError(null);
    try { const r = referral ? updateReferralRequest(referral, values) : createReferralRequest(values); await writeApi(r.path, r.method, r.body, analyticsService); onSaved(referral ? 'Referral updated.' : 'Referral added.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm">
    <DialogTitle>{referral ? 'Edit referral' : 'Add referral'}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField required autoFocus label="Name" value={values.name} onChange={e => set('name', e.target.value)} disabled={busy} helperText={`${values.name.length}/80`} />
        <TextField label="Short name" value={values.shortName} onChange={e => set('shortName', e.target.value)} disabled={busy} />
        <TextField label="Code" value={values.code} onChange={e => set('code', e.target.value)} disabled={busy} helperText={values.code.trim() ? `Link: ${referralShareLink(values.code.trim())}` : 'Used in the referral link.'} />
        <TextField label="External ID" value={values.externalId} onChange={e => set('externalId', e.target.value)} disabled={busy} />
        <TextField select required label="Category" value={values.categoryId} onChange={e => set('categoryId', e.target.value)} disabled={busy} error={!!categories.error} helperText={categories.error || undefined}>
          {categories.rows.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
        </TextField>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || !!problem} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button></DialogActions>
  </Dialog>;
}

function QrDialog({ referral, onClose }) {
  const link = referral ? referralShareLink(referral.code) : '';
  return <Dialog open={!!referral} onClose={onClose}>
    <DialogTitle>{referral?.name}</DialogTitle>
    <DialogContent><Stack alignItems="center" spacing={2} sx={{ pt: 1 }}>{link ? <><QRCodeSVG value={link} size={240} marginSize={2} /><Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{link}</Typography></> : <Typography color="text.secondary">This referral has no code, so it has no link.</Typography>}</Stack></DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>;
}

export default function LiveReferrals() {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(0), [reload, setReload] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [editing, setEditing] = useState(undefined), [qr, setQr] = useState(null), [notice, setNotice] = useState(null), [copied, setCopied] = useState(null);
  const categories = useCategories(), editable = canWriteUsers();
  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    const abort = new AbortController();
    setState(s => ({ loading: true, data: s.data, error: null }));
    readApi(referralsUrl({ search: query, page, resultsPerPage: PAGE_SIZE }), abort.signal).then(data => setState({ loading: false, data, error: null })).catch(error => { if (error.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => abort.abort();
  }, [query, page, reload]);
  const rows = Array.isArray(state.data) ? state.data : state.data?.results || [];
  const total = Number.isFinite(state.data?.resultsCount) ? state.data.resultsCount : rows.length;
  async function copy(link) { try { await navigator.clipboard.writeText(link); setCopied(link); setTimeout(() => setCopied(null), 1500); } catch { setNotice(null); } }
  return <>
    <Typography variant="h4" gutterBottom>Referrals</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Partners that bring people to {connection.name}. Each one has a link and QR code built from its code. Referrals cannot be deleted.</Typography>
    {!editable && <Alert severity="info" sx={{ mb: 2 }}>Referral changes are not available in {connection.name}, so this is read-only.</Alert>}
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
    <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
      <TextField size="small" label="Search referrals" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 280 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
      <Button startIcon={<Refresh />} disabled={state.loading} onClick={() => setReload(v => v + 1)}>Refresh</Button>
      {editable && <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(null)} sx={{ ml: 'auto !important' }}>Add referral</Button>}
    </Stack>
    {state.loading && !state.data ? <Stack role="status" alignItems="center" sx={{ py: 6 }}><CircularProgress size={26} /><Typography sx={{ mt: 2 }}>Loading…</Typography></Stack> : state.error ? <Failure error={state.error} retry={() => setReload(v => v + 1)} /> :
      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Referrals">
          <TableHead><TableRow>{['Name', 'Code', 'External ID', 'Link', 'Category', ''].map((h, i) => <TableCell key={i}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(r => { const link = referralShareLink(r.code); return <TableRow key={r.id} hover>
              <TableCell><Typography fontWeight={600} fontSize={13}>{r.name}</Typography>{r.shortName && <Typography variant="caption" color="text.secondary">{r.shortName}</Typography>}</TableCell>
              <TableCell>{r.code || '—'}</TableCell>
              <TableCell>{r.externalId || '—'}</TableCell>
              <TableCell sx={{ maxWidth: 280 }}>{link ? <Stack direction="row" alignItems="center" spacing={0.5}><Typography variant="body2" noWrap title={link}>{link}</Typography><Tooltip title={copied === link ? 'Copied' : 'Copy link'}><IconButton size="small" aria-label={`Copy link for ${r.name}`} onClick={() => copy(link)}><ContentCopy fontSize="inherit" /></IconButton></Tooltip></Stack> : '—'}</TableCell>
              <TableCell>{r.category?.name ? <Chip size="small" variant="outlined" label={r.category.name} /> : '—'}</TableCell>
              <TableCell align="right"><Stack direction="row" justifyContent="flex-end">
                <Tooltip title="QR code"><span><IconButton size="small" aria-label={`QR code for ${r.name}`} disabled={!link} onClick={() => setQr(r)}><QrCode2 fontSize="small" /></IconButton></span></Tooltip>
                {editable && <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}><EditOutlined fontSize="small" /></IconButton></Tooltip>}
              </Stack></TableCell>
            </TableRow>; })}
            {!rows.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary">{query ? `No referrals match "${query}".` : 'No referrals yet.'}</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p)} />
      </TableContainer>}
    {editable && <ReferralDialog open={editing !== undefined} referral={editing || null} categories={categories} onClose={() => setEditing(undefined)} onSaved={message => { setEditing(undefined); setNotice(message); setReload(v => v + 1); }} />}
    <QrDialog referral={qr} onClose={() => setQr(null)} />
  </>;
}
