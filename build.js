const fs = require('fs-extra');
const path = require('path');
const postcss = require('postcss');
const cssnano = require('cssnano');
const tailwindcss = require('@tailwindcss/postcss');
const UglifyJS = require('uglify-js');

// Paths

const srcDir = path.join(__dirname, 'src');
// Determine target browser from CLI argument or environment variable
// Default to 'firefox' if not specified
function getTargetBrowser() {
  // Check CLI arguments for --browser=firefox or --browser=chrome
  const browserArg = process.argv.find(arg => arg.startsWith('--browser='));
  if (browserArg) {
    const browser = browserArg.split('=')[1];
    if (browser === 'firefox' || browser === 'chrome') {
      return browser;
    }
  }
  
  // Check environment variable
  const envBrowser = process.env.BROWSER;
  if (envBrowser === 'firefox' || envBrowser === 'chrome') {
    return envBrowser;
  }
  
  // Default to firefox
  return 'firefox';
}

const targetBrowser = getTargetBrowser();
const buildDir = path.join(__dirname, 'build', targetBrowser);

// Check if in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Step 1b: Copy the appropriate manifest file
async function copyManifest() {
  try {
    const manifestSource = path.join(srcDir, `manifest.${targetBrowser}.json`);
    const manifestDest = path.join(buildDir, 'manifest.json');
    
    await fs.copy(manifestSource, manifestDest);
    console.log(`Manifest copied for ${targetBrowser}: manifest.${targetBrowser}.json -> manifest.json`);
  } catch (err) {
    console.error(`Error copying manifest for ${targetBrowser}:`, err);
    throw err;
  }
}

// Step 1c: Copy locales directory
async function copyLocalesFolder() {
  try {
    const localesSource = path.join(srcDir, 'locales');
    const localesDest = path.join(buildDir, 'locales');
    
    await fs.copy(localesSource, localesDest);
    console.log('Locales folder copied to build.');
  } catch (err) {
    console.error('Error copying locales folder:', err);
  }
}

// Step 2: Copy all HTML files from 'src' to 'build' recursively
async function copyHtmlFiles() {
    try {
        const getAllHtmlFiles = async (dir) => {
            const files = await fs.readdir(dir);
            const htmlFiles = [];
            
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);
                
                if (stat.isDirectory()) {
                    htmlFiles.push(...(await getAllHtmlFiles(fullPath)));
                } else if (file.endsWith('.html')) {
                    htmlFiles.push(fullPath);
                }
            }
            
            return htmlFiles;
        };

        const htmlFiles = await getAllHtmlFiles(srcDir);
        
        for (const htmlFile of htmlFiles) {
            const relativePath = path.relative(srcDir, htmlFile);
            const destPath = path.join(buildDir, relativePath);
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(htmlFile, destPath);
            console.log(`HTML file copied to build: ${relativePath}`);
        }

        console.log('All HTML files copied to build.');
    } catch (err) {
        console.error('Error copying HTML files:', err);
    }
}

// Step 3: Process CSS files with PostCSS
async function processCssFiles() {
    try {
        const getAllCssFiles = async (dir) => {
            const files = await fs.readdir(dir);
            const cssFiles = [];
            
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);
                
                if (stat.isDirectory()) {
                    cssFiles.push(...(await getAllCssFiles(fullPath)));
                } else if (file.endsWith('.css')) {
                    cssFiles.push(fullPath);
                }
            }
            
            return cssFiles;
        };

        const cssFiles = await getAllCssFiles(srcDir);
        
        for (const cssFile of cssFiles) {
            const relativePath = path.relative(srcDir, cssFile);
            const destPath = path.join(buildDir, relativePath);
            const cssContent = await fs.readFile(cssFile, 'utf8');
            const result = await postcss([tailwindcss]).process(cssContent, { from: cssFile, to: destPath });
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, result.css);
            console.log(`CSS file processed and copied to build: ${relativePath}`);
        }

        console.log('All CSS files processed and copied to build.');
    } catch (err) {
        console.error('Error processing CSS files:', err);
    }
}

