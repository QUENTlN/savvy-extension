const fs = require('fs-extra');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const { bundleJS } = require('./esbuild.config.cjs');

// Paths

const srcDir = path.join(__dirname, 'src');
// Determine target browser from CLI argument or environment variable
// Returns null if no browser specified (build both)
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

  return null;
}

const targetBrowser = getTargetBrowser();

// Step 1b: Copy the appropriate manifest file
async function copyManifest(browser, dir) {
  try {
    const manifestSource = path.join(srcDir, `manifest.${browser}.json`);
    const manifestDest = path.join(dir, 'manifest.json');

    await fs.copy(manifestSource, manifestDest);
    console.log(`Manifest copied for ${browser}: manifest.${browser}.json -> manifest.json`);
  } catch (err) {
    console.error(`Error copying manifest for ${browser}:`, err);
    throw err;
  }
}

// Step 1c: Copy locales directory
async function copyLocalesFolder(dir) {
  try {
    const localesSource = path.join(srcDir, 'locales');
    const localesDest = path.join(dir, 'locales');

    await fs.copy(localesSource, localesDest);
    console.log('Locales folder copied to build.');
  } catch (err) {
    console.error('Error copying locales folder:', err);
  }
}

// Step 2: Copy all HTML files from 'src' to 'build' recursively
async function copyHtmlFiles(dir) {
    try {
        const getAllHtmlFiles = async (searchDir) => {
            const files = await fs.readdir(searchDir);
            const htmlFiles = [];

            for (const file of files) {
                const fullPath = path.join(searchDir, file);
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
            const destPath = path.join(dir, relativePath);
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
async function processCssFiles(dir) {
    try {
        const getAllCssFiles = async (searchDir) => {
            const files = await fs.readdir(searchDir);
            const cssFiles = [];

            for (const file of files) {
                const fullPath = path.join(searchDir, file);
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
            const destPath = path.join(dir, relativePath);
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

// Step 4: Bundle JavaScript files with esbuild
async function bundleJsFiles(browser, dir) {
    try {
        // Bundle main entry points with esbuild
        await bundleJS(browser, dir);

        // Copy content scripts without bundling (they run in page context)
        const contentScriptsDir = path.join(srcDir, 'content-scripts');
        const contentScriptsDest = path.join(dir, 'content-scripts');

        if (await fs.pathExists(contentScriptsDir)) {
            await fs.copy(contentScriptsDir, contentScriptsDest);
            console.log('Content scripts copied to build.');
        }

        console.log('All JS files processed.');
    } catch (err) {
        console.error('Error processing JS files:', err);
        throw err;
    }
}

// Step 5: Copy icons folder from src
async function copyIconsFolder(dir) {
    try {
        const iconsSource = path.join(srcDir, 'icons');
        const iconsDest = path.join(dir, 'icons');

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

// Build for a single browser
async function buildForBrowser(browser) {
  const dir = path.join(__dirname, 'build', browser);
  try {
    await fs.emptyDir(dir);
    console.log(`Build directory cleaned. Building for ${browser}...`);
    await copyManifest(browser, dir);
    await copyLocalesFolder(dir);
    await copyIconsFolder(dir);
    await copyHtmlFiles(dir);
    await processCssFiles(dir);
    await bundleJsFiles(browser, dir);
    console.log(`Build process completed for ${browser}.`);
  } catch (err) {
    console.error(`Build process failed for ${browser}:`, err);
    throw err;
  }
}

// Run all tasks
async function build() {
  try {
    if (targetBrowser) {
      // Build for specific browser
      await buildForBrowser(targetBrowser);
    } else {
      // Build for both browsers
      console.log('No browser specified, building for both Firefox and Chrome...\n');
      await buildForBrowser('firefox');
      console.log('');
      await buildForBrowser('chrome');
      console.log('\n✅ Build completed for both browsers.');
    }
  } catch (err) {
    console.error('Build process failed:', err);
    process.exit(1);
  }
}

async function processFile(filePath, browser, dir) {
    const relativePath = path.relative(srcDir, filePath);
    const destPath = path.join(dir, relativePath);

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
            // Rebundle all JS with esbuild (fast enough for watch mode)
            await bundleJsFiles(browser, dir);
            console.log(`JS rebundled after change: ${relativePath}`);
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

// Watch mode implementation (requires a specific browser)
async function watchMode() {
    if (!targetBrowser) {
        console.error('❌ Watch mode requires a specific browser. Use --browser=firefox or --browser=chrome');
        process.exit(1);
    }

    const watchDir = path.join(__dirname, 'build', targetBrowser);
    console.log(`\n🔍 Watch mode enabled. Monitoring changes for ${targetBrowser}...\n`);

    // Perform initial build
    await buildForBrowser(targetBrowser);

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
                        await copyManifest(targetBrowser, watchDir);
                    }
                    // Process individual files for faster rebuilds
                    else if (fullPath.startsWith(srcDir)) {
                        await processFile(fullPath, targetBrowser, watchDir);

                        // If HTML or JS changed, reprocess all CSS files
                        // This is necessary for Tailwind to detect new utility classes
                        if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
                            console.log('🎨 Reprocessing CSS files for Tailwind...');
                            await processCssFiles(watchDir);
                        }
                    }

                } else {
                    // If directory changed or complex change, do full rebuild
                    console.log('Performing full rebuild...');
                    await buildForBrowser(targetBrowser);
                }

                console.log('✅ Rebuild complete!\n');
            } catch (err) {
                // If file was deleted or error occurred, do full rebuild
                console.log('Change detected, performing full rebuild...');
                await buildForBrowser(targetBrowser);
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