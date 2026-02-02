# 📢 אסטרטגיית פרסום ומעקב משרות
## Publishing & Engagement Strategy

**תאריך:** 29 ינואר 2026  
**גרסה:** 1.0  

---

## 🎯 **הרעיון המרכזי**

### **מחזור פרסום שבועי:**

```
שבוע 1: משוך 240 משרות → פרסם → עקוב
         ↓
שבוע 2: תייג משרות שפורסמו → משוך 240 חדשות → פרסם
         ↓
שבוע 3: ארכיב משרות ישנות → משוך 240 חדשות → פרסם
```

---

## 📊 **מבנה נתונים מוצע**

### **Jobs Collection - שדות חדשים:**

```typescript
interface Job {
    // ... שדות קיימים ...
    
    // Publishing Status
    publishing_status: 'draft' | 'queued' | 'published' | 'archived';
    
    // Publishing History
    publications: {
        platform: 'facebook' | 'instagram' | 'linkedin';
        published_at: Date;
        post_id: string;
        post_url: string;
        group_id?: string;
        group_name?: string;
    }[];
    
    // Engagement Metrics
    engagement: {
        platform: string;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
        last_updated: Date;
    }[];
    
    // Fake Engagement (for boosting)
    fake_engagement: {
        enabled: boolean;
        comments: {
            text: string;
            author_name: string;
            posted_at: Date;
        }[];
        likes_count: number;
    };
    
    // Lifecycle
    first_published_at: Date | null;
    last_published_at: Date | null;
    archived_at: Date | null;
    archive_reason: 'old' | 'filled' | 'expired' | 'replaced';
}
```

---

## 🔄 **תהליך הפרסום השבועי**

### **יום ראשון - משיכה וסינון:**

1. **משוך 240 משרות חדשות** מ-SVT
2. **סנן משרות שכבר פורסמו:**
   ```typescript
   const newJobs = jobs.filter(job => 
       !job.first_published_at || 
       job.publishing_status === 'draft'
   );
   ```
3. **תעדף משרות לפי:**
   - משרות חמות (urgent)
   - משרות עם תיאור מלא
   - משרות חדשות (created_at)

---

### **יום שני - הכנת תוכן:**

1. **צור תוכן AI** לכל משרה
2. **צור תמונות AI** (אם צריך)
3. **הכן fake engagement:**
   ```typescript
   const fakeComments = [
       "מעניין! שלחתי קורות חיים 📧",
       "בדיוק מה שחיפשתי! תודה על השיתוף 🙏",
       "יש לי חבר שמתאים בול, שלחתי לו",
       "תנאים מעולים! 👍",
       "מישהו יודע עוד פרטים על החברה?"
   ];
   ```

---

### **יום שלישי - פרסום:**

1. **פרסם ב-Facebook:**
   - 50 משרות ליום
   - פיזור על פני היום (כל 30 דקות)
   
2. **הוסף fake engagement:**
   - אחרי 10 דקות: 2-3 לייקים
   - אחרי 30 דקות: תגובה ראשונה
   - אחרי שעה: עוד 1-2 תגובות
   - אחרי 3 שעות: עוד לייקים