// Step 4: Process JavaScript files (minify in production, copy in development)
async function minifyJsFiles() {
    try {
        const getAllJsFiles = async (dir) => {
            const files = await fs.readdir(dir);
            const jsFiles = [];
            
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);
                
                if (stat.isDirectory()) {
                    jsFiles.push(...(await getAllJsFiles(fullPath)));
                } else if (file.endsWith('.js') && !file.startsWith('manifest')) {
                    // Always exclude build utilities
                    if (file === 'service-worker-shim.js') {
                        continue;
                    }

                    // Filter files based on target browser
                    if (targetBrowser === 'firefox') {
                        // Firefox doesn't use the service worker file (if it existed in src)
                        if (file === 'background.service-worker.js') continue;
                    }
                    
                    if (targetBrowser === 'chrome') {
                        // Chrome uses the generated service worker, so exclude the source files
                        if (file === 'background.js') continue;
                        if (file === 'knownParsers.js') continue;
                    }

                     jsFiles.push(fullPath);
                }
            }
            
            return jsFiles;
        };

        const jsFiles = await getAllJsFiles(srcDir);
        
        for (const jsFile of jsFiles) {
            const relativePath = path.relative(srcDir, jsFile);
            const destPath = path.join(buildDir, relativePath);
            const jsContent = await fs.readFile(jsFile, 'utf8');

            await fs.ensureDir(path.dirname(destPath));

            if (isProduction) {
                const result = UglifyJS.minify(jsContent);
                if (result.error) throw result.error;
                await fs.writeFile(destPath, result.code);
                console.log(`JS file minified and copied to build: ${relativePath}`);
            } else {
                await fs.copy(jsFile, destPath);
                console.log(`JS file copied to build: ${relativePath}`);
            }
        }

        // Special handling for Chrome service worker generation
        if (targetBrowser === 'chrome') {
            console.log('Generating background.service-worker.js for Chrome...');
            const shimPath = path.join(srcDir, 'utils', 'service-worker-shim.js');
            const parsersPath = path.join(srcDir, 'config', 'knownParsers.js');
            const backgroundPath = path.join(srcDir, 'background.js');
            const destPath = path.join(buildDir, 'background.service-worker.js');

            const shimContent = await fs.readFile(shimPath, 'utf8');
            const parsersContent = await fs.readFile(parsersPath, 'utf8');
            const backgroundContent = await fs.readFile(backgroundPath, 'utf8');

            const combinedContent = `${shimContent}\n\n${parsersContent}\n\n${backgroundContent}`;

            if (isProduction) {
                const result = UglifyJS.minify(combinedContent);
                if (result.error) throw result.error;
                await fs.writeFile(destPath, result.code);
                console.log('Generated and minified background.service-worker.js');
            } else {
                await fs.writeFile(destPath, combinedContent);
                console.log('Generated background.service-worker.js');
            }
        }

        console.log('All JS files processed and copied to build.');
    } catch (err) {
        console.error('Error processing JS files:', err);
    }
}

// Step 5: Copy icons folder from src
async function copyIconsFolder() {
    try {
        const iconsSource = path.join(srcDir, 'icons');
        const iconsDest = path.join(buildDir, 'icons'); // Destination is still build/icons

        // Check if source exists before copying
        if (await fs.pathExists(iconsSource)) {
             await fs.copy(iconsSource, iconsDest);
             console.log('Icons folder copied to build.');
        } else {
            console.log('No icons folder found in src.');
        }

    } catch (err) {
        console.error('Error copying icons folder:', err);
    }
}

// Run all tasks
async function build() {
  try {
    await fs.emptyDir(buildDir);
    console.log(`Build directory cleaned. Building for ${targetBrowser}...`);
    await copyManifest();
    await copyLocalesFolder();
    await copyIconsFolder(); 
    await copyHtmlFiles();
    await processCssFiles();
    await minifyJsFiles();
    console.log(`Build process completed for ${targetBrowser}.`);
  } catch (err) {
    console.error('Build process failed:', err);
  }
}

