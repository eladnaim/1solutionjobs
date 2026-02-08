
// Israeli Geographic Database & Normalization Engine

// Definitions of Regions
export type Region = 'center' | 'sharon' | 'shfela' | 'south' | 'north' | 'jerusalem' | 'general';

interface CityDef {
    name: string;      // Canonical Hebrew Name
    region: Region;
    keywords: string[]; // Aliases/Variations
}

// THE DATABASE
const CITY_DATABASE: CityDef[] = [
    // --- CENTER (Gush Dan) ---
    { name: 'תל אביב', region: 'center', keywords: ['תל אביב', 'ת"א', 'TLV', 'tel aviv', 'יפו'] },
    { name: 'רמת גן', region: 'center', keywords: ['רמת גן', 'רמת-גן', 'בורסה'] },
    { name: 'גבעתיים', region: 'center', keywords: ['גבעתיים'] },
    { name: 'בני ברק', region: 'center', keywords: ['בני ברק', 'בני-ברק'] },
    { name: 'פתח תקווה', region: 'center', keywords: ['פתח תקווה', 'פ"ת', 'פתח-תקווה', 'petah tikva'] },
    { name: 'גבעת שמואל', region: 'center', keywords: ['גבעת שמואל', 'אוניברסיטת בר אילן'] },
    { name: 'קריית אונו', region: 'center', keywords: ['קרית אונו', 'קריית אונו'] },
    { name: 'גני תקווה', region: 'center', keywords: ['גני תקווה'] },
    { name: 'סביון', region: 'center', keywords: ['סביון'] },
    { name: 'יהוד', region: 'center', keywords: ['יהוד', 'מונוסון'] },
    { name: 'אור יהודה', region: 'center', keywords: ['אור יהודה'] },
    { name: 'חולון', region: 'center', keywords: ['חולון'] },
    { name: 'בת ים', region: 'center', keywords: ['בת ים', 'בת-ים'] },
    { name: 'ראשון לציון', region: 'center', keywords: ['ראשון לציון', 'ראשל"צ', 'ראשל״צ', 'ראשון'] },
    { name: 'אלעד', region: 'center', keywords: ['אלעד'] },
    { name: 'ראש העין', region: 'center', keywords: ['ראש העין'] }, // Could be Sharon, but functionally Center often
    { name: 'שוהם', region: 'center', keywords: ['שוהם', 'שוהם/איירפורט סיטי', 'airport city'] },

    // --- SHARON ---
    { name: 'הרצליה', region: 'sharon', keywords: ['הרצליה', 'פיתוח'] },
    { name: 'רמת השרון', region: 'sharon', keywords: ['רמת השרון'] },
    { name: 'כפר סבא', region: 'sharon', keywords: ['כפר סבא', 'כפ"ס'] },
    { name: 'רעננה', region: 'sharon', keywords: ['רעננה'] },
    { name: 'הוד השרון', region: 'sharon', keywords: ['הוד השרון'] },
    { name: 'נתניה', region: 'sharon', keywords: ['נתניה'] },
    { name: 'חדרה', region: 'sharon', keywords: ['חדרה'] },
    { name: 'חריש', region: 'sharon', keywords: ['חריש'] },
    { name: 'קיסריה', region: 'sharon', keywords: ['קיסריה'] },
    { name: 'אבן יהודה', region: 'sharon', keywords: ['אבן יהודה'] },
    { name: 'כפר יונה', region: 'sharon', keywords: ['כפר יונה'] },

    // --- SHFELA ---
    { name: 'רחובות', region: 'shfela', keywords: ['רחובות', 'פארק המדע'] },
    { name: 'נס ציונה', region: 'shfela', keywords: ['נס ציונה'] },
    { name: 'לוד', region: 'shfela', keywords: ['לוד', 'נתב"ג'] },
    { name: 'רמלה', region: 'shfela', keywords: ['רמלה'] },
    { name: 'באר יעקב', region: 'shfela', keywords: ['באר יעקב'] },
    { name: 'מודיעין', region: 'shfela', keywords: ['מודיעין', 'מכבים', 'רעות'] },
    { name: 'יבנה', region: 'shfela', keywords: ['יבנה'] },
    { name: 'גדרה', region: 'shfela', keywords: ['גדרה'] },
    { name: 'מזכרת בתיה', region: 'shfela', keywords: ['מזכרת בתיה'] },
    { name: 'קריית מלאכי', region: 'shfela', keywords: ['קרית מלאכי', 'קסטינה'] }, // Borderline south

    // --- SOUTH ---
    { name: 'אשדוד', region: 'south', keywords: ['אשדוד'] },
    { name: 'אשקלון', region: 'south', keywords: ['אשקלון'] },
    { name: 'באר שבע', region: 'south', keywords: ['באר שבע', 'ב"ש', 'b7'] },
    { name: 'קריית גת', region: 'south', keywords: ['קרית גת', 'קריית גת'] },
    { name: 'שדרות', region: 'south', keywords: ['שדרות'] },
    { name: 'נתיבות', region: 'south', keywords: ['נתיבות'] },
    { name: 'אופקים', region: 'south', keywords: ['אופקים'] },
    { name: 'דימונה', region: 'south', keywords: ['דימונה'] },
    { name: 'ירוחם', region: 'south', keywords: ['ירוחם'] },
    { name: 'ערד', region: 'south', keywords: ['ערד'] },
    { name: 'אילת', region: 'south', keywords: ['אילת'] },

    // --- NORTH ---
    { name: 'חיפה', region: 'north', keywords: ['חיפה', 'מת"מ'] },
    { name: 'קריות', region: 'north', keywords: ['קריות', 'קרית אתא', 'קרית מוצקין', 'קרית ביאליק', 'קרית ים'] },
    { name: 'נשר', region: 'north', keywords: ['נשר'] },
    { name: 'עכו', region: 'north', keywords: ['עכו'] },
    { name: 'נהריה', region: 'north', keywords: ['נהריה'] },
    { name: 'כרמיאל', region: 'north', keywords: ['כרמיאל'] },
    { name: 'טבריה', region: 'north', keywords: ['טבריה'] },
    { name: 'עפולה', region: 'north', keywords: ['עפולה'] },
    { name: 'נצרת', region: 'north', keywords: ['נצרת', 'נוף הגליל'] },
    { name: 'קריית שמונה', region: 'north', keywords: ['קרית שמונה'] },
    { name: 'צפת', region: 'north', keywords: ['צפת'] },
    { name: 'בית שאן', region: 'north', keywords: ['בית שאן'] },
    { name: 'יקנעם', region: 'north', keywords: ['יקנעם'] },
    { name: 'מגדל העמק', region: 'north', keywords: ['מגדל העמק'] },

    // --- JERUSALEM ---
    { name: 'ירושלים', region: 'jerusalem', keywords: ['ירושלים', 'jerusalem'] },
    { name: 'בית שמש', region: 'jerusalem', keywords: ['בית שמש'] },
    { name: 'מעלה אדומים', region: 'jerusalem', keywords: ['מעלה אדומים'] },
    { name: 'מבשרת ציון', region: 'jerusalem', keywords: ['מבשרת'] },
    { name: 'גוש עציון', region: 'jerusalem', keywords: ['אפרת', 'גוש עציון'] },
    { name: 'אריאל', region: 'jerusalem', keywords: ['אריאל'] } // Samaria, often grouped with JLM or Sharon depending on context
];

