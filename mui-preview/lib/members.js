import { connection, queryString } from './read-api';
import { groupSettingsPayload } from './group-settings';
import { addAssetRequest, groupRoleRequest } from './user-assets';

// Members of a group, and creating or deleting a group. Paths, query and bodies are the existing admin's (LMSAdmin domain/services/as-admin.ts).
// People and group lifecycle changes are not tied to one group's courses, so they work only where the whole environment is editable
// (not on Galilee Prod), the same rule the user pages follow.
const people = { service: 'learning', userLevel: true };
const positive = (id, what) => { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error(`Unknown ${what}.`); return n; };

export const membershipFilters = [['member', 'Approved'], ['pending', 'Waiting for approval']];
export const memberSorts = [['joinDate', 'Join date'], ['name', 'Name']];
export const memberPageSizes = [10, 25, 50];
const statusValues = membershipFilters.map(([value]) => value), sortValues = memberSorts.map(([value]) => value);

// GET groups/{id}/members. Same keys in the same order as the old admin's qs.stringify.
export function membersUrl(groupId, { search = '', sortBy, adminsOnly = false, membershipStatus = [], page = 0, resultsPerPage = 10 } = {}) {
  const status = membershipStatus.filter(value => statusValues.includes(value));
  return `${connection.learning}/api/groups/${positive(groupId, 'group')}/members?${queryString({
    search: String(search).slice(0, 200),
    sortBy: sortValues.includes(sortBy) ? sortBy : undefined,
    isAdmin: adminsOnly ? true : undefined,
    page: Math.max(0, Math.floor(Number(page) || 0)),
    resultsPerPage: memberPageSizes.includes(Number(resultsPerPage)) ? Number(resultsPerPage) : 10,
    membershipStatus: status.length ? status : undefined,
  })}`;
}

// Writes: { path, method, body, options } for writeApi.
export const approveMemberRequest = (groupId, memberId) => ({ path: `/api/groups/${positive(groupId, 'group')}/members/${positive(memberId, 'member')}/approve`, method: 'POST', body: undefined, options: people });
export const setMemberRoleRequest = (groupId, memberId, role) => groupRoleRequest(groupId, memberId, role);
export const removeMemberRequest = (groupId, memberId) => ({ path: `/api/Users/${positive(memberId, 'member')}/groups/${positive(groupId, 'group')}`, method: 'DELETE', body: undefined, options: people });
export const addMemberRequest = (groupId, userId) => addAssetRequest('groups', userId, groupId);

// Create: POST groups { name, code, description, body }. The group URL code can only be set by a system administrator.
export function createGroupRequest(values, { isSystemAdmin = false } = {}) {
  const payload = groupSettingsPayload({ name: values?.name, description: values?.description, code: values?.code, body: '' }, { code: '', body: '' }, { canEditCode: isSystemAdmin });
  return { path: '/api/groups', method: 'POST', body: payload, options: people };
}
// Delete: only a system administrator, and only after typing the group's name.
export function deleteGroupRequest(group, typedName, { isSystemAdmin = false } = {}) {
  if (!isSystemAdmin) throw new Error('Only a system administrator can delete a group.');
  if (!group || !Number.isInteger(Number(group.id))) throw new Error('Unknown group.');
  if (String(typedName ?? '').trim() !== String(group.name ?? '').trim() || !String(group.name ?? '').trim()) throw new Error('Type the group name exactly to confirm.');
  return { path: `/api/groups/${positive(group.id, 'group')}`, method: 'DELETE', body: undefined, options: people };
}
// Who may see the "Create group" button: system administrators, or an account that has no group yet (as in the old admin).
export const canCreateGroup = ({ isSystemAdmin, groupCount }) => Boolean(isSystemAdmin) || Number(groupCount) === 0;

export const memberStatus = member => (member?.isAdmin === true ? 'admin' : String(member?.membershipStatus || '').toLowerCase() === 'pending' ? 'pending' : 'member');
export const memberStatusLabels = { admin: ['Group administrator', 'info'], member: ['Approved', 'success'], pending: ['Waiting for approval', 'warning'] };