async function processFile(filePath) {
    const relativePath = path.relative(srcDir, filePath);
    const destPath = path.join(buildDir, relativePath);

    try {
        if (filePath.endsWith('.html')) {
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(filePath, destPath);
            console.log(`HTML file processed: ${relativePath}`);
        } else if (filePath.endsWith('.css')) {
            const cssContent = await fs.readFile(filePath, 'utf8');
            const result = await postcss([tailwindcss]).process(cssContent, { from: filePath, to: destPath });
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, result.css);
            console.log(`CSS file processed: ${relativePath}`);
        } else if (filePath.endsWith('.js')) {
            const jsContent = await fs.readFile(filePath, 'utf8');
            await fs.ensureDir(path.dirname(destPath));
            if (isProduction) {
                const result = UglifyJS.minify(jsContent);
                if (result.error) throw result.error;
                await fs.writeFile(destPath, result.code);
                console.log(`JS file minified: ${relativePath}`);
            } else {
                await fs.copy(filePath, destPath);
                console.log(`JS file copied: ${relativePath}`);
            }
        } else if (relativePath.startsWith('icons/')) {
             await fs.ensureDir(path.dirname(destPath));
             await fs.copy(filePath, destPath);
             console.log(`Icon file processed: ${relativePath}`);
        } else {
            console.log(`Unsupported file type: ${relativePath}`);
        }
    } catch (err) {
        console.error(`Error processing file ${relativePath}:`, err);
    }
}

// Find the first argument that doesn't start with '--'
const args = process.argv.slice(2);
const changedFilePath = args.find(arg => !arg.startsWith('--'));
const isWatchMode = process.argv.includes('--watch');

// Watch mode implementation
async function watchMode() {
    console.log(`\n🔍 Watch mode enabled. Monitoring changes for ${targetBrowser}...\n`);
    
    // Perform initial build
    await build();
    
    let debounceTimer = null;
    const debounceDelay = 300; // milliseconds
    
    // Function to handle file changes with debouncing
    const handleFileChange = (eventType, filename, watchPath) => {
        if (!filename) return;
        
        const fullPath = path.join(watchPath, filename);
        
        // Ignore build directory, node_modules, and hidden files
        if (fullPath.includes('build') || 
            fullPath.includes('node_modules') || 
            filename.startsWith('.')) {
            return;
        }
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            console.log(`\n📝 Change detected: ${filename}`);
            
            try {
                const stats = await fs.stat(fullPath);
                
                if (stats.isFile()) {
                    // Check if it's a manifest file
                    if (filename.startsWith('manifest') && filename.endsWith('.json')) {
                        console.log('Manifest file changed, rebuilding...');
                        await copyManifest();
                    }
                    // Process individual files for faster rebuilds
                    else if (fullPath.startsWith(srcDir)) {
                        await processFile(fullPath);
                        
                        // If HTML or JS changed, reprocess all CSS files
                        // This is necessary for Tailwind to detect new utility classes
                        if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
                            console.log('🎨 Reprocessing CSS files for Tailwind...');
                            await processCssFiles();
                        }
                    }

                } else {
                    // If directory changed or complex change, do full rebuild
                    console.log('Performing full rebuild...');
                    await build();
                }
                
                console.log('✅ Rebuild complete!\n');
            } catch (err) {
                // If file was deleted or error occurred, do full rebuild
                console.log('Change detected, performing full rebuild...');
                await build();
                console.log('✅ Rebuild complete!\n');
            }
        }, debounceDelay);
    };
    
    // Watch src directory
    fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
        handleFileChange(eventType, filename, srcDir);
    });
    

    
    console.log('👀 Watching for changes... (Press Ctrl+C to stop)\n');
}

// Main execution logic
if (isWatchMode) {
    watchMode().catch(err => {
        console.error('Watch mode failed:', err);
        process.exit(1);
    });
} else if (changedFilePath) {
    processFile(changedFilePath).then(() => {
        console.log('File processing completed.');
    }).catch(err => {
        console.error('Error processing file:', err);
    });
} else {
    // Si aucun fichier spécifique n'est passé, exécutez le build complet
    build();
}