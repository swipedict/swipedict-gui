/**
 * SwipeDict Build Info Generator (v4)
 * 
 * Generates public/cicd.json with a semantic version and a unique build ID.
 * This script is now CWD-independent and uses a dynamic import for its helper module.
 */

import fs from 'fs';
import path from 'path';
// --- MODIFICATION: Import pathToFileURL to work with dynamic import ---
import { fileURLToPath, pathToFileURL } from 'url';

// --- Configuration & Path Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Formats a Date object into a 'YYYY-MM-DD_HH:MM:SS' string.
 * @param {Date} date The date to format.
 * @returns {string} The formatted date string.
 */
function getFormattedDateTime(date) {
    const pad = (num) => num.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`;
}

// --- MODIFICATION: Main logic is now async to support dynamic import ---
async function generateBuildInfo() {
    try {
        // --- MODIFICATION: Dynamically import the build ID generator ---
        const buildIdModulePath = path.join(__dirname, 'get-build-nr.js');
        const { generateBuildId } = await import(pathToFileURL(buildIdModulePath).href);

        const packageJsonPath = path.join(projectRoot, 'package.json');
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        const packageData = JSON.parse(packageJsonContent);
        const baseVersion = packageData.version;

        if (!baseVersion) throw new Error('Version not found in package.json');

        const buildId = generateBuildId();

        const appVersion = `${baseVersion}-${buildId}`;
        const buildDate = getFormattedDateTime(new Date());

        const cicdData = {
            appVersion: appVersion,
            appBuildDate: buildDate,
        };

        const outputDir = path.join(projectRoot, 'public');
        const outputPath = path.join(outputDir, 'cicd.json');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(cicdData, null, 2));

        console.log(`✅ Generated cicd.json with version ${appVersion}`);
        
    } catch (error) {
        console.error('❌ Error during pre-build script:', error);
        process.exit(1);
    }
}

// --- Direct Execution Logic ---
// We check if this script is the main module being run.
(async () => {
    // This condition checks if the script is being executed directly.
    // The `process.argv[1]` is the path to the executed script file.
    // `fileURLToPath(import.meta.url)` gives the path to the current module.
    // Comparing them tells us if this is the entry point.
    if (process.argv[1] === fileURLToPath(import.meta.url)) {
        console.log('Running pre-build script directly...');
        await generateBuildInfo();
    }
})();

// Also export the function for use in other modules like vite.config.ts
export { generateBuildInfo };