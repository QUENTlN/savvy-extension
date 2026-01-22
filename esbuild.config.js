const esbuild = require('esbuild');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Build configuration for esbuild
 * @param {string} targetBrowser - 'firefox' or 'chrome'
 * @param {string} buildDir - Output directory
 */
async function bundleJS(targetBrowser, buildDir) {
  const entryPoints = {
    'sidebar/sidebar.bundle': 'src/sidebar/sidebar.js',
    'popup/popup.bundle': 'src/popup/popup.js',
  };

  // Background script entry point depends on target
  if (targetBrowser === 'firefox') {
    entryPoints['background.bundle'] = 'src/background/background.js';
  } else {
    entryPoints['background.service-worker'] = 'src/background/background.js';
  }

  await esbuild.build({
    entryPoints,
    bundle: true,
    outdir: buildDir,
    format: 'iife',
    minify: isProduction,
    sourcemap: !isProduction,
    target: ['chrome88', 'firefox78'],
    logLevel: 'info',
  });

  console.log(`JS bundled with esbuild for ${targetBrowser}`);
}

module.exports = { bundleJS };
