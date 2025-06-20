const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs').promises; // Using promises for async file operations
require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });

// Apply the stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

// ====================================================================================
// CONFIGURATION & SELECTORS
// ====================================================================================
const LOGIN_URL                 = 'https://www4.sylectus.com/Login.aspx?logout=true';
const CORP_ID_INPUT_SELECTOR      = '#ctl00_bodyPlaceholder_corporateIdField';
const CONTINUE_BUTTON_SELECTOR    = '#ctl00_bodyPlaceholder_corpLoginButton';
const USERNAME_INPUT_SELECTOR     = '#select2-ctl00_bodyPlaceholder_userList-container';
const PASSWORD_INPUT_SELECTOR     = '#ctl00_bodyPlaceholder_userPasswordField';
const LOGIN_BUTTON_SELECTOR       = '#ctl00_bodyPlaceholder_userLoginButton';

const LOAD_BOARD_URL            = 'https://www4.sylectus.com/Main.aspx?page=II14_managepostedloads.asp?loadboard=True';
const IFRAME_SELECTOR             = 'iframe[id="iframe1"]';
const TABLE_ROW_SELECTOR          = 'tbody > tr';
const BID_BUTTON_SELECTOR         = 'td:nth-child(10) > input';

const EMAIL_SELECTOR_ON_POPUP = '#aspnetForm > div.popup-body > div.popup-content > div.popup-child.left-frame > div.trip-info-container > div:nth-child(1) > div:nth-child(1) > p:nth-child(2) > a';
const NOTES_SELECTOR_ON_POPUP = '#aspnetForm > div.popup-body > div.popup-content > div.popup-child.left-frame > div.trip-info-container > div:nth-child(2) > p';

// NEW: Configuration for cookie-based sessions
const COOKIES_FILE_PATH = './cookies.json';
const LOGIN_SESSION_DURATION_MINUTES = 45;
// ====================================================================================


// Cache for existing loads from database
let existingLoadsCache = new Map(); // sourceId -> full load object
let Load;

