import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from './db.js';
import * as dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface Requirement {
    id?: string;
    company: string;
    role: string;
    location: string;
    description: string;
    created_at: any;
}

export interface Candidate {
    id: string;
    name: string;
    title: string;
    location: string;
    skills: string[];
    experience: string;
    status: 'active' | 'dormant';
    military_unit?: string;
    matchScore?: number;
    matchReason?: string;
}

// Mock Database of Candidates (Including more for Layer 7 demo)
const MOCK_CANDIDATES: Candidate[] = [
    { id: 'c1', name: 'יוסי כהן', title: 'Full Stack Developer', location: 'תל אביב', skills: ['React', 'Node.js', 'TypeScript'], experience: '4 years', status: 'active', military_unit: '8200' },
    { id: 'c2', name: 'דנה לוי', title: 'Marketing Manager', location: 'רמת גן', skills: ['PPC', 'Social Media', 'Content'], experience: '5 years', status: 'active', military_unit: 'דובר צה״ל' },
    { id: 'c3', name: 'אמיר פרץ', title: 'Sales Representative', location: 'חיפה', skills: ['Sales', 'CRM', 'Negotiation'], experience: '2 years', status: 'dormant', military_unit: 'גולני' },
    { id: 'c4', name: 'רוני שוורץ', title: 'Junior Developer', location: 'הרצליה', skills: ['Python', 'JS'], experience: '1 year', status: 'active', military_unit: 'ממר״ם' },
    { id: 'c5', name: 'מיכל אברהם', title: 'VP R&D', location: 'תל אביב', skills: ['Management', 'Cloud', 'Architecture'], experience: '10 years', status: 'active', military_unit: 'לוטם' },
];

/**
 * findMatchesForRequirement
 * Uses Gemini to rank candidates against a requirement.
 */
export async function findMatchesForRequirement(req: Requirement): Promise<Candidate[]> {
    console.log(`[Matching Engine] Searching REAL candidates for: ${req.role} in ${req.location}`);

    try {
        // Pull real candidates from Firestore
        const snapshot = await db.collection('candidates').limit(100).get();
        const candidates: Candidate[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.full_name || 'אנונימי',
                title: data.role_type || data.current_role || 'כללי',
                location: data.location || 'ישראל',
                skills: data.skills || [],
                experience: data.experience || '',
                status: data.status || 'active',
                military_unit: data.military_unit || ''
            };
        });

        if (candidates.length === 0) return [];

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are an elite recruitment AI specialized in military-to-civilian transitions in Israel.
        I will give you a job requirement and a list of candidates (mostly veterans/פורשים and discharged soldiers).
        Rank each candidate on a scale of 0-100 based on their fit (role, skills, location, experience, military background).
        
        Requirement:
        Role: ${req.role}
        Location: ${req.location}
        Description: ${req.description}
        
        Candidates:
        ${JSON.stringify(candidates.map(c => ({ id: c.id, title: c.title, loc: c.location, exp: c.experience, unit: c.military_unit })))}
        
        Return a JSON array of objects:
        [
          { "id": "candidate_id", "score": 85, "reason": "Short explanation in Hebrew (max 10 words)" }
        ]
        Respond ONLY with the JSON array.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const rankings = JSON.parse(text) as { id: string, score: number, reason: string }[];

        const matches = candidates.map(c => {
            const rank = rankings.find(r => r.id === c.id);
            return {
                ...c,
                matchScore: rank ? rank.score : 0,
                matchReason: rank ? rank.reason : "ניתוח AI לא זמין"
            };
        }).filter(m => (m.matchScore || 0) > 0);

        return matches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    } catch (error: any) {
        console.warn("[Matching Engine] Gemini Ranker Failed. Using Fallback Heuristics.");
        console.error(error.message);

        // Fallback: Just return some candidates with basic scoring
        const snapshot = await db.collection('candidates').limit(20).get();
        const candidates = snapshot.docs.map(doc => {
            const data = doc.data();
            let score = 0;
            if (data.role_type?.toLowerCase().includes(req.role.toLowerCase())) score += 50;
            if (data.location === req.location) score += 30;

            return {
                id: doc.id,
                name: data.full_name,
                title: data.role_type || data.current_role,
                location: data.location,
                skills: data.skills || [],
                experience: data.experience,
                status: data.status,
                military_unit: data.military_unit,
                matchScore: score,
                matchReason: "התאמה תשתיתית (Fallback)"
            };
        });
        return candidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
}
/**
 * checkNewCandidateAgainstRequirements
 * Analyzes a new candidate against "Hot Requirements" in real-time.
 */
export async function checkNewCandidateAgainstRequirements(candidate: any): Promise<any[]> {
    console.log(`[Matching Engine] Checking matches for NEW candidate: ${candidate.full_name}`);

    const reqSnapshot = await db.collection('hot_requirements').limit(10).get();
    if (reqSnapshot.empty) return [];
    const requirements = reqSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        New candidate applied:
        Name: ${candidate.full_name}
        Unit: ${candidate.military_unit || 'N/A'}
        Role Interest: ${candidate.role_type || candidate.current_role}
        Experience: ${candidate.experience}
        Notes: ${candidate.notes || ''}

        Current Hot Requirements:
        ${JSON.stringify(requirements.map(r => ({ id: r.id, role: (r as any).role, loc: (r as any).location })))}

        Compare the candidate to these requirements. Return a JSON array of matches with score > 70:
        [
          { "reqId": "...", "score": 95, "reason": "Short Hebrew text" }
        ]
        Respond ONLY with the JSON array.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(text);

    } catch (e) {
        console.warn("[Matching Engine] AI matching failed. Using Professional Heuristics Fallback.");

        // --- SMART HEURISTICS FALLBACK (Layer 7.1 Alpha) ---
        const roleKeywords: Record<string, string[]> = {
            'tech': ['פיתוח', 'סייבר', 'dev', 'code', 'תוכנה', '8200', 'ממרם', 'מפתחת', 'fullstack'],
            'ops': ['תפעול', 'לוגיסטיקה', 'מערך', 'ניהול', 'ציוד', 'אט״ל', 'רס״ר', 'תחזוקה'],
            'security': ['אבטחה', 'הגנה', 'קב״ט', 'מפקד', 'לוחם', 'קצין', 'ביטחון'],
            'management': ['ניהול', 'מפקד', 'רס״ן', 'סא״ל', 'אל״ם', 'קצין', 'הובלה', 'מנהל']
        };

        return requirements.map((r: any) => {
            let score = 30; // Base score
            const role = (r.role || '').toLowerCase();
            const candRole = (candidate.role_type || '').toLowerCase();
            const candUnit = (candidate.military_unit || '').toLowerCase();
            const candExp = (candidate.experience || '').toLowerCase();

            // Match by role type
            if (candRole && roleKeywords[candRole]) {
                if (roleKeywords[candRole].some(k => role.includes(k))) score += 40;
            }

            // Match by military rank/unit in experience
            if (candExp.includes('רס״ן') || candExp.includes('סא״ל') || candExp.includes('אל״ם')) {
                if (role.includes('ניהול') || role.includes('מנהל')) score += 20;
            }

            // Area match
            if (candidate.location && r.location && (r.location.includes(candidate.location) || candidate.location.includes(r.location))) {
                score += 10;
            }

            return {
                reqId: r.id,
                score: Math.min(score, 98),
                reason: score > 70 ? "התאמה גבוהה על בסיס רקע פיקודי וניסיון בתחום" : "התאמה בסיסית על פי סוג התפקיד והמיקום"
            };
        }).filter(m => m.score > 60).sort((a, b) => b.score - a.score);
    }
}
