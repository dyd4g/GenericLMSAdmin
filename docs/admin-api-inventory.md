# Admin frontend API call inventory

Static inventory of request call sites in LMSAdmin. No requests were executed and account permissions were not tested. URL expressions preserve dynamic parameters and query builders. Request body entries are source expressions, not runtime values.

## Configured service URLs

| Code name | Current local configuration |
|---|---|
| __SERVER_API__ | https://api.rsti-dev.dyd.solutions/learning |
| __AUTH_API__ | https://api.rsti-dev.dyd.solutions/identity |
| __LICENSES_API__ | https://api.rsti-dev.dyd.solutions/licenses |
| __BOOK_API__ | https://api.rsti-dev.dyd.solutions/books |
| __MARKETPLACE_API__ | https://api.rsti-dev.dyd.solutions/marketplace |
| __ANALYTICS_API__ | https://api.rsti-dev.dyd.solutions/analytics |
| __EMAILMARKETING_API__ | (not configured) |
| __SUBSCRIPTION_API__ | https://api.rsti-dev.dyd.solutions/subscriptions |
| ALERTS_API | https://api.rsti-dev.dyd.solutions/alerts |
| AUTH_URL | http://localhost:3002 |

## Calls


### src/domain/auth.ts

| Function | Method | URL expression | Body expression | Source line |
|---|---|---|---|---|
| APIPostRefreshToken | POST | ${AUTH_URL}/api/refresh |  | 17 |

### src/domain/services/as-admin.ts