async function withRetry(operation, maxRetries = 3, delayMs = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            if (error.message.includes('buffering timed out')) {
                attempt++;
                if (attempt < maxRetries) {
                    const waitTime = delayMs * (attempt + 1);
                    console.log(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }
}

async function ensureRobustConnection() {
    console.log('🔌 Establishing database connection...');
    
    if (mongoose.connection.readyState !== 0) {
        console.log('🔄 Closing existing connection...');
        await mongoose.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    mongoose.set('strictQuery', false);
    
    const connectionOptions = {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 15000,
        maxPoolSize: 3,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
    };
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
        try {
            console.log(`🔄 Connection attempt ${retryCount + 1}/${maxRetries}...`);
            await mongoose.connect(process.env.MONGO_URI, connectionOptions);
            await new Promise(resolve => {
                if (mongoose.connection.readyState === 1) resolve();
                else mongoose.connection.once('connected', resolve);
            });
            await mongoose.connection.db.admin().ping();
            if (!Load) {
                Load = require('../server/models/Load');
            }
            console.log('✅ Database connection established successfully');
            return;
        } catch (error) {
            retryCount++;
            console.error(`❌ Connection attempt ${retryCount} failed:`, error.message);
            if (retryCount < maxRetries) {
                console.log(`⏳ Waiting 3 seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                throw new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`);
            }
        }
    }
}

async function reconnectDatabase() {
    console.log('🔄 Reconnecting to database...');
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    await ensureRobustConnection();
}

async function insertLoads(loads) {
    const batchSize = 10;
    for (let i = 0; i < loads.length; i += batchSize) {
        const batch = loads.slice(i, i + batchSize);
        let inserted = false;
        let retryCount = 0;
        while (!inserted && retryCount < 3) {
            try {
                await withRetry(() => Load.insertMany(batch, { ordered: false }));
                inserted = true;
            } catch (error) {
                retryCount++;
                if (retryCount >= 3) {
                    console.error(`❌ Failed to insert batch after retries: ${error.message}`);
                    for (const load of batch) {
                        try {
                            await withRetry(() => Load.create(load));
                        } catch (e) {
                            if (e.code === 11000) {
                                // This is fine, just means it was a duplicate we tried to insert.
                            } else {
                                console.error(`❌ Failed to add load ${load.sourceId}: ${e.message}`);
                            }
                        }
                    }
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

/**
 * NEW: Processes a batch of loads, inserting new ones and updating existing ones.
 * This is called every 25 loads during the scrape.
 * @param {Array} loadsBatch - An array of load objects to synchronize.
 */
async function processDatabaseBatch(loadsBatch) {
    if (loadsBatch.length === 0) {
        return;
    }
    console.log(`\n🔄 Synchronizing batch of ${loadsBatch.length} loads with database...`);
    
    try {
        const batchSourceIds = loadsBatch.map(l => l.sourceId);
        const existingLoadsInBatch = await withRetry(() => Load.find({ sourceId: { $in: batchSourceIds } }, { sourceId: 1 }).lean().exec());
        const existingSourceIdsInBatch = new Set(existingLoadsInBatch.map(l => l.sourceId));

        const newLoads = [];
        const existingLoadsToUpdate = [];

        loadsBatch.forEach(load => {
            if (existingSourceIdsInBatch.has(load.sourceId)) {
                existingLoadsToUpdate.push(load);
            } else {
                newLoads.push(load);
            }
        });

        console.log(`  📊 Batch details: ${newLoads.length} new, ${existingLoadsToUpdate.length} updates.`);

        if (newLoads.length > 0) {
            console.log('  ➕ Adding new loads from batch...');
            await insertLoads(newLoads);
        }

        if (existingLoadsToUpdate.length > 0) {
            console.log('  🔄 Updating existing loads from batch...');
            const bulkOps = existingLoadsToUpdate.map(load => ({
                updateOne: {
                    filter: { sourceId: load.sourceId },
                    update: { $set: { ...load, updatedAt: new Date() } }
                }
            }));
            await withRetry(() => Load.bulkWrite(bulkOps, { ordered: false }));
        }

        console.log(`✅ Batch of ${loadsBatch.length} synchronized successfully.\n`);
    } catch (error) {
        console.error(`❌ Sync failed for batch: ${error.message}`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `failed_batch_${timestamp}.json`;
        await fs.writeFile(backupFile, JSON.stringify(loadsBatch, null, 2));
        console.log(`💾 Emergency backup for failed batch saved to ${backupFile}`);
    }
}

/**
 * NEW: Removes stale loads from the database at the end of a full scrape.
 * Compares all loads found in the current run against all loads in the DB.
 * @param {Array} allCurrentLoads - An array of all load objects found during the scrape.
 */
async function removeStaleLoads(allCurrentLoads) {
    console.log('🗑️  Starting stale load cleanup process...');
    
    if (allCurrentLoads.length === 0) {
        console.log('⚠️ No loads scraped in this run, skipping stale check for safety.');
        return;
    }
    
    try {
        await reconnectDatabase();

        console.log('📋 Getting all existing load IDs from database for final comparison...');
        const allDbLoads = await withRetry(() => Load.find({}, { sourceId: 1, _id: 0 }).lean().exec());
        const allDbSourceIds = new Set(allDbLoads.map(load => load.sourceId));
        
        console.log(`📊 Found ${allDbSourceIds.size} loads in the database.`);

        const scrapedSourceIds = new Set(allCurrentLoads.map(load => load.sourceId));
        
        const staleSourceIds = [...allDbSourceIds].filter(id => !scrapedSourceIds.has(id));

        if (staleSourceIds.length > 0 && staleSourceIds.length < 500) {
            console.log(`🗑️  Found ${staleSourceIds.length} stale loads to remove.`);
            await withRetry(() => Load.deleteMany({ sourceId: { $in: staleSourceIds } }));
            console.log(`✅ Successfully removed ${staleSourceIds.length} stale loads.`);
        } else if (staleSourceIds.length === 0) {
            console.log('👍 No stale loads found.');
        } else {
            console.log(`⚠️  Safety check triggered. Found ${staleSourceIds.length} stale loads, which is too many to delete automatically. Skipping cleanup.`);
        }

    } catch (error) {
        console.error(`❌ An error occurred during stale load cleanup: ${error.message}`);
    }
}


async function loadExistingLoadsCache() {
    console.log('📚 Loading existing loads from database into cache...');
    try {
        const existingLoads = await withRetry(() => Load.find({}).lean().exec());
        existingLoadsCache = new Map();
        existingLoads.forEach(load => {
            existingLoadsCache.set(load.sourceId, load);
        });
        console.log(`✅ Loaded ${existingLoadsCache.size} existing loads into cache`);
    } catch (error) {
        console.error(`❌ Error loading existing loads cache: ${error.message}`);
        existingLoadsCache = new Map();
        console.log('⚠️  Starting with empty cache - all loads will be processed');
    }
}

/**
 * NEW: Handles login, using cookies if available and valid, otherwise performs a full login.
 * @param {object} page - The puppeteer page object.
 */
async function login(page) {
    console.log('Checking for existing session...');
    try {
        const cookiesStat = await fs.stat(COOKIES_FILE_PATH);
        const lastModified = cookiesStat.mtimeMs;
        const now = Date.now();

        if (now - lastModified < LOGIN_SESSION_DURATION_MINUTES * 60 * 1000) {
            console.log('🍪 Found recent cookies. Attempting to use session...');
            const cookiesString = await fs.readFile(COOKIES_FILE_PATH);
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
            
            console.log('🎯 Navigating directly to load board to test session...');
            await page.goto(LOAD_BOARD_URL, { waitUntil: 'networkidle2' });

            // Check if login was successful by looking for a key element on the load board
            const frameHandle = await page.waitForSelector(IFRAME_SELECTOR, { timeout: 20000 });
            const frame = await frameHandle.contentFrame();

            if (frame) {
                await frame.waitForSelector(TABLE_ROW_SELECTOR, { timeout: 15000 });
                console.log('✅ Session is active!');
                return;
            }
        }
        console.log('⚠️ Cookies are old or session is invalid.');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.log('ℹ️ Error reading cookies, deleting cookie file and proceeding with fresh login.', error.message);
            // DELETE THE CORRUPTED COOKIE FILE
            try {
                await fs.unlink(COOKIES_FILE_PATH);
                console.log('🗑️ Corrupted cookie file deleted.');
            } catch (deleteError) {
                console.log('⚠️ Could not delete cookie file:', deleteError.message);
            }
        } else {
            console.log('ℹ️ No cookie file found. Proceeding with full login.');
        }
    }

    console.log(`🔐 Logging in from scratch...`);
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.type(CORP_ID_INPUT_SELECTOR, process.env.SYLECTUS_CORP_ID);
    await Promise.all([
        page.click(CONTINUE_BUTTON_SELECTOR),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    ]);
    await page.type(USERNAME_INPUT_SELECTOR, process.env.SYLECTUS_USERNAME);
    await page.type(PASSWORD_INPUT_SELECTOR, process.env.SYLECTUS_PASSWORD);
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before clicking login

    await Promise.all([
        page.click(LOGIN_BUTTON_SELECTOR),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    ]);

    console.log('💾 Saving new session cookies...');
    const cookies = await page.cookies();
    await fs.writeFile(COOKIES_FILE_PATH, JSON.stringify(cookies, null, 2));
    console.log('🍪 Cookies saved.');
}

// ====================================================================================
// CORE SCRAPING LOGIC (Functions below are mostly untouched as requested)
// ====================================================================================

function generateLoadFingerprint(rawData) {
    const originParts = rawData.originAndPu.split('\n');
    const destParts = rawData.destinationAndDel.split('\n');
    const fingerprint = `${rawData.brokerName}-${originParts[0]}-${destParts[0]}-${originParts[1]}`;
    return crypto.createHash('sha1').update(fingerprint).digest('hex');
}

async function isLoadExpired(popup) {
    try {
        if (!popup || popup.isClosed()) return false;
        const pageText = await popup.evaluate(() => {
            try {
                const text = document.body.innerText.toLowerCase();
                return text.includes('expired') || 
                       text.includes('no longer accepting') || 
                       text.includes('bid period has ended') ||
                       text.includes('this order has expired');
            } catch (e) {
                return false;
            }
        });
        return pageText;
    } catch (error) {
        console.log(`⚠️  Could not check expiration status: ${error.message}`);
        return false;
    }
}

async function extractDataWithVerification(popup, selector, fieldName, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (!popup || popup.isClosed()) {
                return 'N/A';
            }
            await popup.waitForSelector(selector, { timeout: 2000 });
            const text = await popup.$eval(selector, el => el.innerText.trim());
            if (text && text !== '' && text !== 'N/A') return text;
        } catch (error) {
            if (error.message.includes('detached Frame') || error.message.includes('Execution context')) {
                return 'N/A';
            }
        }
    }
    return 'N/A';
}

async function getRowData(frame, rowIndex) {
    try {
        return await frame.evaluate((index) => {
            const rows = document.querySelectorAll('tbody > tr');
            const row = rows[index];
            if (!row) return null;
            const getCellText = (cellIndex) => row.querySelector(`td:nth-child(${cellIndex})`)?.innerText || '';
            const brokerLink = row.querySelector('td:nth-child(1) a.nav[onclick*="promabprofile"]');
            return {
                originAndPu: getCellText(4),
                destinationAndDel: getCellText(5),
                truckAndMiles: getCellText(7),
                piecesAndWeight: getCellText(8),
                brokerName: brokerLink?.innerText.trim(),
                hasData: !!brokerLink?.innerText.trim()
            };
        }, rowIndex);
    } catch (error) {
        console.error(`Error getting row data for index ${rowIndex}:`, error.message);
        return null;
    }
}

async function clickBidButton(frame, rowIndex) {
    try {
        return await frame.evaluate((index, bidSelector) => {
            const rows = document.querySelectorAll('tbody > tr');
            const row = rows[index];
            if (!row) return false;
            const bidButton = row.querySelector(bidSelector);
            if (bidButton) {
                bidButton.click();
                return true;
            }
            return false;
        }, rowIndex, BID_BUTTON_SELECTOR);
    } catch (error) {
        console.error(`Error clicking bid button for row ${rowIndex}:`, error.message);
        return false;
    }
}

async function waitForNewPopup(browser, timeoutMs = 8000) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            browser.off('targetcreated', handler);
            resolve(null);
        }, timeoutMs);
        const handler = async (target) => {
            try {
                if (target.type() === 'page') {
                    const newPage = await target.page();
                    if (newPage && !newPage.isClosed()) {
                        clearTimeout(timeout);
                        browser.off('targetcreated', handler);
                        newPage.on('dialog', async dialog => { try { await dialog.accept(); } catch (e) {} });
                        await new Promise(r => setTimeout(r, 200));
                        resolve(newPage);
                    }
                }
            } catch (error) {}
        };
        browser.on('targetcreated', handler);
    });
}

