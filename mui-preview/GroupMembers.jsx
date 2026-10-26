import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, IconButton, Menu, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Add, MoreVert, Search } from '@mui/icons-material';
import { SessionError, canWriteUsers, connection, loginUrl, queryString } from './lib/read-api';
import { writeApi } from './lib/write-api';
import { addMemberRequest, approveMemberRequest, memberPageSizes, memberSorts, memberStatus, memberStatusLabels, membersUrl, membershipFilters, removeMemberRequest, setMemberRoleRequest } from './lib/members';
import { runEach } from './lib/participants';
import { ConfirmDialog } from './UserAssets';
import PeoplePicker from './PeoplePicker';
import useApi from './useApi';

const send = request => writeApi(request.path, request.method, request.body, request.options);
const dateText = value => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '—'; };
const usersSearchUrl = (text, groupId) => `${connection.identity}/api/users?${queryString({ search: String(text).slice(0, 200), sortBy: 'name', page: 0, resultsPerPage: 25 })}`;

// Members of one group: who they are, who is waiting for approval, who administers the group. Approve, make or remove a group administrator,
// and remove a membership. System administrators can also add people to the group (everyone else adds members from the user's page).
export default function GroupMembers({ group, profile, isSystemAdmin }) {
  const groupId = group.id;
  const writable = canWriteUsers() && (isSystemAdmin || group.isAdmin === true);
  const [reload, setReload] = useState(0), [search, setSearch] = useState(''), [query, setQuery] = useState(''), [statuses, setStatuses] = useState([]), [adminsOnly, setAdminsOnly] = useState(false);
  const [sortBy, setSortBy] = useState('joinDate'), [page, setPage] = useState(0), [size, setSize] = useState(10), [menu, setMenu] = useState(null);
  const [report, setReport] = useState(null), [removeFor, setRemoveFor] = useState(null), [roleFor, setRoleFor] = useState(null), [approveAll, setApproveAll] = useState(false), [adding, setAdding] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const url = useMemo(() => membersUrl(groupId, { search: query, sortBy, adminsOnly, membershipStatus: statuses, page, resultsPerPage: size }), [groupId, query, sortBy, adminsOnly, statuses, page, size]);
  const list = useApi(url, reload);
  const rows = Array.isArray(list.data?.results) ? list.data.results : [];
  const total = Number(list.data?.resultsCount) || 0;
  const pending = rows.filter(row => memberStatus(row) === 'pending');
  const self = row => profile?.sub != null && String(row.id) === String(profile.sub);
  const filtered = Boolean(query || statuses.length || adminsOnly);
  const refresh = () => setReload(value => value + 1);
  const nameOf = id => rows.find(row => row.id === id)?.name || `#${id}`;
  const candidatesUrl = useCallback(text => usersSearchUrl(text, groupId), [groupId]);
  const makeAdd = useCallback(id => addMemberRequest(groupId, id), [groupId]);

  async function approve(ids) {
    setReport(null);
    const result = await runEach(ids, send, id => approveMemberRequest(groupId, id));
    setReport({ text: `${result.done.length} approved${result.failed.length ? `, ${result.failed.length} failed` : ''}.`, done: result.done, failed: result.failed.map(item => ({ ...item, label: nameOf(item.id) })) });
    refresh();
  }

  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
      <Typography variant="h6" component="h2">Members</Typography>
      {writable && isSystemAdmin && <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Add members</Button>}
    </Stack>
    {!writable && <Alert severity="info">Members are shown read-only: {canWriteUsers() ? 'your account is not an administrator of this group.' : `${connection.name} does not allow changes to people in this app.`}</Alert>}
    {report && <Alert severity={report.failed.length ? (report.done.length ? 'warning' : 'error') : 'success'} onClose={() => setReport(null)}>{report.text}
      {report.failed.length > 0 && <Box component="ul" sx={{ m: 0, pl: 3 }}>{report.failed.map(item => <li key={item.id}>{item.label}: {item.message}</li>)}</Box>}</Alert>}

    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
        <TextField size="small" label="Search members" value={search} onChange={event => setSearch(event.target.value)} sx={{ minWidth: 260 }} slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1 }} /> } }} />
        <TextField select size="small" label="Sort by" value={sortBy} onChange={event => { setSortBy(event.target.value); setPage(0); }} sx={{ minWidth: 160 }}>{memberSorts.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
        <ToggleButtonGroup size="small" aria-label="Membership status" value={statuses} onChange={(_, value) => { setStatuses(value); setPage(0); }}>{membershipFilters.map(([value, label]) => <ToggleButton key={value} value={value}>{label}</ToggleButton>)}</ToggleButtonGroup>
        <FormControlLabel control={<Checkbox checked={adminsOnly} onChange={event => { setAdminsOnly(event.target.checked); setPage(0); }} />} label="Group administrators only" />
        {filtered && <Button onClick={() => { setSearch(''); setQuery(''); setStatuses([]); setAdminsOnly(false); setPage(0); }}>Clear filters</Button>}
      </Stack>
    </Paper>

    {writable && pending.length > 0 && <Box><Button variant="outlined" onClick={() => setApproveAll(true)}>Approve all waiting on this page ({pending.length})</Button></Box>}

    {list.error ? <Alert severity={list.error instanceof SessionError ? 'warning' : 'error'} action={list.error instanceof SessionError ? <Button color="inherit" component="a" href={loginUrl()}>Sign in</Button> : <Button color="inherit" onClick={refresh}>Retry</Button>}>{list.error.message}</Alert>
      : <Paper variant="outlined"><TableContainer>
        <Table aria-label="Group members" size="small" sx={{ minWidth: 640 }}>
          <TableHead><TableRow><TableCell sx={{ minWidth: 200 }}>Member</TableCell><TableCell>Joined</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {list.loading && !rows.length ? <TableRow><TableCell colSpan={4}><Stack role="status" alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack></TableCell></TableRow>
              : !rows.length ? <TableRow><TableCell colSpan={4}><Typography color="text.secondary" sx={{ py: 2 }}>{filtered ? 'No members match these filters.' : 'This group has no members yet.'}</Typography></TableCell></TableRow>
              : rows.map(row => {
                const status = memberStatus(row), [label, color] = memberStatusLabels[status], mine = self(row);
                return <TableRow key={row.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{row.name || '—'}{mine ? ' (you)' : ''}</Typography><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{row.email}</Typography></TableCell>
                  <TableCell>{dateText(row.joinDate)}</TableCell>
                  <TableCell><Chip size="small" color={color} variant={status === 'pending' ? 'filled' : 'outlined'} label={label} /></TableCell>
                  <TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    {writable && !mine && status === 'pending' && <Button size="small" variant="outlined" onClick={() => approve([row.id])}>Approve</Button>}
                    {writable && !mine && <IconButton aria-label={`More actions for ${row.name || row.email}`} aria-haspopup="menu" onClick={event => setMenu({ anchor: event.currentTarget, row })}><MoreVert fontSize="small" /></IconButton>}
                  </Stack></TableCell>
                </TableRow>;
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={Math.min(page, Math.max(0, Math.ceil(total / size) - 1))} rowsPerPage={size} rowsPerPageOptions={memberPageSizes} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setSize(Number(event.target.value)); setPage(0); }} />
    </Paper>}

    <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
      {menu && memberStatus(menu.row) === 'admin' && <MenuItem onClick={() => { setRoleFor({ row: menu.row, role: 'Member' }); setMenu(null); }}>Remove as group administrator</MenuItem>}
      {menu && memberStatus(menu.row) === 'member' && <MenuItem onClick={() => { setRoleFor({ row: menu.row, role: 'Admin' }); setMenu(null); }}>Make group administrator</MenuItem>}
      <MenuItem onClick={() => { setRemoveFor(menu.row); setMenu(null); }} sx={{ color: 'error.main' }}>Remove from group</MenuItem>
    </Menu>

    <ConfirmDialog open={approveAll} title="Approve all waiting members?" confirmLabel="Approve" color="primary" onClose={() => setApproveAll(false)} onConfirm={() => approve(pending.map(row => row.id))} onDone={() => setApproveAll(false)}>
      {pending.length} member{pending.length === 1 ? '' : 's'} on this page will join the group: {pending.map(row => row.name || row.email).join(', ')}.
    </ConfirmDialog>
    <ConfirmDialog open={Boolean(roleFor)} title={roleFor?.role === 'Admin' ? 'Make this member a group administrator?' : 'Remove as group administrator?'} confirmLabel={roleFor?.role === 'Admin' ? 'Make administrator' : 'Remove role'} color="primary" onClose={() => setRoleFor(null)}
      onConfirm={async () => { await send(setMemberRoleRequest(groupId, roleFor.row.id, roleFor.role)); setReport({ text: `${roleFor.row.name || roleFor.row.email} is ${roleFor.role === 'Admin' ? 'now a group administrator' : 'no longer a group administrator'}.`, done: [roleFor.row.id], failed: [] }); refresh(); }} onDone={() => setRoleFor(null)}>
      {roleFor && (roleFor.role === 'Admin' ? <><strong>{roleFor.row.name || roleFor.row.email}</strong> will be able to manage this group, its courses and its members.</> : <><strong>{roleFor.row.name || roleFor.row.email}</strong> stays a member of the group but can no longer manage it.</>)}
    </ConfirmDialog>
    <ConfirmDialog open={Boolean(removeFor)} title="Remove this person from the group?" confirmLabel="Remove" onClose={() => setRemoveFor(null)}
      onConfirm={async () => { await send(removeMemberRequest(groupId, removeFor.id)); setReport({ text: `${removeFor.name || removeFor.email} was removed from the group.`, done: [removeFor.id], failed: [] }); refresh(); }} onDone={() => setRemoveFor(null)}>
      {removeFor && <><strong>{removeFor.name || removeFor.email}</strong> will lose access to this group. Their enrollments in its courses are not removed here.</>}
    </ConfirmDialog>
    <PeoplePicker open={adding} title="Add members" noun="member" searchLabel="Search users by name or email" candidatesUrl={candidatesUrl} makeRequest={makeAdd}
      onClose={() => setAdding(false)} onDone={({ keepOpen } = {}) => { if (!keepOpen) setAdding(false); setReport({ text: 'Members added.', done: [1], failed: [] }); refresh(); }} />
  </Stack>;
}
