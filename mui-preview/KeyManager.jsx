import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, List, ListItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, MenuItem, Tooltip, Typography } from '@mui/material';
import { Add, ContentCopy, Download, Search } from '@mui/icons-material';
import { SessionError, canWriteUsers, connection, loginUrl } from './lib/read-api';
import { writeApi } from './lib/write-api';
import { MAX_ACTIVATIONS, MAX_KEYS_PER_BATCH, activationText, assignKeyCoachRequest, deactivateKeyRequest, displayKey, generateKeysRequest, keyKinds, keyPageSizes, keySorts, keyStatus, keysCsv, keysUrl, unassignKeyCoachRequest } from './lib/keys';
import { courseCoachesUrl, runEach } from './lib/participants';
import { safeFileName, todayStamp } from './lib/download';
import { ConfirmDialog } from './UserAssets';
import useApi from './useApi';

const send = request => writeApi(request.path, request.method, request.body, request.options);
const dateText = value => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'; };
const triState = (value, setValue) => ({ value: value === undefined ? '' : String(value), onChange: event => setValue(event.target.value === '' ? undefined : event.target.value === 'true') });

// License keys of a course (kind "trainee"), the coaches of a course ("coach") or a book ("book"): list with filters, generate, copy, export,
// deactivate and, for course keys of a coach-assisted course, allocate coaches. Ported from the existing admin's Keys tabs.
export default function KeyManager({ kind, ownerId, groupId, ownerName, coachAssisted = false }) {
  const info = keyKinds[kind];
  const writable = canWriteUsers();
  const [reload, setReload] = useState(0), [search, setSearch] = useState(''), [query, setQuery] = useState(''), [isActive, setIsActive] = useState(undefined), [multiple, setMultiple] = useState(undefined), [remaining, setRemaining] = useState(undefined);
  const [sortBy, setSortBy] = useState(''), [page, setPage] = useState(0), [size, setSize] = useState(10), [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false), [deactivating, setDeactivating] = useState(false), [coachDialog, setCoachDialog] = useState(null), [report, setReport] = useState(null);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const url = useMemo(() => keysUrl(kind, ownerId, groupId, { search: query, resultsPerPage: size, page, isActive, multipleActivations: multiple, activationsRemaining: remaining, sortBy }), [kind, ownerId, groupId, query, size, page, isActive, multiple, remaining, sortBy]);
  const list = useApi(url, reload);
  const withCoaches = kind === 'trainee' && coachAssisted;
  const coaches = useApi(withCoaches ? courseCoachesUrl(ownerId) : null);
  const coachRows = Array.isArray(coaches.data) ? coaches.data : [];
  const rows = Array.isArray(list.data?.results) ? list.data.results : [];
  const total = Number(list.data?.resultsCount) || 0;
  useEffect(() => { setSelected([]); }, [url]);
  const chosen = rows.filter(row => selected.includes(row.id));
  const allSelected = rows.length > 0 && chosen.length === rows.length;
  const filtered = Boolean(query || isActive !== undefined || multiple !== undefined || remaining !== undefined || sortBy);
  const refresh = () => setReload(value => value + 1);
  const toggle = id => setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));

  async function copy(key) { try { await navigator.clipboard.writeText(displayKey(key.key)); setReport({ text: 'Key copied.', failed: [] }); } catch { setReport({ text: 'The key could not be copied. Select it and copy by hand.', failed: [] }); } }
  function exportCsv() {
    const blob = new Blob([keysCsv(chosen)], { type: 'text/csv;charset=utf-8' }), link = document.createElement('a'), href = URL.createObjectURL(blob);
    link.href = href; link.download = `${safeFileName(ownerName, 'keys')}_${info.label.toLowerCase().replace(/ /g, '-')}_${todayStamp()}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(href), 10000);
  }
  async function deactivate() {
    setReport(null);
    const active = chosen.filter(row => row.isActive);
    const result = await runEach(active.map(row => row.id), send, id => deactivateKeyRequest(kind, ownerId, groupId, rows.find(row => row.id === id)));
    setReport({ text: `${result.done.length} key${result.done.length === 1 ? '' : 's'} deactivated${result.failed.length ? `, ${result.failed.length} failed` : ''}.`, failed: result.failed.map(item => ({ ...item, label: `Key #${item.id}` })) });
    setSelected([]); refresh();
  }
  async function coachChange(coach) {
    const mode = coachDialog.mode; setCoachDialog(null); setReport(null);
    const ids = mode === 'assign' ? chosen.map(row => row.id) : chosen.filter(row => (row.coaches || []).some(item => Number(item.id) === Number(coach.id))).map(row => row.id);
    const result = await runEach(ids, send, id => (mode === 'assign' ? assignKeyCoachRequest(ownerId, groupId, id, coach.id) : unassignKeyCoachRequest(ownerId, groupId, id, coach.id)));
    setReport({ text: `${mode === 'assign' ? 'Assigned' : 'Unassigned'} ${coach.name} on ${result.done.length} key${result.done.length === 1 ? '' : 's'}${result.failed.length ? `, ${result.failed.length} failed` : ''}.`, failed: result.failed.map(item => ({ ...item, label: `Key #${item.id}` })) });
    refresh();
  }

  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
      <Typography variant="h6" component="h2">{info.label}</Typography>
      {writable && <Button variant="contained" startIcon={<Add />} onClick={() => setGenerating(true)}>Generate keys</Button>}
    </Stack>
    {!canWriteUsers() && <Alert severity="info">Keys are shown read-only: {connection.name} does not allow license key changes in this app.</Alert>}
    {report && <Alert severity={report.failed.length ? 'warning' : 'success'} onClose={() => setReport(null)}>{report.text}{report.failed.length > 0 && <Box component="ul" sx={{ m: 0, pl: 3 }}>{report.failed.map(item => <li key={item.id}>{item.label}: {item.message}</li>)}</Box>}</Alert>}

    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap alignItems={{ md: 'center' }}>
        <TextField size="small" label="Search keys" value={search} onChange={event => setSearch(event.target.value)} sx={{ minWidth: 240 }} slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1 }} /> } }} />
        <TextField select size="small" label="Status" sx={{ minWidth: 150 }} {...triState(isActive, value => { setIsActive(value); setPage(0); })}><MenuItem value="">All</MenuItem><MenuItem value="true">Active</MenuItem><MenuItem value="false">Inactive</MenuItem></TextField>
        <TextField select size="small" label="Activation limit" sx={{ minWidth: 170 }} {...triState(multiple, value => { setMultiple(value); setPage(0); })}><MenuItem value="">All</MenuItem><MenuItem value="false">One activation</MenuItem><MenuItem value="true">Multiple activations</MenuItem></TextField>
        <TextField select size="small" label="Activations left" sx={{ minWidth: 170 }} {...triState(remaining, value => { setRemaining(value); setPage(0); })}><MenuItem value="">All</MenuItem><MenuItem value="true">Some left</MenuItem><MenuItem value="false">All used</MenuItem></TextField>
        <TextField select size="small" label="Sort by" value={sortBy} onChange={event => { setSortBy(event.target.value); setPage(0); }} sx={{ minWidth: 190 }}>{keySorts.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
        {filtered && <Button onClick={() => { setSearch(''); setQuery(''); setIsActive(undefined); setMultiple(undefined); setRemaining(undefined); setSortBy(''); setPage(0); }}>Clear filters</Button>}
      </Stack>
    </Paper>

    {chosen.length > 0 && <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap role="toolbar" aria-label="Actions for the selected keys">
      <Typography variant="body2">{chosen.length} selected</Typography>
      <Button variant="outlined" startIcon={<Download />} onClick={exportCsv}>Export as CSV</Button>
      {writable && withCoaches && <><Button variant="outlined" disabled={!coachRows.length} onClick={() => setCoachDialog({ mode: 'assign' })}>Assign coach</Button><Button variant="outlined" disabled={!chosen.some(row => (row.coaches || []).length)} onClick={() => setCoachDialog({ mode: 'unassign' })}>Unassign coach</Button></>}
      {writable && <Button color="error" variant="outlined" disabled={!chosen.some(row => row.isActive)} onClick={() => setDeactivating(true)}>Deactivate</Button>}
    </Stack>}

    {list.error ? <Alert severity={list.error instanceof SessionError ? 'warning' : 'error'} action={list.error instanceof SessionError ? <Button color="inherit" component="a" href={loginUrl()}>Sign in</Button> : <Button color="inherit" onClick={refresh}>Retry</Button>}>{list.error.message}</Alert>
      : <Paper variant="outlined"><TableContainer>
        <Table aria-label={info.label} size="small" sx={{ minWidth: 760 }}>
          <TableHead><TableRow>
            <TableCell padding="checkbox"><Checkbox checked={allSelected} indeterminate={!allSelected && chosen.length > 0} onChange={() => setSelected(allSelected ? [] : rows.map(row => row.id))} slotProps={{ input: { 'aria-label': 'Select all keys on this page' } }} /></TableCell>
            <TableCell>Key</TableCell><TableCell>Activations</TableCell>{withCoaches && <TableCell>Coach</TableCell>}<TableCell>Status</TableCell><TableCell>Generated at</TableCell><TableCell>Last activation</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {list.loading && !rows.length ? <TableRow><TableCell colSpan={7}><Stack role="status" alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack></TableCell></TableRow>
              : !rows.length ? <TableRow><TableCell colSpan={7}><Typography color="text.secondary" sx={{ py: 2 }}>{filtered ? 'No keys match these filters.' : `No keys are associated to this ${kind === 'book' ? 'book' : 'course'}.${writable ? ' Use “Generate keys” to add the first one.' : ''}`}</Typography></TableCell></TableRow>
              : rows.map(row => <TableRow key={row.id} hover selected={selected.includes(row.id)}>
                <TableCell padding="checkbox"><Checkbox checked={selected.includes(row.id)} onChange={() => toggle(row.id)} slotProps={{ input: { 'aria-label': `Select key ${displayKey(row.key)}` } }} /></TableCell>
                <TableCell><Stack direction="row" alignItems="center" spacing={0.5}><Typography component="code" variant="body2" sx={{ fontFamily: 'Consolas, "Courier New", monospace' }}>{displayKey(row.key)}</Typography><Tooltip title="Copy key"><IconButton size="small" aria-label={`Copy key ${displayKey(row.key)}`} onClick={() => copy(row)}><ContentCopy fontSize="inherit" /></IconButton></Tooltip></Stack></TableCell>
                <TableCell>{activationText(row)}</TableCell>
                {withCoaches && <TableCell>{(row.coaches || []).length ? (row.coaches || []).map(coach => <Chip key={coach.id} size="small" variant="outlined" label={coach.name} sx={{ mr: 0.5 }} />) : '—'}</TableCell>}
                <TableCell><Chip size="small" color={row.isActive ? 'success' : 'default'} variant={row.isActive ? 'filled' : 'outlined'} label={keyStatus(row)} /></TableCell>
                <TableCell>{dateText(row.creationDate)}</TableCell><TableCell>{dateText(row.lastActivationDate)}</TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={Math.min(page, Math.max(0, Math.ceil(total / size) - 1))} rowsPerPage={size} rowsPerPageOptions={keyPageSizes} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setSize(Number(event.target.value)); setPage(0); }} />
    </Paper>}

    <GenerateDialog open={generating} kind={kind} onClose={() => setGenerating(false)} onGenerate={async values => { await send(generateKeysRequest(kind, ownerId, groupId, values)); setGenerating(false); setReport({ text: `${values.count} key${values.count === 1 ? '' : 's'} generated.`, failed: [] }); setPage(0); setSortBy('CreationDate'); refresh(); }} />
    <ConfirmDialog open={deactivating} title="Deactivate these keys?" confirmLabel="Deactivate" onClose={() => setDeactivating(false)} onConfirm={deactivate} onDone={() => setDeactivating(false)}>
      {chosen.filter(row => row.isActive).length} active key{chosen.filter(row => row.isActive).length === 1 ? '' : 's'} will stop working for new activations. People who already used a key keep their access. Inactive keys in your selection are left as they are.
    </ConfirmDialog>
    <Dialog open={Boolean(coachDialog)} onClose={() => setCoachDialog(null)} fullWidth maxWidth="xs" aria-labelledby="key-coach-title">
      <DialogTitle id="key-coach-title">{coachDialog?.mode === 'assign' ? 'Assign a coach to the keys' : 'Unassign a coach from the keys'}</DialogTitle>
      <DialogContent><List aria-label="Coaches">{(coachDialog?.mode === 'assign' ? coachRows : coachRows.filter(coach => chosen.some(row => (row.coaches || []).some(item => Number(item.id) === Number(coach.id))))).map(coach => <ListItem key={coach.id} disablePadding><Button fullWidth sx={{ justifyContent: 'flex-start' }} onClick={() => coachChange(coach)}>{coach.name}</Button></ListItem>)}</List></DialogContent>
      <DialogActions><Button onClick={() => setCoachDialog(null)}>Cancel</Button></DialogActions>
    </Dialog>
  </Stack>;
}

