import { connection, queryString } from './read-api';

// Participants (trainees) and coaches of one course. Paths, query and bodies are the existing admin's (LMSAdmin domain/services/as-admin.ts).
// Every change here is about people, not about the course's content, so it is allowed only where the whole environment is editable
// (not on Galilee Prod), the same rule the user pages follow.
const people = { service: 'learning', userLevel: true };
const positive = (id, what) => { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error(`Unknown ${what}.`); return n; };
const course = id => `${connection.learning}/api/courses/${positive(id, 'course')}`;

export const traineeStatuses = [['notStarted', 'Not started'], ['inProgress', 'In progress'], ['finished', 'Completed']];
export const participantSorts = [['enrollmentDate', 'Enrollment date'], ['name', 'Name']];
export const pageSizes = [10, 25, 50];
const sortValues = participantSorts.map(([value]) => value), statusValues = traineeStatuses.map(([value]) => value);
const day = value => (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(value ?? '')) ? value : undefined);

// GET courses/{id}/trainees. Same order of query keys as the old admin's qs.stringify; empty filters are left out of the lists.
export function traineesUrl(courseId, { search = '', sortBy, coachIds = [], traineeStatus = [], pendingApproval = false, coachPending = false, enrollmentDateStart, enrollmentDateEnd, page = 0, resultsPerPage = 10 } = {}) {
  const status = traineeStatus.filter(value => statusValues.includes(value));
  return `${course(courseId)}/trainees?${queryString({
    search: String(search).slice(0, 200),
    sortBy: sortValues.includes(sortBy) ? sortBy : undefined,
    enrollmentDateStart: day(enrollmentDateStart), enrollmentDateEnd: day(enrollmentDateEnd),
    coachId: coachIds.length ? coachIds.map(id => positive(id, 'coach')) : undefined,
    traineeStatus: status.length ? status : undefined,
    enrollmentStatus: pendingApproval ? ['pending'] : undefined,
    coachPending: Boolean(coachPending),
    page: Math.max(0, Math.floor(Number(page) || 0)),
    resultsPerPage: pageSizes.includes(Number(resultsPerPage)) ? Number(resultsPerPage) : 10,
  })}`;
}
export const courseCoachesUrl = courseId => `${course(courseId)}/coaches`;
export const traineeCandidatesUrl = (courseId, search = '') => `${course(courseId)}/traineeCandidates?${queryString({ search: String(search).slice(0, 200) })}`;
export const coachCandidatesUrl = (courseId, search = '') => `${course(courseId)}/coachCandidates?${queryString({ search: String(search).slice(0, 200) })}`;
export const completionUrl = (courseId, traineeId) => `${course(courseId)}/trainees/${positive(traineeId, 'participant')}/lessons`;
// Files: certificate and transcript (PDF) and the form responses (CSV), read with the signed-in session and saved by the browser.
export const certificateUrl = (traineeId, courseId) => `${connection.learning}/api/trainee/${positive(traineeId, 'participant')}/courses/${positive(courseId, 'course')}/certificate`;
export const transcriptUrl = userId => `${connection.learning}/api/Users/${positive(userId, 'participant')}/transcript`;
export const responsesUrl = (courseId, coachId) => `${course(courseId)}/formResponses?${queryString({ coachId: coachId === undefined ? undefined : positive(coachId, 'coach') })}`;

// Writes: [{ path, method, body, options }] for writeApi.
export const approveRequest = (courseId, traineeId) => ({ path: `/api/courses/${positive(courseId, 'course')}/trainees/${positive(traineeId, 'participant')}/approve`, method: 'POST', body: undefined, options: people });
export const enrollRequest = (courseId, userId) => ({ path: `/api/Users/${positive(userId, 'user')}/traineeCourses`, method: 'POST', body: positive(courseId, 'course'), options: people });
export const removeParticipantRequest = (courseId, userId) => ({ path: `/api/Users/${positive(userId, 'participant')}/traineeCourses/${positive(courseId, 'course')}`, method: 'DELETE', body: undefined, options: people });
export const addCoachRequest = (courseId, userId) => ({ path: `/api/courses/${positive(courseId, 'course')}/coaches`, method: 'POST', body: positive(userId, 'coach'), options: people });
export const removeCoachRequest = (courseId, coachId) => ({ path: `/api/courses/${positive(courseId, 'course')}/coaches/${positive(coachId, 'coach')}`, method: 'DELETE', body: undefined, options: people });
export const assignCoachRequest = (courseId, traineeId, coachId) => ({ path: `/api/courses/${positive(courseId, 'course')}/trainees/${positive(traineeId, 'participant')}/coach`, method: 'POST', body: positive(coachId, 'coach'), options: people });
export const unassignCoachRequest = (courseId, traineeId, coachId) => ({ path: `/api/courses/${positive(courseId, 'course')}/trainees/${positive(traineeId, 'participant')}/coach/${positive(coachId, 'coach')}`, method: 'DELETE', body: undefined, options: people });
export const finishTaskRequest = (traineeId, taskId) => ({ path: `/api/trainees/${positive(traineeId, 'participant')}/task/${positive(taskId, 'task')}/finish`, method: 'POST', body: undefined, options: people });

// Where the participant stands, from the API's progress (0 to 1) and enrollment status, as the old list words it.
export function participantState(p) {
  const progress = Number(p?.progress) || 0;
  if (progress >= 1) return 'completed';
  if (progress > 0) return 'inProgress';
  if (String(p?.enrollmentStatus || '').toLowerCase() === 'pending') return 'waiting';
  return 'notStarted';
}
export const isPending = p => String(p?.enrollmentStatus || '').toLowerCase() === 'pending';
export const isTaskFinished = status => ['Finished', 'Completed', 'Passed'].includes(status);
// A task can be marked complete by an administrator when it is switched on and not finished yet.
export const canMarkComplete = task => Boolean(task) && task.isEnabled !== false && !isTaskFinished(task.status);

// The word and tone the participant's state is shown with.
export const stateLabels = { completed: ['Completed', 'success'], inProgress: ['In progress', 'info'], waiting: ['Waiting for approval', 'warning'], notStarted: ['Not started', 'default'] };

// Runs one request per item so a failure on one does not stop the others. Resolves to { done: [ids], failed: [{ id, message }] }.
export async function runEach(ids, send, make) {
  const done = [], failed = [];
  for (const id of ids) {
    try { await send(make(id)); done.push(id); } catch (error) { failed.push({ id, message: error.message || 'Request failed.' }); }
  }
  return { done, failed };
}

export const sentenceCount = (n, one, many) => `${n} ${n === 1 ? one : many}`;
