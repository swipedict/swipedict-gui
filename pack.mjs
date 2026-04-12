import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const OUTPUT_FILE = 'project_bundle.txt';

// Folders to completely ignore
const IGNORE_DIRS = [
    'node_modules',
    '.git',
    'dist',
    '.vscode',
    '.idea',
    'coverage',
    'logs'
];

// Specific files to ignore
const IGNORE_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.DS_Store',
    OUTPUT_FILE,      // Don't pack the bundle into itself
    'patch.xml',      // Don't pack the last patch
    'update.js',      // Don't pack the updater
    'pack.js'         // Don't pack this script
];

// Binary extensions to skip (AI can't read images/fonts)
const BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', 
    '.woff', '.woff2', '.ttf', '.eot', '.otf', 
    '.mp3', '.wav', '.ogg', '.mp4', '.webm', 
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar'
]);

// --- SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let fileCount = 0;

// --- MAIN FUNCTION ---
function packProject() {
    console.log('📦 Packing project into single text file...');
    
    // Clear previous bundle
    if (fs.existsSync(OUTPUT_FILE)) {
        fs.unlinkSync(OUTPUT_FILE);
    }

    const stream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });

    // Header
    stream.write(`--- SWIPEDICT PROJECT BUNDLE ---\n`);
    stream.write(`--- Date: ${new Date().toISOString()} ---\n\n`);

    // Start Recursion
    walkDir(__dirname, stream);

    stream.end();
    console.log('-----------------------------------------');
    console.log(`✅ Success! Packed ${fileCount} files.`);
    console.log(`📄 Output: ${OUTPUT_FILE}`);
    console.log('-----------------------------------------');
}

// --- RECURSIVE WALKER ---
function walkDir(dir, stream) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(__dirname, fullPath);

        // 1. Check Ignored Directories
        if (stat.isDirectory()) {
            if (IGNORE_DIRS.includes(file)) continue;
            walkDir(fullPath, stream);
            continue;
        }

        // 2. Check Ignored Files
        if (IGNORE_FILES.includes(file)) continue;

        // 3. Check Binary Extensions
        const ext = path.extname(file).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;

        // 4. Process File
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Format for AI readability
            stream.write(`\n\n// --- File: ${relativePath} ---\n`);
            stream.write(`// --- Start Content ---\n`);
            stream.write(content);
            stream.write(`\n// --- End Content ---\n`);
            stream.write(`--------------------------------------------------\n`);
            
            console.log(`   📄 Added: ${relativePath}`);
            fileCount++;
        } catch (error) {
            console.warn(`   ⚠️ Skipped (Error reading): ${relativePath}`);
        }
    }
}

// Run it
packProject();