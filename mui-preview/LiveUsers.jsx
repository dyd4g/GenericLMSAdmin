import React, { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, InputAdornment, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { Add, ArrowBack, DeleteOutline, EditOutlined, LockOutlined, Refresh, Search } from '@mui/icons-material';
import { UserFormDialog, PasswordDialog, DeleteUserDialog, RolesPanel } from './UserForms';
import { AddAssetDialog, ConfirmDialog, CoachDialog } from './UserAssets';
import { assetKinds, removeAssetRequest, groupRoleRequest, unassignCoachRequest } from './lib/user-assets';
import { writeApi } from './lib/write-api';
import { useCurrentProfile } from './LiveGroups';
import { connection, canWriteUsers, loginUrl, readApi, SessionError, usersUrl, userUrl, userAssetUrl } from './lib/read-api';

const PAGE_SIZE = 10;
const languageLabels = { en: 'English', es: 'Spanish', pt: 'Portuguese', 'zh-Hans': 'Chinese (Simplified)', 'zh-Hant': 'Chinese (Traditional)' };
const date = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
const dateTime = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(); };
const roleName = role => (typeof role === 'string' ? role : role?.name);
const rowsOf = data => (Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
const countOf = data => (Array.isArray(data) ? data.length : Number.isFinite(data?.resultsCount) ? data.resultsCount : rowsOf(data).length);

function Failure({ error, retry }) {
  const session = error instanceof SessionError;
  return <Alert severity={session ? 'warning' : 'error'} action={session ? <Button component="a" href={loginUrl()} color="inherit">Sign in</Button> : <Button onClick={retry} color="inherit">Retry</Button>}>
    {error instanceof TypeError ? `Unable to reach ${connection.name}. Check your connection and retry.` : error.message}
  </Alert>;
}
function Loading() { return <Stack role="status" alignItems="center" sx={{ py: 6 }}><CircularProgress size={26} /><Typography sx={{ mt: 2 }}>Loading…</Typography></Stack>; }
function useRead(url, reload = 0) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    if (!url) return;
    const abort = new AbortController();
    setState({ loading: true, data: null, error: null });
    readApi(url, abort.signal).then(data => setState({ loading: false, data, error: null })).catch(error => { if (error.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => abort.abort();
  }, [url, reload]);
  return state;
}

function RoleChips({ roles }) {
  const names = (roles || []).map(roleName).filter(Boolean);
  return names.length ? <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>{names.map(n => <Chip key={n} size="small" label={n} color={n === 'Admin' ? 'primary' : 'default'} variant="outlined" />)}</Stack> : <Typography variant="body2" color="text.secondary">—</Typography>;
}

// Each tab shows what the old admin shows for that kind of item, read-only.
const percent = value => (Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—');
const names = list => (Array.isArray(list) && list.length ? list.map(x => x?.name || x?.fullName || x?.email).filter(Boolean).join(', ') || '—' : '—');
const planName = plan => (plan && typeof plan === 'object' ? plan.name || plan.type || '—' : plan || '—');
const courseName = r => r.name || `Course ${r.id}`;
// Each tab shows what the old admin shows for that kind of item, read-only. Fields are the ones the services return.
const tabs = [
  { id: 'groups', label: 'Groups', kind: 'groups', columns: [['Group', r => r.name || `Group ${r.id}`], ['Role', r => (r.isAdmin ? 'Admin' : r.isAdmin === false ? 'Member' : '—')], ['Membership', r => r.membershipStatus || '—'], ['Members', r => r.userCount ?? '—'], ['Plan', r => planName(r.currentPlan)], ['Joined', r => date(r.joinDate)]] },
  { id: 'courses', label: 'Courses', kind: 'courses', columns: [['Course', courseName], ['Group', r => r.group?.name || '—'], ['Status', r => r.status || '—'], ['Enrollment', r => r.enrollmentStatus || '—'], ['Coach', r => names(r.coaches)], ['Progress', r => percent(r.progress)], ['Started', r => date(r.startDate)], ['Last access', r => date(r.lastAccessDate)]] },
  { id: 'coaching', label: 'Coaching', kind: 'coaching', columns: [['Course', courseName], ['Group', r => r.group?.name || '—'], ['Status', r => r.status || '—'], ['Trainees', r => r.traineeCount ?? '—'], ['Not started', r => r.notStartedCount ?? '—'], ['In progress', r => r.inProgressCount ?? '—'], ['Finished', r => r.finishedCount ?? '—']] },
  { id: 'adminCourses', label: 'Administered courses', kind: 'adminCourses', columns: [['Course', courseName], ['Group', r => r.group?.name || '—'], ['Status', r => r.status || '—'], ['Type', r => r.type || '—']] },
  { id: 'books', label: 'Books', kind: 'books', columns: [['Book', r => r.name || r.title || `Book ${r.id}`], ['Author', r => r.author || '—'], ['Group', r => r.group?.name || '—']] },
  { id: 'certifications', label: 'Certifications', kind: 'certifications', columns: [['Certification', r => r.name || `Certification ${r.id}`], ['Group', r => r.group?.name || '—'], ['Status', r => r.status || '—'], ['Enrollment', r => r.enrollmentStatus || '—'], ['Progress', r => percent(r.progress)]] },
  { id: 'referrals', label: 'Referrals', kind: 'referrals', columns: [['Referral', r => r.name || `Referral ${r.id}`], ['Code', r => r.code || '—'], ['External ID', r => r.externalId || '—'], ['Category', r => r.category?.name || '—']] },
];

const send = request => writeApi(request.path, request.method, request.body, request.options);

function AssetTab({ tab, user, editable }) {
  const [reload, setReload] = useState(0), [adding, setAdding] = useState(false), [confirm, setConfirm] = useState(null), [coachFor, setCoachFor] = useState(null), [notice, setNotice] = useState(null);
  const state = useRead(userAssetUrl(tab.kind, user.id), reload);
  const kind = assetKinds[tab.kind], userName = user.fullName || user.email;
  const refresh = message => { setNotice(message || null); setReload(v => v + 1); };
  // What an admin can do to one row, using the same calls as the old admin.
  const rowActions = r => {
    if (!editable) return [];
    const remove = (label, title, body) => ({ label, color: 'error', run: () => setConfirm({ title, body, label, color: 'error', onConfirm: () => send(removeAssetRequest(tab.kind, user.id, r.id)), done: `${r.name || 'Item'} removed.` }) });
    switch (tab.kind) {
      case 'groups': return [
        { label: r.isAdmin ? 'Make member' : 'Make admin', color: 'primary', run: () => setConfirm({ title: r.isAdmin ? 'Make this user a regular member?' : 'Make this user a group admin?', body: `${userName} will ${r.isAdmin ? 'no longer be' : 'become'} an administrator of ${r.name}.`, label: r.isAdmin ? 'Make member' : 'Make admin', color: 'primary', onConfirm: () => send(groupRoleRequest(r.id, user.id, r.isAdmin ? 'Member' : 'Admin')), done: 'Group role updated.' }) },
        remove('Remove', 'Remove from group?', `${userName} will no longer be a member of ${r.name}.`),
      ];
      case 'courses': return [
        ...(r.type === 'CoachAssisted' ? [r.coaches?.length ? { label: 'Remove coach', color: 'primary', run: () => setConfirm({ title: 'Remove the coach?', body: `${names(r.coaches)} will no longer coach ${userName} in ${r.name}.`, label: 'Remove coach', color: 'primary', onConfirm: () => send(unassignCoachRequest(r.id, user.id, r.coaches[0].id)), done: 'Coach removed.' }) } : { label: 'Assign coach', color: 'primary', run: () => setCoachFor(r) }] : []),
        remove('Unenroll', 'Unenroll from course?', `${userName} will be unenrolled from ${r.name}.`),
      ];
      case 'adminCourses': return [remove('Remove', 'Remove as course administrator?', `${userName} will no longer administer ${r.name}.`)];
      case 'referrals': return [remove('Remove', 'Remove from referral?', `${userName} will no longer be a representative of ${r.name}.`)];
      case 'books': return [remove('Remove', 'Remove book?', `${r.name || 'This book'} will be taken away from ${userName}.`)];
      case 'certifications': return [remove('Unenroll', 'Unenroll from certification?', `${userName} will be unenrolled from ${r.name}.`)];
      default: return [];
    }
  };
  const columns = editable && tab.kind !== 'coaching' ? [...tab.columns, ['Actions']] : tab.columns;
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <Failure error={state.error} retry={() => setReload(v => v + 1)} />;
  const rows = rowsOf(state.data), total = countOf(state.data);
  return <Box>
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
    {editable && kind && <Stack direction="row" sx={{ mb: 2 }}><Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>{kind.add}</Button></Stack>}
    {editable && tab.kind === 'coaching' && <Alert severity="info" sx={{ mb: 2 }}>Coaches are assigned to trainees from the course's Courses tab on each trainee's page.</Alert>}
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label={tab.label}>
        <TableHead><TableRow>{columns.map(([h]) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map((r, i) => <TableRow key={r.id ?? i} hover>{tab.columns.map(([h, f]) => <TableCell key={h}>{f(r)}</TableCell>)}{columns.length > tab.columns.length && <TableCell><Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>{rowActions(r).map(a => <Button key={a.label} size="small" color={a.color} onClick={a.run}>{a.label}</Button>)}</Stack></TableCell>}</TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={columns.length}><Typography color="text.secondary">Nothing to show for this user.</Typography></TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
    {total > rows.length && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Showing the first {rows.length} of {total}.</Typography>}
    {editable && kind && <AddAssetDialog kind={tab.kind} user={user} open={adding} onClose={() => setAdding(false)} onDone={(count, stay) => { if (!stay) setAdding(false); refresh(`${count} added.`); }} />}
    {editable && <ConfirmDialog open={!!confirm} title={confirm?.title} confirmLabel={confirm?.label} color={confirm?.color} onClose={() => setConfirm(null)} onConfirm={() => confirm.onConfirm()} onDone={() => { const message = confirm.done; setConfirm(null); refresh(message); }}>{confirm?.body}</ConfirmDialog>}
    {editable && <CoachDialog course={coachFor} user={user} onClose={() => setCoachFor(null)} onDone={() => { setCoachFor(null); refresh('Coach assigned.'); }} />}
  </Box>;
}

function UserDetail({ id, onBack }) {
  const [reload, setReload] = useState(0), [tab, setTab] = useState('groups'), [editing, setEditing] = useState(false), [passwordFor, setPasswordFor] = useState(null), [removing, setRemoving] = useState(null), [notice, setNotice] = useState(null);
  const profile = useCurrentProfile().profile;
  const state = useRead(userUrl(id), reload);
  if (state.loading) return <><Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>Back to users</Button><Loading /></>;
  if (state.error) return <><Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>Back to users</Button><Failure error={state.error} retry={() => setReload(v => v + 1)} /></>;
  const u = state.data, current = tabs.find(t => t.id === tab), writable = canWriteUsers(), isSelf = String(profile?.sub) === String(u.id);
  const fields = [['Email', u.email], ['Phone', u.phoneNumber ? `${u.phoneNumber}${u.phoneNumberConfirmed ? ' (confirmed)' : ''}` : null], ['Language', languageLabels[u.language] || u.language], ['Time zone', u.timeZone], ['Country', u.country], ['Gender', u.gender], ['Created', dateTime(u.creationDate)], ['Last updated', dateTime(u.lastUpdateDate)], ['Last login', dateTime(u.lastLoginDate)], ['User ID', u.id]];
  return <>
    <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>Back to users</Button>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Avatar src={u.picture || undefined} sx={{ width: 48, height: 48 }}>{(u.fullName || u.email || '?').slice(0, 1).toUpperCase()}</Avatar>
      <Box>
        <Typography variant="h4">{u.fullName || u.email}</Typography>
        {u.preferredName && u.preferredName !== u.fullName && <Typography color="text.secondary">Preferred name: {u.preferredName}</Typography>}
      </Box>
      <Chip size="small" label={u.isActive === false ? 'Inactive' : 'Active'} color={u.isActive === false ? 'default' : 'success'} variant="outlined" />
      <Chip size="small" label={u.emailConfirmed ? 'Email confirmed' : 'Email not confirmed'} color={u.emailConfirmed ? 'success' : 'warning'} variant="outlined" />
    </Stack>
    {notice && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
    {writable && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
      <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>Edit</Button>
      <Button variant="outlined" startIcon={<LockOutlined />} onClick={() => setPasswordFor(u)}>Change password</Button>
      <Box sx={{ flex: 1 }} />
      <Button color="warning" variant="outlined" onClick={() => setRemoving({ user: u, anonymize: true })}>Anonymize</Button>
      <Button color="error" variant="outlined" startIcon={<DeleteOutline />} onClick={() => setRemoving({ user: u, anonymize: false })}>Delete</Button>
    </Stack>}
    <Paper variant="outlined" sx={{ p: 3, my: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 3 }}>
        {fields.map(([k, v]) => <Box key={k}><Typography variant="caption" color="text.secondary">{k}</Typography><Typography sx={{ overflowWrap: 'anywhere' }}>{v === null || v === undefined || v === '' ? '—' : v}</Typography></Box>)}
      </Box>
    </Paper>
    <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
      {tabs.map(t => <Tab key={t.id} value={t.id} label={t.label} />)}<Tab value="roles" label={`Roles (${(u.roles || []).length})`} />
    </Tabs>
    {tab === 'roles' ? (writable ? <RolesPanel key={u.id} user={u} isSelf={isSelf} onChanged={() => setReload(v => v + 1)} /> : <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="subtitle2" gutterBottom>Roles</Typography><RoleChips roles={u.roles} /><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Roles are shown for reference. Adding or removing roles is not available yet.</Typography></Paper>) : <AssetTab key={`${current.id}:${u.id}`} tab={current} user={u} editable={writable} />}
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>{writable ? 'Changes here take effect immediately for this user.' : `This page is read-only in ${connection.name}.`}</Typography>
    {writable && <>
      <UserFormDialog open={editing} user={u} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice('Changes saved.'); setReload(v => v + 1); }} />
      <PasswordDialog user={passwordFor} onClose={() => setPasswordFor(null)} onDone={() => { setPasswordFor(null); setNotice('Password changed.'); }} />
      <DeleteUserDialog user={removing?.user} anonymize={removing?.anonymize} isSelf={isSelf} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); onBack(); }} />
    </>}
  </>;
}

export default function LiveUsers() {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [sortBy, setSortBy] = useState('creationDate'), [confirmed, setConfirmed] = useState(''), [language, setLanguage] = useState('');
  const [page, setPage] = useState(0), [reload, setReload] = useState(0), [selected, setSelected] = useState(null), [creating, setCreating] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const filters = [confirmed && `emailConfirmed=${confirmed}`, language && `language=${language}`].filter(Boolean);
  const state = useRead(selected === null ? usersUrl({ search: query, sortBy, page, resultsPerPage: PAGE_SIZE, filters }) : null, reload);
  if (selected !== null) return <UserDetail key={selected} id={selected} onBack={() => setSelected(null)} />;
  const data = state.data, valid = Array.isArray(data?.results) && Number.isFinite(data?.resultsCount);
  return <>
    <Typography variant="h4" gutterBottom>Users</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>People registered in {connection.name}.{canWriteUsers() ? '' : ' User changes are not available in this environment.'}</Typography>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      <TextField size="small" label="Search users" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
      <TextField select size="small" label="Sort by" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>{[['creationDate', 'Created date'], ['name', 'Name']].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
      <TextField select size="small" label="Email" value={confirmed} onChange={e => { setConfirmed(e.target.value); setPage(0); }} sx={{ minWidth: 170 }}>{[['', 'All'], ['true', 'Confirmed'], ['false', 'Not confirmed']].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
      <TextField select size="small" label="Language" value={language} onChange={e => { setLanguage(e.target.value); setPage(0); }} sx={{ minWidth: 170 }}>{[['', 'All languages'], ...connection.languages.map(v => [v, languageLabels[v] || v])].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
      <Button startIcon={<Refresh />} disabled={state.loading} onClick={() => setReload(v => v + 1)}>Refresh</Button>
      {canWriteUsers() && <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>New user</Button>}
    </Stack>
    {state.loading ? <Loading /> : state.error ? <Failure error={state.error} retry={() => setReload(v => v + 1)} /> : !valid ? <Alert severity="error">The users service returned an unexpected response.</Alert> :
      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Users">
          <TableHead><TableRow>{['User', 'Email', 'Language', 'Created', 'Last login', 'Action'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {data.results.map(u => <TableRow key={u.id} hover>
              <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Avatar src={u.picture || undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>{(u.fullName || u.email || '?').slice(0, 1).toUpperCase()}</Avatar><Box><Typography fontWeight={600}>{u.fullName || '—'}</Typography>{u.preferredName && u.preferredName !== u.fullName && <Typography variant="caption" color="text.secondary">{u.preferredName}</Typography>}</Box></Stack></TableCell>
              <TableCell><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{u.email}</Typography>{!u.emailConfirmed && <Chip size="small" color="warning" variant="outlined" label="Not confirmed" sx={{ mt: 0.5 }} />}</TableCell>
              <TableCell>{languageLabels[u.language] || u.language || '—'}</TableCell>
              <TableCell>{date(u.creationDate)}</TableCell>
              <TableCell>{date(u.lastLoginDate)}</TableCell>
              <TableCell><Button onClick={() => setSelected(u.id)}>View user</Button></TableCell>
            </TableRow>)}
            {!data.results.length && <TableRow><TableCell colSpan={6}>No users were returned{query || filters.length ? ' for these filters' : ''}.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination component="div" count={data.resultsCount} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, v) => setPage(v)} />
      </TableContainer>}
    <UserFormDialog open={creating} onClose={() => setCreating(false)} onSaved={id => { setCreating(false); setReload(v => v + 1); setSelected(id); }} />
  </>;
}
