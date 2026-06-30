# AI Quest App

אפליקציית פעילות חינוכית לצוותי תלמידים ומדריכים, סביב חקר חברות AI/טכנולוגיה בגב־ים נגב.

## הרצה מקומית

```bash
npm install
npm start
```

ברירת מחדל:
- שרת: `http://127.0.0.1:4173` אם מריצים עם `PORT=4173`, או הפורט שהוגדר בסביבה.
- בדיקות: `npm test`

## בדיקות

```bash
npm test
```

## הערות Git

לא נכנסים לריפו:
- `node_modules/`
- `server/uploads/`
- נתוני ריצה חיים: `teams`, `submissions`, `checkpoint-requests`, `instructor-messages`
- `.herenow/`

ה־seed והגדרות האירועים נמצאים בקוד/JSON, כולל אירועי `בוקר` ו־`צהריים`.