export class GeoEngine {

    /**
     * Takes a raw location string (e.g., "ראשל״צ והסביבה") and returns a structured object.
     */
    static normalizeLocation(rawInput: string): { city: string | null, region: Region, original: string } {
        if (!rawInput) return { city: null, region: 'general', original: '' };

        const input = (rawInput || '').toString().toLowerCase().trim();

        // 1. Try to find an Exact City Match
        for (const city of CITY_DATABASE) {
            if (city.keywords.some(k => input.includes(k.toLowerCase()))) {
                return {
                    city: city.name,
                    region: city.region,
                    original: rawInput
                };
            }
        }

        // 2. If no city found, try to find a Region Name directly
        if (input.includes('מרכז') || input.includes('center') || input.includes('גוש דן')) return { city: null, region: 'center', original: rawInput };
        if (input.includes('צפון') || input.includes('north')) return { city: null, region: 'north', original: rawInput };
        if (input.includes('דרום') || input.includes('south')) return { city: null, region: 'south', original: rawInput };
        if (input.includes('שרון')) return { city: null, region: 'sharon', original: rawInput };
        if (input.includes('שפלה')) return { city: null, region: 'shfela', original: rawInput };
        if (input.includes('ירושלים')) return { city: null, region: 'jerusalem', original: rawInput }; // District fallback

        // 3. Fallback
        return { city: null, region: 'general', original: rawInput };
    }

