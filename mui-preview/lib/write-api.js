import { connection, canWrite, canWriteUsers, writeBlockedMessage, readAccessToken, SessionError } from './read-api';
export async function writeApi(path,method,body,{groupId,service='learning',userLevel=false}={}){if(!['learning','identity','books','alerts','analytics'].includes(service))throw new Error('Unknown service.');const global=service!=='learning'||userLevel;if(global?!canWriteUsers():!canWrite(groupId))throw new Error(writeBlockedMessage(['alerts','analytics','books'].includes(service)?service:global?'identity':service));const token=readAccessToken();if(!token)throw new SessionError('Sign in again before saving.');const response=await fetch(`${connection[service]}${path}`,{method,credentials:'omit',headers:{'Client-Id':connection.clientId,authorization:`Bearer ${token}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!response.ok){let message;try{const data=await response.json();message=data.message||data.error_description||data.title||JSON.stringify(data.errors)}catch{}throw new Error(message||`Request failed (HTTP ${response.status}).`)}if(response.status===204)return null;const text=await response.text();if(!text)return null;try{return JSON.parse(text)}catch{return text}}
export const taskResources={Content:'contents',XApiActivity:'xApiActivities',Video:'videos',Meeting:'meetings',Assignment:'assignments',EditableForm:'forms',Quiz:'forms',Survey:'forms',Test:'tests'};
export function contentPayload(item,order){if(!item.name?.trim())throw new Error('A task name is required.');return {name:item.name,description:item.description||null,traineeBody:item.traineeBody||null,coachBody:item.coachBody||null,order,isRequired:item.isRequired??true,isEnabled:item.isEnabled??true,assignedTo:item.assignedTo||'Trainee',isAutoValidationEnabled:item.isAutoValidationEnabled??true,coachValidationRequired:item.coachValidationRequired??false};}
export function orderPayload(item,order){if(item.type==='Content')return contentPayload(item,order);const common=['name','description','isRequired','isEnabled','assignedTo'];const extra={XApiActivity:['url','scormSupportEnabled'],Video:['canSkipForward'],Meeting:['traineeBody','coachBody','durationMinutes'],Assignment:['traineeBody','coachBody','maxFileSize','maxFileCount','allowedFileExtensions','minPassingScore'],EditableForm:['traineeBody','coachBody','isResponsePrivate','minPassingScore','revealAnswersOnFail','questionDisplay'],Quiz:['traineeBody','coachBody','isResponsePrivate','minPassingScore','revealAnswersOnFail','questionDisplay'],Survey:['traineeBody','coachBody','isResponsePrivate','minPassingScore','revealAnswersOnFail','questionDisplay'],Test:['traineeBody','coachBody','isResponsePrivate','minPassingScore','revealAnswersOnFail','questionDisplay','summaryAttributes','summaryOutcomes']}[item.type];if(!extra)throw new Error(`Unsupported task type: ${item.type}`);return {...Object.fromEntries([...common,...extra].filter(k=>item[k]!==undefined).map(k=>[k,item[k]])),order};}
export function courseStatusRequest(courseId,target) {
  if(!['Draft','Test'].includes(target))throw new Error('Only Draft and Test transitions are supported.');
  return {path:`/api/courses/${encodeURIComponent(courseId)}/${target.toLowerCase()}`,method:'PUT',body:''};
}
export const individuallyCopyableTasks = ['Content','XApiActivity','Meeting','Assignment'];
export function deleteItemRequest(kind,item){
  const resource=kind==='lesson'?'lessons':taskResources[item.type];
  if(!resource)throw new Error('Unsupported task type.');
  return {path:`/api/${resource}/${encodeURIComponent(item.id)}`,method:'DELETE'};
}
export function copyItemRequest(kind,item,lessonId,order){
  if(kind==='lesson')return {path:`/api/lessons?lessonId=${encodeURIComponent(item.id)}`,method:'POST'};
  if(item.type==='Assignment')return {path:`/api/assignments?assignmentId=${encodeURIComponent(item.id)}`,method:'POST'};
  if(!individuallyCopyableTasks.includes(item.type))throw new Error('Copy this task with its whole lesson to preserve all nested content.');
  const copy={...item,name:`${item.name} (copy)`};
  return {path:`/api/lessons/${encodeURIComponent(lessonId)}/${taskResources[item.type]}`,method:'POST',body:item.type==='Content'?contentPayload(copy,order):orderPayload(copy,order)};
}
export function formPayload(item,order){if(!item.name?.trim())throw new Error('A form name is required.');return {name:item.name,description:item.description||null,traineeBody:item.traineeBody||null,coachBody:item.coachBody||null,order,isRequired:item.isRequired??true,isEnabled:item.isEnabled??true,assignedTo:item.assignedTo||'Trainee',isResponsePrivate:item.isResponsePrivate??false,minPassingScore:item.minPassingScore??(item.type==='Survey'?null:0),revealAnswersOnFail:item.revealAnswersOnFail??false,questionDisplay:item.questionDisplay||'All'};}
export function assignmentPayload(item,order){
 if(!item.name?.trim())throw new Error('A task name is required.');
 const size=Number(item.maxFileSize),count=Number(item.maxFileCount),score=Math.round(Number(item.minPassingScore)*10000)/10000;
 if(!Number.isFinite(size)||size<1||size>100)throw new Error('Maximum file size must be between 1 and 100 MB.');
 if(!Number.isInteger(count)||count<1||count>10)throw new Error('Maximum number of files must be a whole number from 1 to 10.');
 if(!Number.isFinite(score)||score<0.7||score>1)throw new Error('Minimum score must be between 70 and 100.');
 const raw=String(item.allowedFileExtensions??'').replace(/[\s.]/g,'').toLowerCase(),extensions=raw||null;
 if(extensions&&!/^[a-z0-9]{1,10}(,[a-z0-9]{1,10})*$/.test(extensions))throw new Error('Allowed file types must be a comma-separated list such as pdf,docx.');
 return {name:item.name,description:item.description||null,traineeBody:item.traineeBody||null,coachBody:item.coachBody||null,order,isRequired:item.isRequired??true,isEnabled:item.isEnabled??true,maxFileSize:size,maxFileCount:count,allowedFileExtensions:extensions,minPassingScore:score};
}

export const courseTypes=[['SelfPaced','Self-paced'],['CoachAssisted','Coach-assisted']];
export const privacyLevels=[['Public','Public'],['Unlisted','Unlisted']];
export const deletableStatuses=['Draft','Test'];
// Same fields the old admin sends when it creates a course (image, SEO and sales settings are not included).
export function coursePayload(v,body){
 const name=String(v.name??'').trim();
 if(!name)throw new Error('A course name is required.');
 if(!courseTypes.some(([t])=>t===v.type))throw new Error('Choose a course type.');
 if(!privacyLevels.some(([t])=>t===v.privacyLevel))throw new Error('Choose a visibility.');
 if(!v.language)throw new Error('Choose a language.');
 const certificate=!!v.hasCertificate;
 return {name,description:v.description||'',body:body||'',type:v.type,language:v.language,categoryId:Number(v.categoryId)||0,isGroupMembershipRequired:!!v.isGroupMembershipRequired,isEnrollmentApprovalRequired:!!v.isEnrollmentApprovalRequired,privacyLevel:v.privacyLevel,code:v.code||'',author:v.author||'',managementNotificationsEnabled:!!v.managementNotificationsEnabled,executionNotificationsEnabled:!!v.executionNotificationsEnabled,certificateMessage:certificate?(v.certificateMessage||''):'',hasCertificate:certificate,seo:{description:null,keywords:null,title:null},enforceSequentialExecution:!!v.enforceSequentialExecution,requiresLicenseToEnroll:!!v.requiresLicenseToEnroll};
}
export function createCourseRequest(groupId,payload){const id=Number(groupId);if(!Number.isInteger(id)||id<=0)throw new Error('A group is required to create a course.');return {path:`/api/groups/${id}/courses`,method:'POST',body:payload,groupId:id};}
export function deleteCourseRequest(course){if(!course||!Number.isInteger(Number(course.id)))throw new Error('Unknown course.');if(!deletableStatuses.includes(course.status))throw new Error('Only Draft or Test courses can be deleted.');return {path:`/api/courses/${encodeURIComponent(course.id)}`,method:'DELETE'};}

// Video task: same fields the old admin sends. The file itself is handled by the upload requests below.
export function videoPayload(item,order){
 if(!item.name?.trim())throw new Error('A task name is required.');
 const assignedTo=item.assignedTo||'Trainee';
 if(!['Trainee','Coach'].includes(assignedTo))throw new Error('A video task is assigned to the trainee or the coach.');
 return {name:item.name,description:item.description||null,order,isRequired:item.isRequired??true,isEnabled:item.isEnabled??true,assignedTo,canSkipForward:item.canSkipForward??true};
}
export function initVideoUploadRequest(videoId,file){
 const id=Number(videoId);if(!Number.isInteger(id)||id<=0)throw new Error('Save the video task before uploading a file.');
 if(!file?.name||!(file.size>0))throw new Error('Choose a video file that is not empty.');
 return {path:`/api/videos/${id}/upload`,method:'PUT',body:{fileName:file.name,fileSize:file.size}};
}
export function finishVideoUploadRequest(videoId){const id=Number(videoId);if(!Number.isInteger(id)||id<=0)throw new Error('Unknown video task.');return {path:`/api/videos/${id}/upload/finish`,method:'POST'};}
export function removeVideoUploadRequest(videoId){const id=Number(videoId);if(!Number.isInteger(id)||id<=0)throw new Error('Unknown video task.');return {path:`/api/videos/${id}/upload`,method:'DELETE'};}

// ---- Users (identity service). Requests mirror the old admin; pass { service: 'identity' } to writeApi. ----
export const identity={service:'identity'};
// Same rule as the old admin (APP_Password_Regex): 8 to 20 characters with upper case, lower case, a digit and a symbol.
export const passwordPattern=/^(?:(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*\W).{8,20})$/;
const validPassword=password=>passwordPattern.test(password||'');
const emailPattern=/^\S+@\S+$/i;
function userId(id){const n=Number(id);if(!Number.isInteger(n)||n<=0)throw new Error('Unknown user.');return n;}
// Same rules the old form enforces: name required (max 80), a valid email, and a phone number (max 15).
export function userFormError(v){
 if(!String(v.fullName??'').trim())return 'Enter the full name.';
 if(String(v.fullName).trim().length>80)return 'The full name can be at most 80 characters.';
 if(!emailPattern.test(String(v.email??'').trim()))return 'Enter a valid email address.';
 const phone=String(v.phoneNumber??'').trim();
 if(!phone)return 'Enter a phone number.';
 if(phone.length>15)return 'The phone number can be at most 15 characters.';
 return null;
}
function userFields(v){
 const text=x=>(x==null?'':String(x).trim());
 return {fullName:text(v.fullName),preferredName:text(v.preferredName),email:text(v.email),phoneNumber:text(v.phoneNumber),gender:v.gender||undefined,country:v.country||undefined,language:v.language||undefined,timeZone:v.timeZone||undefined,emailConfirmed:!!v.emailConfirmed,phoneNumberConfirmed:!!v.phoneNumberConfirmed};
}
export function createUserRequest(values){const error=userFormError(values);if(error)throw new Error(error);return {path:'/api/users',method:'POST',body:{...userFields(values),isNewsletterEnabled:false}};}
// The old admin sends the stored user merged with the edited fields, without the newsletter flag.
export function updateUserRequest(user,values){const error=userFormError(values);if(error)throw new Error(error);const {isNewsletterEnabled,...stored}=user;return {path:`/api/users/${userId(user.id)}`,method:'PUT',body:{...stored,...userFields(values)}};}
export function passwordRequest(id,password,confirm){
 if(!password)throw new Error('Enter a new password.');
 if(password.length<8)throw new Error('The password must be at least 8 characters.');
 if(!validPassword(password))throw new Error('Use 8 to 20 characters with an upper-case letter, a lower-case letter, a number and a symbol.');
 if(password!==confirm)throw new Error('The two passwords do not match.');
 return {path:`/api/users/${userId(id)}/password`,method:'PUT',body:password};
}
export function confirmEmailRequest(id){const n=userId(id);return {path:`/api/users/${n}/sendconfirmemailmessage`,method:'POST',body:n};}
export function assignRoleRequest(id,roleId){const r=Number(roleId);if(!Number.isInteger(r)||r<=0)throw new Error('Unknown role.');return {path:`/api/Users/${userId(id)}/roles`,method:'POST',body:r};}
export function removeRoleRequest(id,roleId){const r=Number(roleId);if(!Number.isInteger(r)||r<=0)throw new Error('Unknown role.');return {path:`/api/users/${userId(id)}/roles/${r}`,method:'DELETE'};}
// "Delete" removes the user and their analytics; "Anonymize" keeps the analytics (keepAnalytics=true), as in the old admin.
export function deleteUserRequest(id,{keepAnalytics=false}={}){return {path:`/api/users/${userId(id)}?keepAnalytics=${keepAnalytics?'true':'false'}`,method:'DELETE'};}

// ---- System alerts (alerts service). Same body as the old admin: { type, message, isActive }. ----
export const alertsService={service:'alerts'};
export const alertTypes=[['Error','Error (red)'],['Success','Success (green)']];
export function updateAlertRequest(id,values){
 const n=Number(id);if(!Number.isInteger(n)||n<=0)throw new Error('Unknown alert.');
 if(!alertTypes.some(([t])=>t===values.type))throw new Error('Choose Error or Success.');
 const message=values.message==null?null:String(values.message);
 return {path:`/alerts/${n}`,method:'PUT',body:{type:values.type,message,isActive:!!values.isActive}};
}

// ---- Referrals (partners in the analytics service). Bodies as the old admin sends them. ----
export const analyticsService={service:'analytics'};
export function referralFormError(v){
 const name=String(v.name??'').trim();
 if(!name)return 'Enter a name.';
 if(name.length>80)return 'The name can be at most 80 characters.';
 if(v.categoryId===''||v.categoryId==null)return 'Choose a category.';
 const code=String(v.code??'').trim();
 if(code&&!/^[^\s/?#%]+$/.test(code))return 'The code is part of a web address, so it cannot contain spaces or / ? # %.';
 return null;
}
const referralFields=v=>({name:String(v.name).trim(),shortName:String(v.shortName??'').trim(),code:String(v.code??'').trim(),externalId:String(v.externalId??'').trim(),categoryId:String(v.categoryId)});
export function createReferralRequest(values){const e=referralFormError(values);if(e)throw new Error(e);return {path:'/partners',method:'POST',body:referralFields(values)};}
export function updateReferralRequest(existing,values){
 const e=referralFormError(values);if(e)throw new Error(e);
 const id=Number(existing?.id);if(!Number.isInteger(id)||id<=0)throw new Error('Unknown referral.');
 return {path:`/partners/${id}`,method:'PUT',body:{id,categoryName:existing.category?.name??'',...referralFields(values)}};
}

// ---- Books (books service, per group) and Certifications (learning service). Bodies and paths as the old admin sends them. ----
export const booksService={service:'books'};
const positiveId=(id,what)=>{const n=Number(id);if(!Number.isInteger(n)||n<=0)throw new Error(`Unknown ${what}.`);return n};
const safeBookId=id=>{const s=String(id??'').trim();if(!/^[A-Za-z0-9_-]+$/.test(s))throw new Error('Unknown book.');return s};
export const bookStatuses=['Draft','Published','Archived'];
export function bookFormError(v){if(!String(v.name??'').trim())return 'Enter a title.';return null}
const bookFields=(v,productId)=>({name:String(v.name).trim(),author:String(v.author??'').trim(),language:v.language||'',description:String(v.description??''),body:String(v.body??''),productId:Number.isInteger(productId)?productId:null});
export function createBookRequest(groupId,v){const e=bookFormError(v);if(e)throw new Error(e);return {path:`/Groups/${positiveId(groupId,'group')}/Books`,method:'POST',body:bookFields(v,null),options:booksService}}
export function updateBookRequest(groupId,bookId,v,existing){const e=bookFormError(v);if(e)throw new Error(e);const pid=Number(existing?.productId);return {path:`/Groups/${positiveId(groupId,'group')}/Books/${safeBookId(bookId)}`,method:'PUT',body:bookFields(v,Number.isInteger(pid)&&existing?.productId!=null&&existing.productId!==''?pid:null),options:booksService}}
export function deleteBookRequest(groupId,bookId){return {path:`/Groups/${positiveId(groupId,'group')}/Books/${safeBookId(bookId)}`,method:'DELETE',body:undefined,options:booksService}}
export function bookStatusRequest(groupId,bookId,status){if(!bookStatuses.includes(status))throw new Error('Choose Draft, Published or Archived.');return {path:`/Groups/${positiveId(groupId,'group')}/Books/${safeBookId(bookId)}/status`,method:'PUT',body:status,options:booksService}}

export const certificationPrivacy=['Public','Unlisted'];
export const certificationStatuses=['Draft','Published','Archived'];
export function certificationFormError(v){
 const name=String(v.name??'').trim();
 if(!name)return 'Enter a title.';
 if(name.length>80)return 'The title can be at most 80 characters.';
 if(String(v.description??'').length>500)return 'The description can be at most 500 characters.';
 if(String(v.certificateMessage??'').length>500)return 'The certificate message can be at most 500 characters.';
 if(!certificationPrivacy.includes(v.privacyLevel))return 'Choose Public or Unlisted.';
 return null;
}
const certificationFields=v=>({name:String(v.name).trim(),language:v.language||'',description:String(v.description??''),certificateMessage:String(v.certificateMessage??''),isGroupMembershipRequired:!!v.isGroupMembershipRequired,isEnrollmentApprovalRequired:!!v.isEnrollmentApprovalRequired,privacyLevel:v.privacyLevel});
export function createCertificationRequest(groupId,v){const e=certificationFormError(v);if(e)throw new Error(e);const g=positiveId(groupId,'group');return {path:`/api/certifications?groupId=${g}`,method:'POST',body:certificationFields(v),groupId:g}}
export function updateCertificationRequest(groupId,id,v){const e=certificationFormError(v);if(e)throw new Error(e);return {path:`/api/certifications/${positiveId(id,'certification')}`,method:'PUT',body:certificationFields(v),groupId:positiveId(groupId,'group')}}
export function deleteCertificationRequest(groupId,id){return {path:`/api/certifications/${positiveId(id,'certification')}`,method:'DELETE',body:undefined,groupId:positiveId(groupId,'group')}}
// Publishing needs at least one course and every course published; archiving has no such rule.
export function certificationPublishError(certification){const courses=certification?.courses||[];if(!courses.length)return 'Add at least one course before publishing.';if(courses.some(c=>c.status!=='Published'))return 'Every course must be published before the certification can be published.';return null}
export function certificationStatusRequest(groupId,certification,status){
 if(!['Published','Archived'].includes(status))throw new Error('A certification can be published or archived.');
 if(status==='Published'){const e=certificationPublishError(certification);if(e)throw new Error(e)}
 return {path:`/api/certifications/${positiveId(certification?.id,'certification')}/status`,method:'PUT',body:status,groupId:positiveId(groupId,'group')};
}
export function addCertificationCourseRequest(groupId,id,courseId){return {path:`/api/certifications/${positiveId(id,'certification')}/courses`,method:'POST',body:positiveId(courseId,'course'),groupId:positiveId(groupId,'group')}}
export function removeCertificationCourseRequest(groupId,id,courseId){return {path:`/api/certifications/${positiveId(id,'certification')}/courses/${positiveId(courseId,'course')}`,method:'DELETE',body:undefined,groupId:positiveId(groupId,'group')}}
export function reorderCertificationCourseRequest(groupId,id,courseId,order){return {path:`/api/certifications/${positiveId(id,'certification')}/courses/${positiveId(courseId,'course')}`,method:'PUT',body:{order:positiveId(order,'position')},groupId:positiveId(groupId,'group')}}
