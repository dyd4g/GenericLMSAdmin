import { connection, queryString } from './read-api';

// Coach prerequisite courses of a coach-assisted course. Paths, query and bodies are the existing admin's (LMSAdmin
// domain/services/as-admin.ts and CourseManagementPage tab4). The lists come with the course itself: `coachQualifyingCourses` are the
// courses a coach must complete first and `coachQualifiedCourses` are the courses that completing this one qualifies a coach for.
// These are course settings, so changes follow the course's group like other course edits.
const positive = (id, what) => { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error(`Unknown ${what}.`); return n; };
const base = courseId => `/api/courses/${positive(courseId, 'course')}`;

export const coursePrerequisitesUrl = courseId => `${connection.learning}${base(courseId)}`;
export const prerequisiteRows = course => ({
  required: Array.isArray(course?.coachQualifyingCourses) ? course.coachQualifyingCourses : [],
  unlocks: Array.isArray(course?.coachQualifiedCourses) ? course.coachQualifiedCourses : [],
});

// GET. Same order of query keys as the old admin's qs.stringify.
export function prerequisiteCandidatesUrl(courseId, search = '', { page = 0, resultsPerPage = 10 } = {}) {
  return `${connection.learning}${base(courseId)}/coachQualifyingCourseCandidates?${queryString({
    search: String(search).slice(0, 200),
    page: Math.max(0, Math.floor(Number(page) || 0)),
    resultsPerPage: [10, 25, 50].includes(Number(resultsPerPage)) ? Number(resultsPerPage) : 10,
  })}`;
}

// Writes: { path, method, body, options } for writeApi. A course cannot be its own prerequisite.
export function addPrerequisiteRequest(courseId, groupId, prerequisiteId) {
  const id = positive(courseId, 'course'), other = positive(prerequisiteId, 'prerequisite course');
  if (id === other) throw new Error('A course cannot be its own prerequisite.');
  return { path: `${base(id)}/coachQualifyingCourses`, method: 'POST', body: other, options: { groupId } };
}
export const removePrerequisiteRequest = (courseId, groupId, prerequisiteId) => ({ path: `${base(courseId)}/coachQualifyingCourses/${positive(prerequisiteId, 'prerequisite course')}`, method: 'DELETE', body: undefined, options: { groupId } });
