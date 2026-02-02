import admin from 'firebase-admin';
import { db } from './db.js';

async function seedGroups() {
    console.log("Seeding real production groups...");
    const groups = [
        {
            name: 'דרושים ודרושות בכל הארץ',
            url: 'https://www.facebook.com/groups/jobsisrael',
            keywords: ['all', 'general', 'עבודה', 'דרושים'],
            is_member: true
        },
        {
            name: 'משרות אדמיניסטרציה ושירות לקוחות',
            url: 'https://www.facebook.com/groups/adminjobs',
            keywords: ['admin', 'office', 'service', 'שירות', 'מכירות', 'אדמיניסטרציה', 'משרד'],
            is_member: true
        },
        {
            name: 'דרושים במרכז והסביבה',
            url: 'https://www.facebook.com/groups/centerjobsil',
            keywords: ['center', 'general', 'מרכז'],
            location_match: ['מרכז', 'תל אביב', 'רעננה', 'כפר סבא', 'פתח תקווה', 'ראשון לציון', 'מודיעין', 'center'],
            is_member: true
        },
        {
            name: 'דרושים הייטק - ללא ניסיון / ג’וניורים',
            url: 'https://www.facebook.com/groups/juniorhitech',
            keywords: ['junior', 'entry', 'hitech', 'ג\'וניור', 'הייטק', 'מתכנת'],
            is_member: true
        }
    ];

    for (const g of groups) {
        // Check if exists
        const exists = await db.collection('groups').where('name', '==', g.name).get();
        if (exists.empty) {
            await db.collection('groups').add(g);
            console.log(`✅ Added: ${g.name}`);
        } else {
            await exists.docs[0].ref.update(g);
            console.log(`🔄 Updated: ${g.name}`);
        }
    }
    console.log("Seeding complete.");
}

seedGroups().catch(console.error);
