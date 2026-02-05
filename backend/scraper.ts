import { chromium, Browser, BrowserContext } from 'playwright';
import { db } from './db.js';
import admin from 'firebase-admin';
import * as fs from 'fs';
import { generateJobContent } from './contentEngine.js';
import { findMatchesForRequirement, checkNewCandidateAgainstRequirements } from './matchingEngine.js';
import { cleanTitle } from './publishEngine.js';

function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${message}\n`;
    console.log(message); // Still log to console for immediate feedback
    fs.appendFileSync('scraper.log', logMsg);
}

export class SVTScraper {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private agentId = '774555';
    private baseUrl = `https://www.svt.jobs/agent/${this.agentId}/positions`;

    // Static lock to prevent concurrent scrapes
    private static isRunning = false;

    // Cookie/Storage collection reference
    private storageRef = db.collection('settings').doc('svt_session_cookies');

    /**
     * Flow 1: Interactive Login (Layer 2.1)
     * Opens a visible browser for the user to convert raw credentials (ID+SMS) into a reusable session token.
     */
    async runInteractiveLogin() {
        log("[SVT Engine] Initiating Interactive Login Protocol...");

        // Launch Visible Browser
        this.browser = await chromium.launch({ headless: false });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await this.context.newPage();

        try {
            await page.goto(this.baseUrl);
            console.log("[SVT Engine] Waiting for user authentication...");

            // Poll for login success
            await new Promise<void>((resolve, reject) => {
                const interval = setInterval(() => {
                    const url = page.url();
                    // Success criteria: We are at /positions or /agent AND not at /login
                    if ((url.includes('/positions') || url.includes('/agent/')) && !url.includes('login')) {
                        clearInterval(interval);
                        resolve();
                    }
                    if (page.isClosed()) {
                        clearInterval(interval);
                        reject(new Error("User closed the browser"));
                    }
                }, 1000); // Check every second

                // Safety timeout: 5 minutes
                setTimeout(() => {
                    clearInterval(interval);
                    reject(new Error("Login timed out"));
                }, 300000);
            });

            console.log("[SVT Engine] Authentication Verified. Capturing Session State...");

            // Wait a moment for all cookies to SET
            await page.waitForTimeout(3000);

            // Capture State
            const state = await this.context.storageState();

            // Encrypt/Save to Firestore (Layer 1.1)
            await this.storageRef.set({
                storageState: JSON.stringify(state),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                connected: true,
                agent_id: this.agentId
            }).catch(e => console.warn("Firebase sync failed during login:", e.message));

            // Sync to local
            fs.writeFileSync('./svt_session_local.json', JSON.stringify(state));

            console.log("[SVT Engine] Session Securely Stored (DB & Local).");
            return true;

        } catch (error) {
            console.error("[SVT Engine] Login Failed:", error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Flow 2: Autonomous Scrape (Layer 2.2)
     * Uses the stored session to scrape data without human intervention.
     */
    async scrapeJobs(fullSweep: boolean = false) {
        if (SVTScraper.isRunning) {
            log(`[SVT Engine] ⚠️ Scrape already in progress. Skipping... Sweep Mode: ${fullSweep}`);
            return 0;
        }

        SVTScraper.isRunning = true;
        log(`[SVT Engine] Starting Autonomous Scrape Cycle... (Full Sweep: ${fullSweep})`);

        let storageState;
        const localSessionPath = './svt_session_local.json';

        try {
            // 1. Retrieve Session from Firebase
            const doc = await this.storageRef.get();
            if (doc.exists && doc.data()?.storageState) {
                storageState = JSON.parse(doc.data()?.storageState);
                fs.writeFileSync(localSessionPath, JSON.stringify(storageState));
                console.log("[SVT Engine] Session retrieved from Firebase.");
            } else {
                throw new Error("NO_SESSION_IN_DB");
            }
        } catch (e: any) {
            console.warn("[SVT Engine] Firebase Registry Unavailable. Checking local fallback...");
            if (fs.existsSync(localSessionPath)) {
                storageState = JSON.parse(fs.readFileSync(localSessionPath, 'utf8'));
                log("[SVT Engine] Using LOCAL session fallback.");
            } else {
                log("[SVT Engine] Critical Error: No session found.");
                throw new Error("SESSION_MISSING");
            }
        }

        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            storageState,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        let jobsFound = 0;

        const page = await this.context.newPage();
        page.setDefaultTimeout(120000);


        try {
            log("[SVT Engine] Navigating to list page...");
            await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            const pageTitle = await page.title();
            if (pageTitle.includes("Just a moment") || (await page.$('#challenge-error-text'))) {
                log("⚠️ Cloudflare Challenge Detected! Waiting...");
                await page.waitForFunction(() => {
                    return !document.title.includes("Just a moment") && !document.querySelector('#challenge-error-text');
                }, { timeout: 0 });
                log("✅ Solved! Resuming...");
                await page.waitForTimeout(2000);
            }

            if (page.url().includes('login')) {
                log("[SVT Engine] Session Invalid.");
                await this.storageRef.update({ connected: false });
                throw new Error("SESSION_EXPIRED");
            }

            log("[SVT Engine] Collecting job links...");
            let previousCount = 0;
            let noChangeTicks = 0;
            for (let i = 0; i < 50; i++) {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(2000);
                const currentCount = await page.locator('a[href*="/position/"]').count();
                if (currentCount === previousCount) noChangeTicks++;
                else noChangeTicks = 0;
                if (noChangeTicks > 5) break;
                previousCount = currentCount;
                await page.keyboard.press('PageUp');
                await page.waitForTimeout(500);
                await page.keyboard.press('End');
            }

            const jobLinks = await page.$$eval('a[href*="/position/"], a[href*="/job/"]', (anchors) => Array.from(new Set(anchors.map(a => a.href))));
            log(`[SVT Engine] Found ${jobLinks.length} unique job links.`);

            // Optimization: Fetch existing jobs status to filter intelligently
            // We want to skip jobs that are ALREADY fully scraped, but process those that are partial
            const allExistingDocs = await db.collection('jobs').select('id', 'is_full_scrape').get();
            const existingStatus = new Map(allExistingDocs.docs.map(d => [d.id, d.data().is_full_scrape]));
            const existingIds = new Set(allExistingDocs.docs.map(d => d.id)); // For last_seen update

            let linksToProcess = [];
            const BATCH_SIZE = fullSweep ? 150 : 50;

            // Filter: Process if New OR (Existing AND Not Fully Scraped)
            linksToProcess = jobLinks.filter(link => {
                const id = link.split('/').pop() || '';
                const isFullyScraped = existingStatus.get(id);
                return isFullyScraped !== true;
            }).slice(0, BATCH_SIZE);

            log(`[SVT Engine] Processing ${linksToProcess.length} jobs (Smart Filter: New + Partial)...`);
            jobsFound = linksToProcess.length;

            // Bulk Update 'last_seen' for all found links (Layer 2.3)
            // We still update last_seen for everything we found on the page, even if we don't scrape it deeply
            try {
                const foundIds = jobLinks.map(link => link.split('/').pop()).filter(Boolean);
                const batch = db.batch();
                let batchCount = 0;

                foundIds.forEach(id => {
                    if (existingIds.has(id!)) {
                        batch.set(db.collection('jobs').doc(id!), {
                            last_seen: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        batchCount++;
                    }
                });

                if (batchCount > 0) await batch.commit();
                log(`[SVT Engine] Updated 'last_seen' for ${batchCount} existing jobs.`);
            } catch (e) { log("Error during bulk last_seen update: " + e); }

            // Phase B: Intelligent Deactivation (Layer 2.3)
            // Instead of immediate deactivation, we mark 'last_seen'.
            // Jobs not seen in > 24 hours AND foundIds count is significant are deactivated.
            try {
                const now = new Date();
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                // Only run deactivation if we found a reasonable number of links (to avoid clearing on error)
                if (jobLinks.length > 10) {
                    const staleJobs = await db.collection('jobs')
                        .where('status', '==', 'active')
                        .where('last_seen', '<', yesterday)
                        .get();

                    if (!staleJobs.empty) {
                        const batch = db.batch();
                        staleJobs.forEach(doc => {
                            batch.update(doc.ref, {
                                status: 'inactive',
                                deactivated_at: admin.firestore.FieldValue.serverTimestamp()
                            });
                        });
                        await batch.commit();
                        log(`[SVT Engine] 🧹 Cleaned up ${staleJobs.size} stale jobs.`);
                    }
                }
            } catch (e) { log("Error during deactivation: " + e); }

            // Phase C: Deep Dive
            for (const link of linksToProcess) {
                try {
                    log(`[SVT Engine] Navigating to: ${link}`);
                    await page.goto(link, { waitUntil: 'networkidle', timeout: 60000 });
                    await page.waitForTimeout(8000);

                    const jobId = link.split('/').pop() || 'unknown';

                    const pageData: any = await page.evaluate(`(() => {
                        const allElements = Array.from(document.querySelectorAll('div, span, b, strong, li, p, td, a, h1, h2, h3, label'));
                        const titleEl = document.querySelector('h1, h2, .position-name, .job-title');
                        const title = titleEl ? titleEl.textContent.trim() : '';

                        const finder = function(labels) {
                            for (const targetLabel of labels) {
                                const el = allElements.find(e => {
                                    const text = e.textContent ? e.textContent.trim() : '';
                                    return text === targetLabel || text === targetLabel + ':';
                                });
                                if (el) {
                                    let next = el.nextElementSibling;
                                    while (next && !next.textContent.trim()) next = next.nextElementSibling;
                                    if (next) return next.textContent.trim() || '';
                                    
                                    let pNext = el.parentElement ? el.parentElement.nextElementSibling : null;
                                    while (pNext && !pNext.textContent.trim()) pNext = pNext.nextElementSibling;
                                    if (pNext) return pNext.textContent.trim() || '';
                                    
                                    const parentText = el.parentElement ? el.parentElement.textContent.trim() : '';
                                    if (parentText.length > targetLabel.length + 2) {
                                        return parentText.replace(targetLabel, '').replace(':', '').trim();
                                    }
                                }
                                
                                const partialMatch = allElements.find(e => {
                                    const text = e.textContent ? e.textContent.trim() : '';
                                    return text.startsWith(targetLabel) && text.length > targetLabel.length + 1;
                                });
                                if (partialMatch) {
                                    return partialMatch.textContent.trim().replace(targetLabel, '').replace(':', '').trim() || '';
                                }
                            }
                            return '';
                        };

                        let location = finder(['מיקום המשרה', 'מיקום', 'עיר', 'איזור', 'כתובת', 'City', 'Location']);
                        
                        // Proximity Fallback: Look ABOVE the job description if possible
                        if (!location) {
                            const jobDescLabel = allElements.find(el => el.textContent && (el.textContent.includes('תיאור המשרה') || el.textContent.includes('תיאור התפקיד')));
                            if (jobDescLabel) {
                                // Walk up the DOM to find the previous text block
                                let prev = jobDescLabel.parentElement; 
                                // Try to find a sibling above the description container
                                if (prev) {
                                     let sibling = prev.previousElementSibling;
                                     if(sibling && sibling.textContent && sibling.textContent.length < 50) {
                                         location = sibling.textContent.trim();
                                     } else if (prev.parentElement) {
                                         // Try looking at previous sibling of the parent container
                                         let parentSibling = prev.parentElement.previousElementSibling;
                                         if (parentSibling) {
                                             const text = parentSibling.textContent ? parentSibling.textContent.trim() : '';
                                             // Heuristic: Locations are usually short (2-30 chars)
                                             if (text.length > 2 && text.length < 40 && !text.includes('משרה')) {
                                                 location = text;
                                             }
                                         }
                                     }
                                }
                            }
                        }

                        if (!location && titleEl) {
                            const parent = titleEl.parentElement;
                            if (parent) {
                                const siblings = Array.from(parent.querySelectorAll('div, span, b'));
                                const index = siblings.indexOf(titleEl);
                                if (index !== -1 && siblings[index + 1]) {
                                    const text = siblings[index + 1].textContent?.trim() || '';
                                    if (text.length > 2 && text.length < 30) location = text;
                                }
                            }
                        }
                        
                        if (!location) location = 'ישראל';
                        const company_desc = finder(['תיאור חברה', 'תיאור חברה:']);
                        let job_desc = finder(['תיאור המשרה', 'תיאור המשרה:', 'דרישות משרה', 'דרישות משרה:', 'תיאור התפקיד', 'תיאור התפקיד:']);

                        if (!job_desc || job_desc.length < 50) {
                            const jobLabel = allElements.find(el => el.textContent && el.textContent.trim().includes('תיאור המשרה'));
                            if (jobLabel) {
                                const container = jobLabel.closest('div.cp_board_item, div.position-details, .job-description-container') || (jobLabel.parentElement ? jobLabel.parentElement.parentElement : null);
                                if (container) {
                                    job_desc = container.innerText.replace(jobLabel.textContent || '', '').trim();
                                }
                            }
                        }

                        const textarea = document.querySelector('textarea.cp_board_input');
                        if (textarea && textarea.value.length > (job_desc ? job_desc.length : 0)) job_desc = textarea.value;

                        let app_link = '';
                        const appLinkLabel = allElements.find(el => el.textContent && el.textContent.trim().includes('קישור לשיתוף'));
                        if (appLinkLabel) {
                            const linkEl = appLinkLabel.parentElement ? appLinkLabel.parentElement.querySelector('a') : null;
                            if (linkEl && linkEl.href) app_link = linkEl.href;
                        }

                        return { title, location, company_desc, job_desc, app_link };
                    })()`);

                    let { title, location, company_desc, job_desc, app_link } = pageData;
                    title = cleanTitle(title || '');
                    let description = job_desc || '';
                    let is_full_scrape = description.length > 200;
                    let extraction_method = job_desc ? 'dom_targeted' : 'unknown';

                    if (description.length < 200) {
                        const textareaVal = await page.evaluate(() => {
                            const textareas = Array.from(document.querySelectorAll('textarea'));
                            return textareas.sort((a, b) => b.value.length - a.value.length)[0]?.value || '';
                        });
                        if (textareaVal.length > description.length) {
                            description = textareaVal;
                            extraction_method = 'textarea_fallback';
                            is_full_scrape = description.length > 200;
                        }
                    }

                    const description_clean = (company_desc ? `תיאור חברה: ${company_desc}\n\n` : '') + description;

                    const jobRef = db.collection('jobs').doc(jobId);
                    const doc = await jobRef.get();
                    if (!doc.exists) {
                        const { generateJobContent } = await import('./contentEngine.js'); // Add .js extension for consistency
                        const content = await generateJobContent({ original_title: title, description: description_clean, location });
                        await jobRef.set({
                            id: jobId,
                            title: title || 'ללא כותרת',
                            location: location || 'ישראל',
                            company_description: company_desc || '', // FIX: Ensure not undefined
                            application_link: app_link || '',
                            original_description: description || '',
                            description_clean: description_clean || '',
                            extraction_method: extraction_method || 'unknown',
                            is_full_scrape: is_full_scrape || false,
                            ...content,
                            status: 'active',
                            source_link: link,
                            created_at: admin.firestore.FieldValue.serverTimestamp(),
                            last_checked: admin.firestore.FieldValue.serverTimestamp()
                        });
                        log(`[SVT Engine] ✅ Saved: ${jobId}`);
                    } else {
                        const existing = doc.data();
                        const needsUpdate = !existing?.description_clean || existing.description_clean.length < 200;

                        // FIX: Ensure no field is undefined
                        const updateData: any = {
                            title: title || existing?.title || 'ללא כותרת',
                            location: location || existing?.location || 'ישראל',
                            company_description: company_desc || existing?.company_description || '',
                            application_link: app_link || existing?.application_link || '',
                            last_checked: admin.firestore.FieldValue.serverTimestamp(),
                            status: 'active'
                        };

                        if (needsUpdate && description_clean.length > 200) {
                            const { generateJobContent } = await import('./contentEngine.js');
                            const content = await generateJobContent({ original_title: title, description: description_clean, location });
                            Object.assign(updateData, content, {
                                description_clean: description_clean || '',
                                is_full_scrape: true,
                                extraction_method: extraction_method || 'unknown'
                            });
                        }
                        await jobRef.update(updateData);
                        log(`[SVT Engine] 🔄 Updated: ${jobId}`);
                    }
                    await page.waitForTimeout(1000 + Math.random() * 1000);
                } catch (e: any) { log(`[SVT Engine] Error on ${link}: ${e.message}`); }
            }
            return jobsFound;

        } catch (error) {
            log("[SVT Engine] Scrape Cycle Failed: " + error);
            throw error;
        } finally {
            (SVTScraper as any).isRunning = false;
            await this.cleanup();
        }
    }

    private async cleanup() {
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
        this.context = null;
        this.browser = null;
    }
}