    /**
     * Determines if a Job Location is compatible with a Group Location
     */
    static getMatchScore(jobLocation: string, groupName: string, groupTags: string[] = [], groupRegion: string = 'general'): number {
        const jobGeo = this.normalizeLocation(jobLocation);
        const groupGeo = this.analyzeGroup(groupName, groupTags, groupRegion);

        // Debug Log
        // console.log(`Job: ${jobGeo.city} (${jobGeo.region}) vs Group: ${groupGeo.cities.join(',')} (${groupGeo.region})`);

        // RULE 1: Total Geography Mismatch (Region Blocking)
        // If Job is specific (not general) and Group is specific (not general), and Regions don't match -> BLOCK
        if (jobGeo.region !== 'general' && groupGeo.region !== 'general') {
            if (jobGeo.region !== groupGeo.region) {
                return -1000; // Hard Block
            }
        }

        let score = 0;

        // RULE 2: City Match (The "Platinum" Standard)
        if (jobGeo.city && groupGeo.cities.includes(jobGeo.city)) {
            return 100; // Perfect Match
        }

        // RULE 3: Region Match
        if (jobGeo.region === groupGeo.region && jobGeo.region !== 'general') {

            // If the group is city-specific (e.g. "Jobs in Holon") but the job is in a neighbor (Bat Yam) -> Good score
            // If the group is region-wide (e.g. "Jobs in Center") -> Good score

            // Allow cross-city posting within same region? 
            // Better to prefer region-wide groups if exact city match failed.

            if (groupGeo.cities.length === 0) {
                // Group is generic for the region (e.g. "Jobs in Center")
                return 50;
            } else {
                // Group is specific to another city in the same region (e.g. Job: Ramat Gan, Group: Givatayim)
                // These are close neighbors. Give a small boost.
                return 20;
            }
        }

        // RULE 4: General Groups
        if (groupGeo.region === 'general') {
            return 10;
        }

        return 0;
    }

    /**
     * Reverse Engineering: Determine a Group's geography based on its name and tags
     */
    private static analyzeGroup(name: string, tags: string[], definedRegion: string): { cities: string[], region: Region } {
        const safeTags = Array.isArray(tags) ? tags : [];
        const input = ((name || '') + ' ' + safeTags.join(' ')).toLowerCase();
        const foundCities: string[] = [];
        let detectedRegion: Region = 'general';

        // 1. Detect Cities
        for (const city of CITY_DATABASE) {
            if (city.keywords.some(k => input.includes(k.toLowerCase()))) {
                foundCities.push(city.name);
                detectedRegion = city.region; // Infer region from city
            }
        }

        // 2. Detect Region (Override inferred if explicit region name is present)
        if (input.includes('מרכז') || definedRegion === 'center' || definedRegion === 'מרכז') detectedRegion = 'center';
        else if (input.includes('שרון') || definedRegion === 'sharon') detectedRegion = 'sharon';
        else if (input.includes('שפלה') || definedRegion === 'shfela') detectedRegion = 'shfela';
        else if (input.includes('דרום') || definedRegion === 'south') detectedRegion = 'south';
        else if (input.includes('צפון') || definedRegion === 'north') detectedRegion = 'north';
        else if (input.includes('ירושלים') && !input.includes('תל')) definedRegion = 'jerusalem'; // Avoid confusing Tel-Aviv/Jerusalem highway

        // If we found cities from different regions, it's a "mixed" or "general" group theoretically, 
        // but usually it implies the region of the first major city found.

        return { cities: foundCities, region: detectedRegion };
    }
}
