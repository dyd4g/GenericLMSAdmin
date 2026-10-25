import React, { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';
import { connection, readApi } from './lib/read-api';
import { writeApi } from './lib/write-api';
import { assetKinds, candidatesUrl, candidateRows, coachesUrl, addAssetRequest, assignCoachRequest } from './lib/user-assets';

const send = request => writeApi(request.path, request.method, request.body, request.options);

// One confirmation for every removal and role change.
export function ConfirmDialog({ open, title, children, confirmLabel, color = 'error', onConfirm, onClose, onDone }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { if (open) { setBusy(false); setError(null); } }, [open]);
  async function go() {
    setBusy(true); setError(null);
    try { await onConfirm(); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText component="div">{children}</DialogContentText>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button color={color} variant="contained" disabled={busy} onClick={go}>{busy ? 'Working…' : confirmLabel}</Button></DialogActions>
  </Dialog>;
}

// Search what can still be added and tick one or more. Each one is added with its own request, so a failure on one does not stop the rest.
export function AddAssetDialog({ kind, user, open, onClose, onDone }) {
  const info = assetKinds[kind];
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [state, setState] = useState({ loading: true, rows: [], error: null });
  const [picked, setPicked] = useState({}), [busy, setBusy] = useState(false), [report, setReport] = useState(null);
  useEffect(() => { if (open) { setSearch(''); setQuery(''); setPicked({}); setReport(null); setBusy(false); } }, [open, kind, user?.id]);
  useEffect(() => { const t = setTimeout(() => setQuery(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    if (!open || !info) return;
    const abort = new AbortController();
    setState(s => ({ ...s, loading: true, error: null }));
    readApi(candidatesUrl(kind, user.id, query), abort.signal).then(data => setState({ loading: false, rows: candidateRows(data), error: null })).catch(e => { if (e.name !== 'AbortError') setState({ loading: false, rows: [], error: e.message }); });
    return () => abort.abort();
  }, [open, kind, user?.id, query]);
  const ids = Object.keys(picked).filter(k => picked[k]);
  async function add() {
    setBusy(true); setReport(null);
    const failed = [];
    let added = 0;
    for (const id of ids) {
      try { await send(addAssetRequest(kind, user.id, id)); added++; } catch (e) { failed.push(`${state.rows.find(r => String(r.id) === id)?.name || id}: ${e.message}`); }
    }
    setBusy(false);
    if (!failed.length) { onDone(added); return; }
    setReport({ added, failed }); setPicked({});
    if (added) onDone(added, true);
  }
  if (!info) return null;
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm">
    <DialogTitle>{info.add}</DialogTitle>
    <DialogContent>
      <Stack spacing={1.5} sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary">For {user.fullName || user.email}. Only {info.noun}s that can still be added are listed.</Typography>
        {report && <Alert severity={report.added ? 'warning' : 'error'}>{report.added ? `${report.added} added. ` : ''}{report.failed.length} could not be added: {report.failed.join('; ')}</Alert>}
        <TextField size="small" label={info.search} value={search} onChange={e => setSearch(e.target.value)} disabled={busy} slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1 }} /> } }} />
        {state.error ? <Alert severity="error">{state.error}</Alert> : state.loading ? <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack> :
          <List dense sx={{ maxHeight: 360, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {state.rows.map(r => <ListItem key={r.id} disablePadding><ListItemButton disabled={busy} onClick={() => setPicked(p => ({ ...p, [r.id]: !p[r.id] }))}><ListItemIcon sx={{ minWidth: 36 }}><Checkbox edge="start" checked={!!picked[r.id]} tabIndex={-1} disableRipple inputProps={{ 'aria-label': `Select ${r.name}` }} /></ListItemIcon><ListItemText primary={r.name || `${info.noun} ${r.id}`} secondary={r.code || r.description || null} /></ListItemButton></ListItem>)}
            {!state.rows.length && <ListItem><ListItemText primary={query ? `No ${info.noun}s match "${query}".` : `Nothing left to add.`} /></ListItem>}
          </List>}
      </Stack>
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Close</Button><Button variant="contained" disabled={busy || !ids.length} onClick={add}>{busy ? 'Adding…' : `Add selected (${ids.length})`}</Button></DialogActions>
  </Dialog>;
}

// Assign one of the course's coaches to this trainee.
export function CoachDialog({ course, user, onClose, onDone }) {
  const open = !!course;
  const [state, setState] = useState({ loading: true, rows: [], error: null }), [coach, setCoach] = useState('');
  useEffect(() => {
    if (!open) return;
    setCoach('');
    const abort = new AbortController();
    setState({ loading: true, rows: [], error: null });
    readApi(coachesUrl(course.id), abort.signal).then(data => setState({ loading: false, rows: candidateRows(data), error: null })).catch(e => { if (e.name !== 'AbortError') setState({ loading: false, rows: [], error: e.message }); });
    return () => abort.abort();
  }, [open, course?.id]);
  return <ConfirmDialog open={open} title="Assign a coach" confirmLabel="Assign coach" color="primary" onClose={onClose} onDone={onDone} onConfirm={async () => { if (!coach) throw new Error('Choose a coach.'); await send(assignCoachRequest(course.id, user.id, coach)); }}>
    <Typography variant="body2" sx={{ mb: 2 }}>Choose the coach for {user.fullName || user.email} in <strong>{course?.name}</strong>.</Typography>
    {state.error ? <Alert severity="error">{state.error}</Alert> : state.loading ? <CircularProgress size={22} /> : state.rows.length ? <TextField select fullWidth size="small" label="Coach" value={coach} onChange={e => setCoach(e.target.value)}>{state.rows.map(c => <MenuItem key={c.id} value={c.id}>{c.name || c.fullName || c.email || `Coach ${c.id}`}</MenuItem>)}</TextField> : <Alert severity="info">This course has no coaches yet.</Alert>}
  </ConfirmDialog>;
}