| Function | Method | URL expression | Body expression | Source line |
|---|---|---|---|---|
| getAdminGroup | GET | ${__SERVER_API__}/api/groups/${encodeURIComponent(groupId)} |  | 118 |
| approveMembership | POST | ${__SERVER_API__}/api/groups/${encodeURIComponent( groupId )}/members/${encodeURIComponent(memberId)}/approve |  | 133 |
| getMembers | GET | ${ALERTS_API}/alerts/${id} |  | 161 |
| setAsAdmin | PUT | ${__SERVER_API__}/api/groups/${encodeURIComponent( groupId )}/members/${encodeURIComponent(memberId)}/role | 'Admin' | 168 |
| setAsNonAdmin | PUT | ${__SERVER_API__}/api/groups/${encodeURIComponent( groupId )}/members/${encodeURIComponent(memberId)}/role | 'Member' | 180 |
| getAdminCourse | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)} |  | 191 |
| approveUser | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/trainees/${encodeURIComponent(traineeId)}/approve |  | 200 |
| getTrainees | GET | ${ALERTS_API}/alerts/${id} |  | 242 |
| getCoaches | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/coaches |  | 248 |
| assignCoach | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/trainees/${encodeURIComponent(traineeId)}/coach | postData | 258 |
| unAssignCoach | DELETE | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/trainees/${encodeURIComponent(traineeId)}/coach/${encodeURIComponent( coachId )} |  | 271 |
| removeCoach | DELETE | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/coaches/${encodeURIComponent(coachId)} |  | 284 |
| getTraineeCandidates | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/traineeCandidates?${queryString} |  | 299 |
| updateCourseKey | PUT | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/courses/${encodeURIComponent(courseId)}/traineeLicenses/${keyId} | postData | 318 |
| updateCourseCoachKey | PUT | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/courses/${encodeURIComponent(courseId)}/coachLicenses/${keyId} | postData | 332 |
| updateCoachesWithCourseKey | POST | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/courses/${encodeURIComponent(courseId)}/traineeLicenses/${keyId}/coaches | postData | 352 |
| deleteCoachWithCourseKey | DELETE | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/courses/${encodeURIComponent( courseId )}/traineeLicenses/${keyId}/coaches/${coachId} |  | 366 |
| updateBookKey | PUT | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/books/${encodeURIComponent(bookId)}/licenses/${keyId} | postData | 381 |
| addCourseKey | POST | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/courses/${encodeURIComponent(courseId)}/traineeLicenses/generate | postData | 394 |
| addCourseCoachKey | POST | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/courses/${encodeURIComponent(courseId)}/coachLicenses/generate | postData | 407 |
| addBookKey | POST | ${__LICENSES_API__}/groups/${encodeURIComponent( groupId )}/books/${encodeURIComponent(bookId)}/licenses/generate | postData | 420 |
| addAsset | POST | ${__SERVER_API__}/api/Users/${encodeURIComponent( postData )}/traineeCourses | courseId | 432 |
| getCourseKeys | GET | ${__LICENSES_API__}/groups/${encodeURIComponent( groupdId )}/courses/${encodeURIComponent(courseId)}/traineeLicenses?${queryString} |  | 461 |
| getCourseCoachKeys | GET | ${__LICENSES_API__}/groups/${encodeURIComponent( groupdId )}/courses/${encodeURIComponent(courseId)}/coachLicenses?${queryString} |  | 489 |
| getBookKeys | GET | ${__LICENSES_API__}/groups/${encodeURIComponent( groupdId )}/books/${encodeURIComponent(bookId)}/licenses?${queryString} |  | 517 |
| getCoachCandidates | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/coachCandidates?${queryString} |  | 532 |
| addCoach | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/coaches | postData | 543 |
| createCourse | POST | ${__SERVER_API__}/api/groups/${encodeURIComponent(groupId)}/courses | postData | 553 |
| deleteCourse | DELETE | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)} |  | 559 |
| updateCourse | PUT | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)} | postData | 568 |
| saveImage | POST | ${__SERVER_API__}/api/images | image | 575 |
| updateCourseImage | PUT | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/image | image | 582 |
| updateGroupImage | PUT | ${__SERVER_API__}/api/groups/${encodeURIComponent(groupId)}/image | image | 592 |
| createLesson | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/lessons | postData | 602 |
| deleteLesson | DELETE | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)} |  | 609 |
| updateLesson | PUT | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)} | postData | 618 |
| createContent | POST | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)}/contents | postData | 628 |
| getContent | GET | ${__SERVER_API__}/api/contents/${encodeURIComponent(contentId)} |  | 635 |
| deleteContent | DELETE | ${__SERVER_API__}/api/contents/${encodeURIComponent(contentId)} |  | 641 |
| updateContent | PUT | ${__SERVER_API__}/api/contents/${encodeURIComponent(contentId)} | payload | 650 |
| removeCourseImage | DELETE | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/image |  | 657 |
| removeGroupImage | DELETE | ${__SERVER_API__}/api/groups/${encodeURIComponent(groupId)}/image |  | 663 |
| createForms | POST | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)}/forms | postData | 678 |
| createTest | POST | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)}/tests | postData | 688 |
| updateForms | PUT | ${__SERVER_API__}/api/forms/${encodeURIComponent(formId)} | payload | 698 |
| updateTest | PUT | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)} | payload | 708 |
| deleteForm | DELETE | ${__SERVER_API__}/api/forms/${encodeURIComponent(formId)} |  | 715 |
| deleteTest | DELETE | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)} |  | 721 |
| createQuestions | POST | ${__SERVER_API__}/api/forms/${encodeURIComponent(formId)}/questions | payload | 730 |
| getForm | GET | ${__SERVER_API__}/api/forms/${encodeURIComponent(formId)} |  | 737 |
| getTest | GET | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)} |  | 741 |
| getMeeting | GET | ${__SERVER_API__}/api/meetings/${encodeURIComponent(meetingId)} |  | 745 |
| deleteQuestion | DELETE | ${__SERVER_API__}/api/questions/${encodeURIComponent(questionId)} |  | 751 |
| createQuestionOptions | POST | ${__SERVER_API__}/api/questions/${encodeURIComponent(questionId)}/options | options | 766 |
| createSubQuestions | POST | ${__SERVER_API__}/api/questions/${encodeURIComponent( questionId )}/subQuestions | options | 782 |
| updateQuestion | PUT | ${__SERVER_API__}/api/questions/${encodeURIComponent(question.id)} | question | 791 |
| setExpectedOptions | POST | ${__SERVER_API__}/api/questions/${encodeURIComponent( questionId )}/expectedOptions | expectedAnswer | 801 |
| setExpectedSubQuestionAnswer | POST | ${__SERVER_API__}/api/subQuestions/${encodeURIComponent( subQuestionId )}/expectedOptions | expectedAnswer | 813 |
| updateQuestionOptions | PUT | ${__SERVER_API__}/api/options/${encodeURIComponent(optionId)} | questionOption | 831 |
| updateExpectedAnswer | PUT | ${__SERVER_API__}/api/questions/${encodeURIComponent( questionId )}/expectedAnswer | expectedAnswer | 841 |
| updateSubQuestionOptions | PUT | ${__SERVER_API__}/api/subQuestions/${encodeURIComponent(subQuestionId)} | subQuestionOption | 859 |
| deleteOption | DELETE | ${__SERVER_API__}/api/options/${encodeURIComponent(optionId)} |  | 865 |
| deleteSubQuestion | DELETE | ${__SERVER_API__}/api/subQuestions/${encodeURIComponent(subQuestionId)} |  | 872 |
| deleteSubQuestionExpectedAnswer | DELETE | ${__SERVER_API__}/api/subQuestions/${encodeURIComponent( subQuestionId )}/expectedOptions/${encodeURIComponent(optionId)} |  | 881 |
| deleteQuestionExpectedAnswer | DELETE | ${__SERVER_API__}/api/expectedOptions/${encodeURIComponent(answerId)} |  | 891 |
| updateGroup | PUT | ${__SERVER_API__}/api/groups/${encodeURIComponent(groupId)} | postData | 900 |
| createMeeting | POST | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)}/meetings | payload | 910 |
| deleteMeeting | DELETE | ${__SERVER_API__}/api/meetings/${encodeURIComponent(meetingId)} |  | 917 |
| updateMeeting | PUT | ${__SERVER_API__}/api/meetings/${encodeURIComponent(meetingId)} | payload | 926 |
| updateCourseStatus | PUT | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/${encodeURIComponent(status)} | '' | 953 |
| getCategories | GET | ${__SERVER_API__}/api/categories |  | 962 |
| getAdminGroupCourses | GET | ${__SERVER_API__}/api/groups/${encodeURIComponent( groupId )}/courses?${queryString} |  | 992 |
| getParticipantCourseLessons | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/lessons |  | 1004 |
| getUsers | GET | ${__AUTH_API__}/api/users?${queryString}${filterString} |  | 1035 |
| postUser | POST | ${__AUTH_API__}/api/users | body | 1039 |
| getUser | GET | ${__AUTH_API__}/api/users/${encodeURIComponent(userId)} |  | 1043 |
| sendConfirmationMail | POST | ${__AUTH_API__}/api/users/${encodeURIComponent( userId )}/sendconfirmemailmessage | userId | 1047 |
| updateUser | PUT | ${__AUTH_API__}/api/users/${user.id} | user | 1055 |
| deleteUser | DELETE | ${__AUTH_API__}/api/users/${encodeURIComponent(userId)}?${qs.stringify({ keepAnalytics, })} |  | 1062 |
| updateUserPassword | PUT | ${__AUTH_API__}/api/users/${encodeURIComponent(userId)}/password | password | 1073 |
| getUserGroups | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent(userId)}/groups |  | 1080 |
| getAllGroups | GET | ${__SERVER_API__}/api/myAdminGroups?${queryString} |  | 1097 |
| getTraineeCourses | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/traineeCourses?${queryString} |  | 1108 |
| getCoachCourses | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent(userId)}/coachCourses |  | 1118 |
| getCertificate | GET | ${__SERVER_API__}/api/trainee/courses/${encodeURIComponent( courseId )}/certificate |  | 1126 |
| deleteTrainee | DELETE | ${__SERVER_API__}/api/Users/${encodeURIComponent( traineeId )}/traineeCourses/${encodeURIComponent(courseId)} |  | 1137 |
| searchAllGroups | GET | ${__SERVER_API__}/api/myAdminGroups?${queryString} |  | 1152 |
| addMemberToGroup | POST | ${__SERVER_API__}/api/Users/${encodeURIComponent(userId)}/groups | groupId | 1159 |
| downloadCertificate | GET | ${__SERVER_API__}/api/trainee/${encodeURIComponent( traineeId )}/courses/${encodeURIComponent(courseId)}/certificate |  | 1169 |
| getCourseCandidates | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/traineeCourseCandidates?${queryString} |  | 1185 |
| postReferral | POST | ${__ANALYTICS_API__}/partners | body | 1193 |
| updateReferral | PUT | ${__ANALYTICS_API__}/partners/${encodeURIComponent(referral.id)} | referral | 1197 |
| getReferral | GET | ${__ANALYTICS_API__}/partners/${encodeURIComponent(referralId)} |  | 1206 |
| getReferrals | GET | ${__ANALYTICS_API__}/partners?${queryString} |  | 1217 |
| getUserReferralsCandidates | GET | ${__ANALYTICS_API__}/partners/byReps/${encodeURIComponent( userId )}/candidates?${queryString} |  | 1227 |
| getUserReferrals | GET | ${__ANALYTICS_API__}/partners/byReps/${encodeURIComponent(userId)} |  | 1237 |
| postUserReferrals | POST | ${__ANALYTICS_API__}/partners/${encodeURIComponent(id)}/reps | body | 1246 |
| deleteUserReferrals | DELETE | ${__ANALYTICS_API__}/partners/${id}/reps/${encodeURIComponent(userId)} |  | 1256 |
| getPartnerCategories | GET | ${__ANALYTICS_API__}/partners/categories |  | 1262 |
| postDuplicateCourse | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/clone |  | 1272 |
| postDuplicateLesson | POST | ${__SERVER_API__}/api/lessons?${queryString} |  | 1282 |
| downloadTranscript | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent(traineeId)}/transcript |  | 1288 |
| downloadTraineeResponse | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/formResponses?${queryString} |  | 1304 |
| postCoachQualifyingCourse | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/coachQualifyingCourses | qualifyingCourseId | 1318 |
| removeQualifyingCourse | DELETE | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/coachQualifyingCourses/${encodeURIComponent(qualifyingCourseId)} |  | 1330 |
| getCoachQualifyingCourseCandidates | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/coachQualifyingCourseCandidates?${queryString} |  | 1349 |
| getUserCourseCompletionDetails | GET | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/trainees/${encodeURIComponent(traineeId)}/lessons |  | 1360 |
| postTaskAsCompleted | POST | ${__SERVER_API__}/api/trainees/${encodeURIComponent( userId )}/task/${encodeURIComponent(taskId)}/finish |  | 1371 |
| getAssignments | GET | ${__SERVER_API__}/api/assignments/${encodeURIComponent(assignmentId)} |  | 1381 |
| createAssignment | POST | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)}/assignments | payload | 1390 |
| updateAssignment | PUT | ${__SERVER_API__}/api/assignments/${encodeURIComponent(assignmentId)} | payload | 1400 |
| deleteAssignment | DELETE | ${__SERVER_API__}/api/assignments/${encodeURIComponent(assignmentId)} |  | 1407 |
| postDuplicateAssignment | POST | ${__SERVER_API__}/api/assignments?${queryString} |  | 1419 |
| createCertification | POST | ${__SERVER_API__}/api/certifications?${queryString} | body | 1430 |
| getCertificationList | GET | ${__SERVER_API__}/api/groups/${encodeURIComponent( groupId )}/certifications?${queryString} |  | 1454 |
| getCertification | GET | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )} |  | 1464 |
| updateCertification | PUT | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )} | body | 1475 |
| duplicateCertification | POST | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )}/clone |  | 1486 |
| deleteCertification | DELETE | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )} |  | 1496 |
| getCertificationEligibleCourses | GET | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )}/courseCandidates?${queryString} |  | 1510 |
| addCourseForCertification | POST | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )}/courses | body | 1521 |
| deleteCertificationCourse | DELETE | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )}/courses/${encodeURIComponent(courseId)} |  | 1533 |
| updateCertificationCourseOrder | PUT | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )}/courses/${encodeURIComponent(courseId)} | body | 1545 |
| updateCertificationStatus | PUT | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )}/status | body | 1557 |
| getCertificationsByUser | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/traineeCertifications?${queryString} |  | 1571 |
| getCertificationCandidates | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/traineeCertificationCandidates?${queryString} |  | 1585 |
| enrollToCertification | POST | ${__SERVER_API__}/api/Users/${encodeURIComponent( body )}/traineeCertifications | certificationId | 1596 |
| unenrollFromCertification | DELETE | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/traineeCertifications/${encodeURIComponent(certificationId)} |  | 1608 |
| getBooksByUser | GET | ${__BOOK_API__}/Users/${userId}/books |  | 1618 |
| getBookCandidates | GET | ${__BOOK_API__}/Users/${userId}/bookCandidates?${queryString} |  | 1628 |
| assignUserBook | POST | ${__BOOK_API__}/Users/${userId}/books/${bookId} |  | 1637 |
| unassignUserBook | DELETE | ${__BOOK_API__}/Users/${userId}/books/${bookId} |  | 1646 |
| externalProductLocations | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/externalProductLocations | body | 1655 |
| updateRevise | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/revise |  | 1664 |
| updateUnRevise | POST | ${__SERVER_API__}/api/courses/${encodeURIComponent(courseId)}/unrevise |  | 1670 |
| removeGroupMembership | DELETE | ${__SERVER_API__}/api/Users/${encodeURIComponent( memberId )}/groups/${encodeURIComponent(groupId)} |  | 1679 |
| getCertificationParticipants | GET | ${ALERTS_API}/alerts/${id} |  | 1699 |
| approveCertificationParticipant | POST | ${__SERVER_API__}/api/certifications/${encodeURIComponent( certificationId )}/trainees/${encodeURIComponent(traineeId)}/approve |  | 1706 |
| createGroup | POST | ${__SERVER_API__}/api/groups | body | 1714 |
| deleteLocation | DELETE | ${__SERVER_API__}/api/courses/${encodeURIComponent( courseId )}/externalProductLocations/${encodeURIComponent(locationId)} |  | 1727 |
| deleteGroup | DELETE | ${__SERVER_API__}/api/groups/${encodeURIComponent(groupId)} |  | 1735 |
| getBooks | GET | ${__BOOK_API__}/Groups/${encodeURIComponent(groupId)}/Books?${queryString} |  | 1756 |
| removeBookFromCourse | DELETE | ${__SERVER_API__}/api/Courses/${encodeURIComponent( courseId )}/books/${encodeURIComponent(bookId)} |  | 1765 |
| getCourseBookCandidates | GET | ${__SERVER_API__}/api/Courses/${encodeURIComponent( courseId )}/bookCandidates?${queryString} |  | 1788 |
| createBook | POST | ${__BOOK_API__}/Groups/${encodeURIComponent(groupId)}/Books | body | 1799 |
| createBookByCourseId | POST | ${__SERVER_API__}/api/Courses/${encodeURIComponent(courseId)}/books | body | 1815 |
| updateBook | PUT | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)} | body | 1826 |
| updateBookImage | PUT | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/cover | file | 1845 |
| removeBook | DELETE | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)} |  | 1863 |
| updateBookStatus | PUT | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/status | body | 1881 |
| removeBookImage | DELETE | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/cover |  | 1899 |
| getBookById | GET | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)} |  | 1916 |
| updateBookFile | PUT | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/file | file | 1934 |
| removeBookFile | DELETE | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/file |  | 1952 |
| updateRevisionStatus | PUT | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/revisionStatus | body | 1970 |
| bookExternalProductLocations | POST | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/externalProductLocations | body | 1989 |
| removeBookLocation | DELETE | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent( bookId )}/externalProductLocations/${encodeURIComponent(locationId)} |  | 2008 |
| getPartnerData | GET | ${__ANALYTICS_API__}/partners?${getQueryString( inputValue )}&${encodedLanguage} |  | 2038 |
| getPartnerDataById | GET | ${__ANALYTICS_API__}/partners/${encodeURIComponent(id)} |  | 2054 |
| getReferralInfo | GET | ${__ANALYTICS_API__}/Users/${encodeURIComponent( userId )}/Referrals/platform |  | 2068 |
| saveReferralInfo | PUT | ${__ANALYTICS_API__}/Users/${encodeURIComponent( userId )}/Referrals/platform | { partnerId, isEmployee, } | 2080 |
| getAdminCourseCandidates | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/adminCourseCandidates?${queryString} |  | 2102 |
| addAdminCourses | POST | ${__SERVER_API__}/api/Users/${encodeURIComponent(userId)}/adminCourses | postData | 2113 |
| getAdminCourses | GET | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/adminCourses?${queryString} |  | 2127 |
| unEnrollFromAdminCourse | DELETE | ${__SERVER_API__}/api/Users/${encodeURIComponent( userId )}/adminCourses/${encodeURIComponent(courseId)} |  | 2138 |
| getAllMyAdminCourses | GET | ${__SERVER_API__}/api/myAdminCourses?${queryString} |  | 2156 |
| getBookReaders | GET | ${__BOOK_API__}/Groups/${encodeURIComponent( groupId )}/Books/${encodeURIComponent(bookId)}/readers |  | 2163 |
| getCourseAttributes | GET | ${__MARKETPLACE_API__}/groups/${encodeURIComponent(groupId)}/attributes |  | 2179 |
| getCourseAttributeValues | GET | ${__MARKETPLACE_API__}/groups/${encodeURIComponent( groupId )}/attributes/${encodeURIComponent(attributeId)}/values |  | 2194 |
| getCourseAttributeData | GET | ${__MARKETPLACE_API__}/products/courses/${encodeURIComponent(courseId)} |  | 2229 |
| updateCourseProductAttribute | PUT | ${__MARKETPLACE_API__}/products/Courses/${encodeURIComponent(courseId)} | body | 2238 |
| updateProductCourseAttribute | POST | ${__MARKETPLACE_API__}/groups/${encodeURIComponent( groupId )}/products/${encodeURIComponent( productId )}/attributes/${attributeName}/values | attributeValue | 2250 |
| getCourseProductData | GET | ${__MARKETPLACE_API__}/groups/${encodeURIComponent( groupId )}/products/${encodeURIComponent(productId)} |  | 2264 |
| deleteCourseProduct | DELETE | ${__MARKETPLACE_API__}/groups/${encodeURIComponent( groupId )}/Products/${encodeURIComponent( productId )}/attributes/${attributeName}/values/${attributeValue} |  | 2283 |
| postAttribute | POST | ${__MARKETPLACE_API__}/stores/${encodeURIComponent(storeId)}/attributes | data | 2300 |
| removeAttribute | DELETE | ${__MARKETPLACE_API__}/stores/${encodeURIComponent( storeId )}/attributes/${encodeURIComponent(attributeId)} |  | 2316 |
| postAttributeValue | POST | ${__MARKETPLACE_API__}/stores/${encodeURIComponent( storeId )}/attributes/${encodeURIComponent(attributeId)}/values | data | 2338 |
| removeAttributeValue | DELETE | ${__MARKETPLACE_API__}/stores/${encodeURIComponent( storeId )}/attributes/${encodeURIComponent( attributeId )}/values/${encodeURIComponent(attributeValueId)} |  | 2357 |
| getAdminGroupStore | GET | ${__MARKETPLACE_API__}/Groups/${encodeURIComponent(groupId)}/stores |  | 2375 |
| getUserReferral | GET | ${__ANALYTICS_API__}/Users/${encodeURIComponent(userId)} |  | 2387 |
| getUserEmailSettings | GET | ${__EMAILMARKETING_API__}/Users/${encodeURIComponent(userId)}/settings |  | 2393 |
| updateUserEmailSettings | PUT | ${__EMAILMARKETING_API__}/Users/${encodeURIComponent(userId)}/settings | body | 2403 |
| getAlerts | GET | ${ALERTS_API}/alerts/${id} |  | 2411 |
| updateAlert | PUT | ${ALERTS_API}/alerts/${id} | result.data | 2439 |
| getUserRolesById | GET | ${__AUTH_API__}/api/users/${userId} |  | 2454 |
| deleteUserRole | DELETE | ${__AUTH_API__}/api/users/${userId}/roles/${roleId} |  | 2473 |
| assignUserRole | POST | ${__AUTH_API__}/api/Users/${encodeURIComponent(userId)}/roles | roleId | 2490 |
| getUserRoles | GET | ${__AUTH_API__}/api/roles |  | 2506 |
| createVideoTask | POST | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)}/videos | postData | 2524 |
| initVideoUpload | PUT | ${__SERVER_API__}/api/videos/${encodeURIComponent(videoId)}/upload | body | 2534 |
| finishVideoUpload | POST | ${__SERVER_API__}/api/videos/${encodeURIComponent(videoId)}/upload/finish |  | 2541 |
| removeVideoUpload | DELETE | ${__SERVER_API__}/api/videos/${encodeURIComponent(videoId)}/upload |  | 2547 |
| getVideoTask | GET | ${__SERVER_API__}/api/videos/${encodeURIComponent(videoId)} |  | 2553 |
| updateVideoTask | PUT | ${__SERVER_API__}/api/videos/${encodeURIComponent(videoId)} | payload | 2562 |
| deleteVideoTask | DELETE | ${__SERVER_API__}/api/videos/${encodeURIComponent(videoId)} |  | 2569 |
| createXApiTask | POST | ${__SERVER_API__}/api/lessons/${encodeURIComponent(lessonId)}/xApiActivities | postData | 2578 |
| updateXApiTask | PUT | ${__SERVER_API__}/api/xApiActivities/${encodeURIComponent(xApiId)} | payload | 2588 |
| deleteXApiTask | DELETE | ${__SERVER_API__}/api/xApiActivities/${encodeURIComponent(xApiId)} |  | 2595 |
| getXApiTask | GET | ${__SERVER_API__}/api/xApiActivities/${encodeURIComponent(xApiId)} |  | 2601 |
| createNewAttribute | POST | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)}/attributes | payload | 2678 |
| updateAttribute | PUT | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)}/attributes/${encodeURIComponent(attributeId)} | payload | 2689 |
| deleteAttribute | DELETE | ${__SERVER_API__}/api/tests/${encodeURIComponent( testId )}/attributes/${encodeURIComponent(attributeId)} |  | 2699 |
| createNewOutcome | POST | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)}/outcomes | payload | 2710 |
| updateOutcome | PUT | ${__SERVER_API__}/api/tests/${encodeURIComponent( testId )}/outcomes/${encodeURIComponent(outcomeId)} | payload | 2727 |
| deleteOutcome | DELETE | ${__SERVER_API__}/api/tests/${encodeURIComponent( testId )}/outcomes/${encodeURIComponent(outcomeId)} |  | 2739 |
| createDimension | POST | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)}/dimensions | payload | 2750 |
| updateDimension | PUT | ${__SERVER_API__}/api/tests/${encodeURIComponent( testId )}/dimensions/${encodeURIComponent(dimensionId)} | payload | 2762 |
| removeDimension | DELETE | ${__SERVER_API__}/api/tests/${encodeURIComponent(testId)}/dimensions/${encodeURIComponent(dimensionId)} |  | 2775 |
| assignPointsToGridOption | POST | ${__SERVER_API__}/api/tests/${encodeURIComponent( params.testId )}/subQuestions/${encodeURIComponent( params.subQuestionId )}/options/${encodeURIComponent(params.optionId)}/points | params.payload | 2790 |
| removePointsFromGridOption | DELETE | ${__SERVER_API__}/api/tests/${encodeURIComponent( params.testId )}/subQuestions/${encodeURIComponent( params.subQuestionId )}/options/${encodeURIComponent(params.optionId)}/points | params.payload | 2806 |
| createExpressionScoreNormalizer | POST | ${__SERVER_API__}/api/tests/${encodeURIComponent( testId )}/attributes/${encodeURIComponent(attributeId)}/expressionScoreNormalizers | payload | 2832 |
| deleteScoreNormalizer | DELETE | ${__SERVER_API__}/api/tests/${encodeURIComponent( testId )}/attributes/${encodeURIComponent( attributeId )}/scoreNormalizers/${encodeURIComponent(normalizerId)} |  | 2861 |
| createLookupTableScoreNormalizer | POST | ${__SERVER_API__}/api/tests/${encodeURIComponent( testId )}/attributes/${encodeURIComponent(attributeId)}/lookupTableScoreNormalizers | payload | 2879 |

### src/domain/services/as-user.ts

| Function | Method | URL expression | Body expression | Source line |
|---|---|---|---|---|
| getUserProfile | GET | ${__AUTH_API__}/api/account/userinfo |  | 6 |

### src/domain/services/subscription.ts

| Function | Method | URL expression | Body expression | Source line |
|---|---|---|---|---|
| getActivePlan | GET | ${__SUBSCRIPTION_API__}/groups/${groupId}/plans/current |  | 9 |

## Additional network operations

- Authentication logout: browser navigation to AUTH_URL/api/logout with a continue query parameter (src/domain/auth.ts).
- Azure uploads: BlockBlobClient.uploadData uses the upload URL supplied at runtime (src/domain/services/azure-blob-upload.ts).
- Vimeo uploads: tus-js-client uploads to a runtime URL; protocol requests are managed by the library (src/domain/services/tus.ts and vimeo-upload.ts).
- Images, translations, and other browser assets are not counted as API call sites.
- Authentication portal requests are in the separate LMSAuth project and are outside this admin inventory.
