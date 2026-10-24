const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

async function build() {
  // 1. Bundle JS
  const jsOptions = {
    entryPoints: ['src/js/chrome-options.js'],
    outfile: 'dist/main.min.js',
    bundle: true,
    format: 'iife',
    sourcemap: true,
    minify: !isDev,
    target: ['chrome58'],
    loader: { '.png': 'dataurl' },
    define: { global: 'window' }
  };

  // 2. Bundle CSS
  const cssOptions = {
    entryPoints: ['src/css/chrome-options.css'],
    outfile: 'dist/styles.min.css',
    bundle: true,
    sourcemap: true,
    minify: !isDev,
    loader: { '.png': 'dataurl' }
  };

  if (isWatch) {
    const jsCtx = await esbuild.context(jsOptions);
    const cssCtx = await esbuild.context({
      ...cssOptions,
      plugins: [{
        name: 'write-styles-js',
        onEnd() {
          generateStylesJs();
        }
      }]
    });
    await jsCtx.watch();
    await cssCtx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(jsOptions);
    await esbuild.build(cssOptions);
    generateStylesJs();
    console.log('Build complete.');
  }
}

function generateStylesJs() {
  const cssPath = path.resolve(distDir, 'styles.min.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    const js = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();\n`;
    fs.writeFileSync(path.resolve(distDir, 'styles.min.js'), js);
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
