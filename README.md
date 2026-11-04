# NBA 오늘의 퀴즈는?

KB Leopards 리그원과 함께하는 NBA 일일 기록 퀴즈 사이트.

- 사이트: GitHub Pages (`index.html`, `app.js`)
- 로그인·데이터: Firebase (구글 로그인 + Firestore)
- 보안 규칙: `firestore.rules` 내용을 Firebase 콘솔 › Firestore › 규칙 탭에 붙여넣고 게시
- 관리자: `app.js`의 `ADMINS`와 `firestore.rules`의 `isAdmin()` 이메일 목록
