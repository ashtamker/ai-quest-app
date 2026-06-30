# AI Quest — JSON Production Plan

## החלטה

לא משתמשים כרגע ב־Database חיצוני. עוברים מ־localStorage לדגם production קל:

- Node server קטן.
- קבצי JSON כ־persistent storage.
- תיקיית uploads לתמונות לוגו.
- frontend ממשיך לעבוד מאותו פרויקט.
- כל שינוי נשמר בקבצים ולכן משותף בין מכשירים.

## למה לא localStorage

localStorage טוב לדמו בלבד:

- כל מכשיר רואה מידע אחר.
- מדריך לא רואה תמונות של תלמידים.
- אין dashboard אמיתי.
- אין ייצוא אמין.
- אי אפשר להפעיל פעילות עם הרבה צוותים.

## מבנה מומלץ

server/
  server.js
  routes/
    teams.js
    events.js
    companies.js
    questions.js
    submissions.js
    checkpoints.js
    instructor.js
    admin.js
  storage/
    JsonStore.js
    FileUploadStore.js
  data/
    events.json
    teams.json
    companies.json
    questions.json
    abilities.json
    model-problems.json
    submissions.json
    checkpoint-requests.json
    instructor-messages.json
  uploads/
    logos/

src/
  domain/
  data/
    repositories/
      ApiRepositories.js
  presentation/

## עקרונות

- Domain נשאר נקי.
- UI קורא ל־Use Cases.
- Use Cases קוראים ל־Repository interfaces.
- Repository implementation עובר מ־localStorage ל־HTTP API.
- השרת הוא Data Layer חיצוני זמני, לא מערבב UI ולוגיקה.

## משימות קטנות כדי לא לשבור

### משימה 1 — JSON server בסיסי

- להקים server Node.
- להגיש את האתר static.
- להוסיף `/api/health`.
- להוסיף JsonStore לקריאה/כתיבה בטוחה לקבצים.

בדיקה:
- האתר עולה.
- `/api/health` מחזיר ok.

### משימה 2 — העברת seed data לקבצי JSON

- להוציא companies/questions/abilities/events/modelProblems מתוך `seed.js` לקבצים.
- להשאיר fallback seed רק לפיתוח.

בדיקה:
- רשימת חברות נטענת מהשרת.

### משימה 3 — Teams API

- `POST /api/teams/session`
- `GET /api/teams/:id`
- `PATCH /api/teams/:id`
- `GET /api/events/:eventId/teams`

בדיקה:
- צוות שנוצר במכשיר אחד מופיע אצל מדריך במכשיר אחר.

### משימה 4 — Submissions + Uploads

- upload תמונת לוגו ל־`server/uploads/logos`.
- שמירת `photoUrl` ב־submissions.json.
- מדריך רואה thumbnail.

בדיקה:
- תלמיד מעלה תמונה.
- מדריך רואה אותה.
- מדריך מסמן תקין/לא תקין.

### משימה 5 — תיקון מודל וניקוד

- לתקן הודעות שלא ייעלמו מהר.
- לא להציג איכות מודל מתוך 100 לתלמיד.
- להציג יכולות שנאספו, חברות שהושלמו ונקודות.
- להשאיר חישוב איכות פנימי אם צריך לסיכום/פרומפט.

בדיקה:
- בחירת יכולות מתקנת מודל ונשמרת.
- תלמיד מבין מה קרה.

### משימה 6 — מדריך production MVP

- dashboard מושך נתונים מהשרת.
- רואה צוותים בזמן אמת באמצעות polling כל 5–10 שניות.
- רואה תמונות.
- מאשר/דוחה צ׳קפוינטים.
- מוסיף בונוס/הודעה.

בדיקה:
- כמה צוותים במקביל מופיעים בדשבורד.

### משימה 7 — אדמין לפי האפיון, בהדרגה

1. ניהול חברות.
2. ניהול שאלות.
3. ניהול בעיות מודל.
4. ניהול אירועים.
5. תרגומים חסרים.
6. ייצוא תוצאות.

### משימה 8 — שאלות חקר טובות יותר

- לכל חברה שאלות ייחודיות.
- לא אותה תשובה נכונה לכל החברות.
- לכל שאלה הסבר לימודי.
- רמות קושי לפי רמת חברה.

## המלצה לביצוע מיידי

להתחיל במשימות 1–4 קודם. בלי זה אין מוצר אמיתי:

1. JSON server.
2. טעינת data מהשרת.
3. שמירת צוותים בשרת.
4. upload תמונות ומדריך רואה אותן.

אחר כך לעבור למשימות 5–6, ואז אדמין מלא.

## בוצע — שלבים 1+2

- נוצר `server.mjs` שמגיש גם static frontend וגם API תחת `/api`.
- נוצר `server/storage/JsonStore.mjs` לקריאה/כתיבה לקבצי JSON.
- נוצרו קבצי runtime תחת `server/data` בעת הרצת השרת.
- נוצרה תיקיית uploads: `server/uploads/logos`.
- נוספו endpoints:
  - `GET /api/health`
  - `GET /api/state`
  - `GET /api/events/by-code/:code`
  - `GET /api/events/:eventId/config`
  - `POST /api/teams/session`
  - `GET /api/teams/:id`
  - `PATCH /api/teams/:id`
  - `GET /api/events/:eventId/teams`
  - `POST /api/submissions/logo-photo`
  - `GET /api/submissions`
  - `PATCH /api/submissions/:id/review`
  - checkpoint/bonus/message endpoints בסיסיים.
- נוסף `ApiRepositories.js` בצד frontend.
- `main.js` בוחר API אם `/api/health` זמין, אחרת fallback ל־localStorage.
- העלאת לוגו נשמרת כקובץ ומחזירה `photoUrl`.
- מדריך מציג thumbnail כאשר submission כולל `photoUrl`.

## בדיקות שבוצעו

- `node --check` לקבצי server/frontend מרכזיים.
- `npm test` עבר.
- `GET /api/health` עבר.
- `POST /api/teams/session` יצר צוות ב־JSON.
- `GET /api/events/event-gav-yam/teams` החזיר צוותים מהשרת.
- `GET /api/events/event-gav-yam/config` החזיר 12 חברות, 24 שאלות, 14 יכולות.
- `POST /api/submissions/logo-photo` שמר קובץ ל־uploads והחזיר `photoUrl`.
- נתוני הבדיקה נוקו לאחר מכן עם `/api/admin/reset-runtime`.

## הערת פריסה חשובה

הגרסה הזו דורשת שרת Node כדי לעבוד כמוצר משותף בין מכשירים. אם מעלים רק static files, האפליקציה תיפול ל־localStorage fallback ולא תהיה מערכת production אמיתית.

## בדיקת פריסה ב־Opal — 2026-06-23

- `https://opal.hai.tech/apps/eduapp/ai-quest/api/health` מחזיר 200 ו־`storage: json`.
- `https://opal.hai.tech/apps/eduapp/ai-quest/api/events/event-gav-yam/config` מחזיר config מלא.
- ה־frontend החי כולל `ApiRepositories` עם זיהוי base path יחסי.
- תוקן טיפול בקובצי upload חסרים כך שיחזיר 404 במקום 502 לאחר restart של השרת.