// How many keys, and whether one key can be activated more than once.
function GenerateDialog({ open, kind, onClose, onGenerate }) {
  const [count, setCount] = useState('1'), [multiple, setMultiple] = useState(false), [max, setMax] = useState('2'), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { if (open) { setCount('1'); setMultiple(false); setMax('2'); setBusy(false); setError(null); } }, [open]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await onGenerate({ count, multiple, maxActivationCount: max }); } catch (e) { setError(e.message); setBusy(false); }
  }
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="xs" aria-labelledby="generate-keys-title">
    <form onSubmit={submit} noValidate>
      <DialogTitle id="generate-keys-title">Generate {kind === 'coach' ? 'coach ' : ''}keys</DialogTitle>
      <DialogContent><Stack spacing={2.5} sx={{ pt: 1 }}>
        <TextField autoFocus label="Number of keys to generate" type="number" value={count} onChange={event => setCount(event.target.value)} disabled={busy} slotProps={{ htmlInput: { min: 1, max: MAX_KEYS_PER_BATCH, step: 1 } }} helperText={`From 1 to ${MAX_KEYS_PER_BATCH} at a time.`} />
        <FormControlLabel control={<Switch checked={multiple} onChange={event => setMultiple(event.target.checked)} disabled={busy} />} label="Multiple activation" />
        {multiple && <TextField label="Maximum activations per key" type="number" value={max} onChange={event => setMax(event.target.value)} disabled={busy} slotProps={{ htmlInput: { min: 1, max: MAX_ACTIVATIONS, step: 1 } }} helperText="How many times one key can be marked as activated. Leave single activation if you do not use the REST API." />}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Generating…' : 'Generate keys'}</Button></DialogActions>
    </form>
  </Dialog>;
}
