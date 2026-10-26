import React, { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';
import { readApi } from './lib/read-api';
import { writeApi } from './lib/write-api';
import { runEach } from './lib/participants';
import { candidateRows } from './lib/user-assets';

const send = request => writeApi(request.path, request.method, request.body, request.options);

// Search the people who can still be added to a course, tick one or more, and add them. Each person is added with its own request,
// so one failure does not stop the others and the result lists who could not be added.
export default function PeoplePicker({ open, title, noun, plural = `${noun}s`, searchLabel, candidatesUrl, makeRequest, onClose, onDone }) {
  const [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: true, rows: [], error: null });
  const [picked, setPicked] = useState({}), [busy, setBusy] = useState(false), [report, setReport] = useState(null);

  useEffect(() => { if (open) { setSearch(''); setQuery(''); setPicked({}); setReport(null); setBusy(false); } }, [open]);
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!open) return undefined;
    // The service refuses an empty search (HTTP 400), so nothing is asked until the admin types something.
    if (!query.trim()) { setState({ loading: false, rows: [], error: null }); return undefined; }
    const abort = new AbortController();
    setState(current => ({ ...current, loading: true, error: null }));
    readApi(candidatesUrl(query), abort.signal)
      .then(data => setState({ loading: false, rows: candidateRows(data), error: null }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, rows: [], error: error.message }); });
    return () => abort.abort();
  }, [open, query, candidatesUrl]);

  const chosen = Object.keys(picked).filter(id => picked[id]).map(Number);
  const toggle = id => setPicked(current => ({ ...current, [id]: !current[id] }));
  async function add() {
    setBusy(true); setReport(null);
    const result = await runEach(chosen, send, makeRequest);
    setBusy(false);
    if (!result.failed.length) { onDone(); return; }
    // Keep the ones that failed ticked so they can be tried again.
    setPicked(Object.fromEntries(result.failed.map(item => [item.id, true])));
    setReport(result);
    if (result.done.length) onDone({ keepOpen: true });
  }

  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm" aria-labelledby="people-picker-title">
    <DialogTitle id="people-picker-title">{title}</DialogTitle>
    <DialogContent>
      <TextField fullWidth size="small" label={searchLabel} value={search} onChange={event => setSearch(event.target.value)} sx={{ my: 1 }}
        slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1 }} /> } }} />
      {state.error && <Alert severity="error" sx={{ mb: 1 }}>{state.error}</Alert>}
      {report && <Alert severity="warning" sx={{ mb: 1 }}>
        {report.done.length ? `${report.done.length} added. ` : ''}{report.failed.length} could not be added: {report.failed.map(item => `${state.rows.find(row => Number(row.id) === item.id)?.name || `#${item.id}`} (${item.message})`).join('; ')}
      </Alert>}
      {state.loading ? <Stack role="status" alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
        : !state.rows.length ? <Typography color="text.secondary" sx={{ py: 2 }}>{query.trim() ? `No ${plural} match your search (people already in the course are not listed).` : 'Type a name or email address to find people.'}</Typography>
        : <List dense aria-label={`${noun} candidates`} sx={{ maxHeight: 360, overflow: 'auto' }}>{state.rows.map(row => <ListItem key={row.id} disablePadding>
          <ListItemButton disabled={busy} onClick={() => toggle(row.id)}>
            <ListItemIcon><Checkbox edge="start" tabIndex={-1} disableRipple checked={Boolean(picked[row.id])} slotProps={{ input: { 'aria-label': `Select ${row.name || row.email}` } }} /></ListItemIcon>
            <ListItemText primary={row.name || row.email} secondary={row.name ? row.email : undefined} />
          </ListItemButton>
        </ListItem>)}</List>}
    </DialogContent>
    <DialogActions>
      <Button disabled={busy} onClick={onClose}>Close</Button>
      <Button variant="contained" disabled={busy || !chosen.length} onClick={add}>{busy ? 'Adding…' : `Add ${chosen.length ? `${chosen.length} ` : ''}${chosen.length === 1 ? noun : plural}`}</Button>
    </DialogActions>
  </Dialog>;
}
