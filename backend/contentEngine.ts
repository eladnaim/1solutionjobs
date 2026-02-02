import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize Gemini
// Note: In production, ensure process.env.GEMINI_API_KEY is set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

export interface JobContent {
    original_title: string;
    description: string;
    location: string;
}

export interface GeneratedContent {
    viral_post_a: string;
    viral_post_b: string;
    professional_post: string;
    urgent_post: string;
    suggested_hashtags: string[];
    image_prompt: string;
    image_url?: string;
}

export async function generateJobContent(job: JobContent): Promise<GeneratedContent> {
    const roleTitle = (job.original_title && job.original_title !== 'undefined') ? job.original_title : 'משרה חדשה';
    const area = (job.location && job.location !== 'undefined') ? job.location : 'ישראל';
    const desc = job.description || '';

    console.log(`[Content Engine] 🚀 Generating MEGA-PREMIUM content for: ${roleTitle} in ${area}`);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
        You are the World's Best HR Copywriter & Social Media Growth Expert.
        Your mission: Transform the provided job description into a VIRAL, BEAUTIFUL, and HIGHLY ACCURATE social media campaign.
        
        CONTEXT:
        - Job Title: ${roleTitle}
        - Location: ${area}
        - Full Description: ${desc}

        ---
        CAMPAIGN REQUIREMENTS:
        
         1. 'viral_post_a' (The Professional Magnet):
            - Headline: Professional and authoritative with 1-2 emojis.
            - Focus: Stability, growth, and team culture.
            - "מה התפקיד כולל?": 4-5 bullet points.
            - "מה אנחנו מחפשים?": 4-5 requirements.
            - CTA: [[LINK]]
            - Tone: Corporate but inviting.

         2. 'viral_post_b' (The Social/Casual Magnet):
            - Headline: High energy, catchy, with 4-5 emojis.
            - Focus: High salary/perks, immediate start, "cool" vibe.
            - "מה התפקיד כולל?": Brief, punchy bullet points.
            - "מה אנחנו מחפשים?": Top skills only.
            - CTA: [[LINK]]
            - Tone: Friendly, energetic, social-media-first.

         3. 'professional_post' (The LinkedIn "Authority"):
            - Focus on career growth and strategic impact.
            - High Hebrew.
            - CTA: [[LINK]]

         4. 'urgent_post' (The WhatsApp/Telegram "Quick-Action"):
            - Super brief, bullet points only: Role | Area | 1-2 Key Requirements.
            - CTA: [[LINK]]
        ---
        CRITICAL SAFETY & QUALITY RULES:
        - NO HALLUCINATIONS: Do not invent salary, years of experience, or company names if not explicitly mentioned.
        - NO ARTIFICIAL URGENCY: Never use phrases like "עודכן ב-48 שעות האחרונות", "משרה חמה", או "נסגר בקרוב".
        - MAX DETAIL: Viral posts should be at least 200 words.
        - LANGUAGE: 100% Hebrew.

        Return ONLY a JSON object:
        {
          "viral_post_a": "...",
          "viral_post_b": "...",
          "professional_post": "...",
          "urgent_post": "...",
          "suggested_hashtags": [...],
          "image_prompt": "..."
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const content = JSON.parse(jsonStr) as GeneratedContent;

        content.image_url = "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80";

        console.log(`[Content Engine] ✅ Content generated successfully for ${roleTitle}`);
        return content;

    } catch (error: any) {
        console.warn("[Content Engine] ⚠️ AI Failure. Using Rich Fallback.");
        return {
            viral_post_a: `📢 אנחנו מתרחבים! דרושים/ות ${roleTitle} ב${area}!\n\nאם אתם מחפשים את האתגר הבא שלכם בסביבה מקצועית ופורצת דרך - המקום שלכם איתנו.\n\nמה בתפקיד?\n✅ הובלת תהליכים מקצועיים\n✅ עבודה בצוות דינמי\n✅ אחריות על יעדים משמעותיים\n\nמה אנחנו מחפשים?\n📍 ניסיון מתאים מהתחום\n📍 יכולת למידה מהירה וראש גדול\n📍 רצון להתפתח ולהצליח\n\nאל תחכו, המשרות שלנו מאוישות מהר! לפרטים נוספים והגשה >> [[LINK]]`,
            viral_post_b: `מחפשים עבודה באווירה מטורפת? 🚀 דרושים/ות ${roleTitle} ב${area}!\n\nאם אתם אלופים בתחום ורוצים להשתלב בחברה צומחת - בואו אלינו!\n\nלמה כדאי?\n🔥 תנאים מעולים למגרות/ים\n🔥 סביבה צעירה ודינמית\n🔥 אפשרויות קידום מהירות\n\nשלחו קו"ח עכשיו והצטרפו להצלחה! >> [[LINK]]`,
            professional_post: `הזדמנות מקצועית: גיוס ${roleTitle} ל-1solution jobs ב${area}.\nאנו מחפשים אנשי מקצוע איכותיים להצטרפות למערך מוביל.\nפרטים נוספים בקישור המצורף: [[LINK]]`,
            urgent_post: `🚀 משרה חדשה: ${roleTitle}\n📍 מיקום: ${area}\n💼 ניסיון רלוונטי חובה\n🔗 הגשה מהירה בלינק: [[LINK]]`,
            suggested_hashtags: ["#דרושים", "#עבודה", "#1solution", "#קריירה"],
            image_prompt: "Professional modern workspace",
            image_url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
        };
    }
}