function createFormattedLoadFromExisting(existingLoad) {
    return {
        sourceId: existingLoad.sourceId,
        origin: existingLoad.origin,
        destination: existingLoad.destination,
        pickupDate: existingLoad.pickupDate,
        deliveryDateTime: existingLoad.deliveryDateTime,
        truckType: existingLoad.truckType,
        miles: existingLoad.miles,
        pieces: existingLoad.pieces,
        weight: existingLoad.weight,
        brokerName: existingLoad.brokerName,
        brokerEmail: existingLoad.brokerEmail,
        brokerNotes: existingLoad.brokerNotes,
    };
}

function createFormattedLoadFromScrape(rawData, sourceId, brokerEmail, brokerNotes) {
    const originParts = rawData.originAndPu.split('\n');
    const destParts = rawData.destinationAndDel.split('\n');
    const truckParts = rawData.truckAndMiles.split('\n');
    const piecesParts = rawData.piecesAndWeight.split('\n');

    const parseLocation = (locationString) => {
        if (!locationString) return { city: '', state: '', zip: '' };
        const parts = locationString.split(',');
        const city = parts[0]?.trim() || '';
        if (parts[1]) {
            const stateZipPart = parts[1].trim();
            const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?\s*$/);
            if (stateZipMatch) {
                return { city, state: stateZipMatch[1] || '', zip: stateZipMatch[2] || '' };
            } else {
                return { city, state: stateZipPart, zip: '' };
            }
        }
        return { city, state: '', zip: '' };
    };

    const originLocation = parseLocation(originParts[0]);
    const destLocation = parseLocation(destParts[0]);
    let cleanBrokerName = rawData.brokerName.replace(/\s*mc#\s*\d+/gi, '').replace(/\s*vf$/i, '').trim();

    return {
        sourceId,
        origin: { city: originLocation.city, state: originLocation.state, zip: originLocation.zip, location: { type: 'Point', coordinates: [0, 0] } },
        destination: { city: destLocation.city, state: destLocation.state, zip: destLocation.zip, location: { type: 'Point', coordinates: [0, 0] } },
        pickupDate: originParts[1]?.trim() || 'N/A',
        deliveryDateTime: destParts[1]?.trim() || 'N/A',
        truckType: truckParts[0]?.trim() || '',
        miles: parseInt(truckParts[1]?.replace(',', ''), 10) || 0,
        pieces: parseInt(piecesParts[0], 10) || 0,
        weight: parseInt(piecesParts[1]?.replace(',', ''), 10) || 0,
        brokerName: cleanBrokerName,
        brokerEmail,
        brokerNotes,
    };
}