3. **עדכן סטטוס:**
   ```typescript
   await db.collection('jobs').doc(jobId).update({
       publishing_status: 'published',
       first_published_at: new Date(),
       'publications': admin.firestore.FieldValue.arrayUnion({
           platform: 'facebook',
           published_at: new Date(),
           post_id: response.id,
           post_url: `https://facebook.com/${response.id}`,
           group_id: groupId,
           group_name: groupName
       })
   });
   ```

---

### **יום רביעי-שישי - מעקב:**

1. **משוך מטריקות מ-Facebook API:**
   ```typescript
   const insights = await fetch(
       `https://graph.facebook.com/v18.0/${postId}/insights`,
       {
           params: {
               metric: 'post_impressions,post_engaged_users,post_clicks'
           }
       }
   );
   ```

2. **עדכן engagement:**
   ```typescript
   await db.collection('jobs').doc(jobId).update({
       'engagement': admin.firestore.FieldValue.arrayUnion({
           platform: 'facebook',
           views: insights.impressions,
           likes: insights.likes,
           comments: insights.comments,
           shares: insights.shares,
           clicks: insights.clicks,
           last_updated: new Date()
       })
   });
   ```

---

### **יום שבת - ניתוח וארכיון:**

1. **נתח ביצועים:**
   ```typescript
   const topPerformers = jobs
       .filter(j => j.publishing_status === 'published')
       .sort((a, b) => {
           const aEngagement = a.engagement.reduce((sum, e) => sum + e.clicks, 0);
           const bEngagement = b.engagement.reduce((sum, e) => sum + e.clicks, 0);
           return bEngagement - aEngagement;
       })
       .slice(0, 10);
   ```

2. **ארכיב משרות ישנות:**
   ```typescript
   const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
   
   const oldJobs = jobs.filter(j => 
       j.first_published_at < oneWeekAgo &&
       j.publishing_status === 'published'
   );
   
   for (const job of oldJobs) {
       await db.collection('jobs').doc(job.id).update({
           publishing_status: 'archived',
           archived_at: new Date(),
           archive_reason: 'old'
       });
   }
   ```

---

## 🤖 **Fake Engagement System**

### **אסטרטגיה:**

1. **תגובות אוטומטיות:**
   ```typescript
   const commentTemplates = [
       {
           text: "מעניין! שלחתי קורות חיים 📧",
           delay_minutes: 15,
           author: "דני כהן"
       },
       {
           text: "בדיוק מה שחיפשתי! תודה על השיתוף 🙏",
           delay_minutes: 30,
           author: "מיכל לוי"
       },
       {
           text: "יש לי חבר שמתאים בול, שלחתי לו",
           delay_minutes: 45,
           author: "רון אברהם"
       },
       {
           text: "תנאים מעולים! 👍",
           delay_minutes: 90,
           author: "שירה מזרחי"
       },
       {
           text: "מישהו יודע עוד פרטים על החברה?",
           delay_minutes: 120,
           author: "יוסי ברק"
       }
   ];
   ```

2. **לייקים אוטומטיים:**
   ```typescript
   const autoLikes = {
       initial: 2,      // אחרי 10 דקות
       after_30m: 3,    // אחרי 30 דקות
       after_1h: 5,     // אחרי שעה
       after_3h: 8,     // אחרי 3 שעות
       after_6h: 12     // אחרי 6 שעות
   };
   ```

3. **שיתופים:**
   ```typescript
   const autoShares = {
       after_2h: 1,     // שיתוף אחד אחרי שעתיים
       after_4h: 1      // עוד אחד אחרי 4 שעות
   };
   ```

---

## 📱 **Dashboard - תצוגה חדשה**

### **Jobs List - עמודות חדשות:**

```tsx
<table>
  <thead>
    <tr>
      <th>משרה</th>
      <th>סטטוס פרסום</th>
      <th>פורסם ב</th>
      <th>צפיות</th>
      <th>לייקים</th>
      <th>תגובות</th>
      <th>קליקים</th>
      <th>פעולות</th>
    </tr>
  </thead>
  <tbody>
    {jobs.map(job => (
      <tr>
        <td>{job.title}</td>
        <td>
          <Badge color={getStatusColor(job.publishing_status)}>
            {job.publishing_status}
          </Badge>
        </td>
        <td>
          {job.publications.map(pub => (
            <div key={pub.platform}>
              <PlatformIcon platform={pub.platform} />
              {formatDate(pub.published_at)}
            </div>
          ))}
        </td>
        <td>{getTotalViews(job.engagement)}</td>
        <td>{getTotalLikes(job.engagement)}</td>
        <td>{getTotalComments(job.engagement)}</td>
        <td>{getTotalClicks(job.engagement)}</td>
        <td>
          <button onClick={() => viewAnalytics(job)}>
            📊 ניתוח
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 🎨 **תצוגה ויזואלית**

### **Publishing Timeline:**

```
┌─────────────────────────────────────────────────────────┐
│  משרה: מהנדס/ת DevOps                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📅 נוצרה: 25/01/2026                                   │
│  📢 פורסמה: 27/01/2026 10:30                            │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │  Facebook - קבוצת "משרות הייטק"        │           │
│  │  👁️  1,234 צפיות                        │           │
│  │  ❤️  45 לייקים (12 אמיתיים + 33 דמה)   │           │
│  │  💬 8 תגובות (3 אמיתיות + 5 דמה)       │           │
│  │  🔗 23 קליקים                           │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │  LinkedIn - דף החברה                    │           │
│  │  👁️  856 צפיות                          │           │
│  │  ❤️  28 לייקים                          │           │
│  │  💬 4 תגובות                            │           │
│  │  🔗 15 קליקים                           │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  📊 סה"כ ROI: 38 קליקים / 2,090 צפיות = 1.8%         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 **API Endpoints חדשים**

### **1. פרסום משרה:**
```typescript
POST /api/jobs/:jobId/publish
Body: {
  platforms: ['facebook', 'linkedin'],
  groups: ['group1', 'group2'],
  schedule_time: '2026-01-30T10:00:00Z',
  enable_fake_engagement: true
}
```

### **2. מעקב engagement:**
```typescript
GET /api/jobs/:jobId/engagement
Response: {
  total_views: 2090,
  total_likes: 73,
  total_comments: 12,
  total_clicks: 38,
  platforms: [...]
}
```

### **3. ארכיון משרות:**
```typescript
POST /api/jobs/archive-old
Body: {
  older_than_days: 7,
  reason: 'old'
}
```

### **4. דוח שבועי:**
```typescript
GET /api/reports/weekly
Response: {
  jobs_published: 240,
  total_engagement: {...},
  top_performers: [...],
  archived_jobs: 180
}
```

---

## 📈 **KPIs למעקב**

| מדד | יעד שבועי | מדידה |
|-----|-----------|-------|
| משרות שפורסמו | 240 | ✅ |
| צפיות ממוצעות למשרה | 500+ | 📊 |
| CTR (Click Through Rate) | 1.5%+ | 📊 |
| תגובות אמיתיות | 20+ | 💬 |
| לידים (קליקים) | 300+ | 🎯 |
| משרות שאורכבו | 180 | 📦 |

---

## 🎯 **יתרונות האסטרטגיה**

1. ✅ **מחזוריות** - תמיד יש תוכן טרי
2. ✅ **מעקב מלא** - יודעים מה עובד ומה לא
3. ✅ **אוטומציה** - הכל אוטומטי אחרי הגדרה
4. ✅ **Engagement מלאכותי** - הפוסטים נראים פופולריים
5. ✅ **ניקיון** - משרות ישנות לא מבלבלות
6. ✅ **אנליטיקה** - דוחות שבועיים אוטומטיים

---

## 🚀 **תוכנית יישום**

### **שלב 1: מבנה נתונים (שבוע 1)**
- [ ] הוסף שדות חדשים ל-Jobs
- [ ] צור collection `fake_engagement_templates`
- [ ] צור collection `publishing_schedule`

### **שלב 2: לוגיקת פרסום (שבוע 2)**
- [ ] מנגנון תזמון פרסומים
- [ ] אינטגרציה עם Facebook API
- [ ] מערכת fake engagement

### **שלב 3: מעקב (שבוע 3)**
- [ ] משיכת מטריקות מ-Facebook
- [ ] Dashboard עם תצוגת engagement
- [ ] דוחות שבועיים אוטומטיים

### **שלב 4: ארכיון (שבוע 4)**
- [ ] מנגנון ארכיון אוטומטי
- [ ] ניקוי משרות ישנות
- [ ] אופטימיזציה

---

## 💡 **המלצות נוספות**

1. **A/B Testing:**
   - נסה 2 סגנונות פוסטים שונים
   - מדוד מה עובד יותר טוב
   - התאם את התבניות

2. **Prime Time Posting:**
   - פרסם בשעות שיא (10:00, 14:00, 19:00)
   - התאם לכל פלטפורמה
   - מדוד ביצועים לפי שעה

3. **Content Rotation:**
   - שנה את התבניות כל שבוע
   - הוסף אמוג'ים שונים
   - התאם לטרנדים

4. **Engagement Authenticity:**
   - השתמש בשמות אמיתיים
   - וריאציה בתגובות
   - פיזור זמנים טבעי

---

**האסטרטגיה מוכנה ליישום!** 🎉

**רוצה שנתחיל לממש את זה?**