async function scrapeData() {
    let browser;
    let currentPopup = null;
    console.log('🚀 Starting Stealth Scraper...');
    const allLoadsThisRun = [];
    const startTime = Date.now();
    
    try {
        console.log('🔌 Initializing database connection...');
        await ensureRobustConnection();
        await loadExistingLoadsCache();
        
        browser = await puppeteer.launch({ 
            headless: false, // Set to true for production environments
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list',
                '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"',
                '--disable-blink-features=AutomationControlled',
                '--disable-popup-blocking',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-extensions',
            ],
            ignoreDefaultArgs: ['--enable-automation'],
        });
        
        const page = (await browser.pages())[0];
        await page.setViewport({ width: 1366, height: 768 });
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await login(page); // Use new login function with cookie support
        
        // This navigation is now handled within the login function
        // await page.goto(LOAD_BOARD_URL, { waitUntil: 'domcontentloaded' });

        const frameHandle = await page.waitForSelector(IFRAME_SELECTOR, { timeout: 15000 });
        const frame = await frameHandle.contentFrame();
        if (!frame) throw new Error('Could not find iframe');
        
        frame.on('dialog', async dialog => { try { await dialog.accept(); } catch (e) {} });

        console.log('📊 Waiting for table rows...');
        await frame.waitForSelector(TABLE_ROW_SELECTOR, { timeout: 15000 });
        const rowCount = await frame.evaluate(() => document.querySelectorAll('tbody > tr').length);
        console.log(`📋 Found ${rowCount} loads. Processing with batching...`);

        // NEW: Batching logic variables
        let batchForDb = []; 
        let validLoadsProcessed = 0;
        let expiredLoadsSkipped = 0;
        let skippedRows = 0;
        let databaseSkipped = 0;
        let popupFailures = 0;
        let dataExtractionFailures = 0;
        
        for (let i = 0; i < rowCount; i++) {
            let formattedLoad;
            const rawData = await getRowData(frame, i);
            if (!rawData || !rawData.hasData) {
                skippedRows++;
                continue;
            }

            const sourceId = generateLoadFingerprint(rawData);
            
            if (existingLoadsCache.has(sourceId)) {
                databaseSkipped++;
                const existingLoad = existingLoadsCache.get(sourceId);
                formattedLoad = createFormattedLoadFromExisting(existingLoad);
                console.log(`⚡ Database skip: ${rawData.brokerName} (${formattedLoad.origin.city} → ${formattedLoad.destination.city})`);

            } else {
                try {
                    if (currentPopup && !currentPopup.isClosed()) {
                        try { await currentPopup.close(); } catch (e) {}
                    }
                    
                    console.log(`📋 Extracting: ${rawData.brokerName}`);

                    const popupPromise = waitForNewPopup(browser, 6000);
                    if (!await clickBidButton(frame, i)) {
                        console.log(`❌ Could not click bid button for: ${rawData.brokerName}`);
                        continue;
                    }
                    
                    currentPopup = await popupPromise;
                    if (!currentPopup) {
                        popupFailures++;
                        console.log(`❌ No popup appeared for: ${rawData.brokerName}`);
                        continue;
                    }

                    await new Promise(resolve => setTimeout(resolve, 800));
                    if (await isLoadExpired(currentPopup)) {
                        expiredLoadsSkipped++;
                        console.log(`🚫 Expired: ${rawData.brokerName}`);
                        continue;
                    }

                    const brokerEmail = await extractDataWithVerification(currentPopup, EMAIL_SELECTOR_ON_POPUP, 'Email');
                    let brokerNotes = await extractDataWithVerification(currentPopup, NOTES_SELECTOR_ON_POPUP, 'Notes');
                    if (brokerNotes.startsWith('Notes:') && brokerNotes.replace('Notes:', '').trim() === '') {
                        brokerNotes = 'Notes: N/A';
                    }

                    if (brokerEmail === 'N/A' && brokerNotes === 'Notes: N/A') {
                        dataExtractionFailures++;
                        console.log(`⚠️  No data extracted for ${rawData.brokerName} - popup may not have loaded properly`);
                    }

                    formattedLoad = createFormattedLoadFromScrape(rawData, sourceId, brokerEmail, brokerNotes);
                    validLoadsProcessed++;
                    console.log(`✅ ${formattedLoad.origin.city} → ${formattedLoad.destination.city} (${brokerEmail})`);
                    
                } catch (error) {
                    console.error(`❌ Error processing ${rawData.brokerName}:`, error.message);
                    if (currentPopup && !currentPopup.isClosed()) {
                        try { await currentPopup.close(); } catch (e) {}
                    }
                    continue; // Skip to next load on error
                }
            }
            
            // Add the processed load to the main list and the batch
            allLoadsThisRun.push(formattedLoad);
            batchForDb.push(formattedLoad);
            
            // Process the batch if it reaches 25
            if (batchForDb.length >= 25) {
                await processDatabaseBatch(batchForDb);
                batchForDb = []; // Reset batch
            }
            
            // Log progress intermittently
            if (allLoadsThisRun.length % 25 === 0) {
                 const elapsed = (Date.now() - startTime) / 1000;
                 const rate = allLoadsThisRun.length / elapsed;
                 const eta = ((rowCount - i) / rate) / 60;
                 console.log(`⚡ Progress: ${allLoadsThisRun.length}/${rowCount} | ${rate.toFixed(1)}/s | ETA: ${eta.toFixed(1)}m | New: ${validLoadsProcessed} | Cached: ${databaseSkipped} | Expired: ${expiredLoadsSkipped}`);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Process any remaining loads in the final batch
        if (batchForDb.length > 0) {
            console.log(`📦 Processing final batch of ${batchForDb.length} loads...`);
            await processDatabaseBatch(batchForDb);
        }

        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`\n🎉 Scraping completed in ${totalTime.toFixed(1)} seconds!`);
        console.log(`✅ New loads scraped: ${validLoadsProcessed}`);
        console.log(`⚡ Loads from cache: ${databaseSkipped}`);
        console.log(`🚫 Expired loads skipped: ${expiredLoadsSkipped}`);
        console.log(`⏭️  Empty rows skipped: ${skippedRows}`);
        console.log(`❌ Popup failures: ${popupFailures}`);
        console.log(`⚠️  Data extraction failures: ${dataExtractionFailures}`);
        console.log(`📊 Total loads for this run: ${allLoadsThisRun.length}`);
        
        // Final step: remove stale loads from DB
        if (allLoadsThisRun.length > 0) {
            await removeStaleLoads(allLoadsThisRun);
        } else {
            console.log('⚠️  No loads found in this run, skipping stale cleanup.');
        }
        
        const finalTime = (Date.now() - startTime) / 1000;
        console.log(`🏁 COMPLETE PROCESS finished in ${finalTime.toFixed(1)} seconds!`);
    } catch (error) {
        console.error('❌ A critical error occurred during scraping:', error);
    } finally {
        console.log('🧹 Cleaning up...');
        if (browser) {
            try { await browser.close(); console.log('✅ Browser closed'); } catch (e) {}
        }
        try { await mongoose.disconnect(); console.log('✅ Database disconnected'); } catch (e) {}
        console.log('🎯 Scraper run finished.');
    }
}

scrapeData();