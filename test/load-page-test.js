const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const puppeteer = require('puppeteer-core');
const build = require('../build');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

describe('chrome-options page loading', function() {
  this.timeout(15000);

  let server;
  let serverUrl;
  let browser;

  before(async () => {
    // Ensure fresh build exists
    await build();

    server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];

      if (urlPath === '/chrome.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(`
          window.chrome = {
            storage: {
              sync: {
                _data: {},
                get: function(keys, cb) {
                  var res = {};
                  if (Array.isArray(keys)) {
                    keys.forEach(function(k) { res[k] = window.chrome.storage.sync._data[k]; });
                  } else if (typeof keys === 'string') {
                    res[keys] = window.chrome.storage.sync._data[keys];
                  } else {
                    res = Object.assign({}, window.chrome.storage.sync._data);
                  }
                  setTimeout(function() { cb(res); }, 0);
                },
                set: function(obj, cb) {
                  Object.assign(window.chrome.storage.sync._data, obj);
                  if (cb) setTimeout(cb, 0);
                }
              }
            },
            runtime: {
              getManifest: function() {
                return {
                  name: 'Test Extension',
                  description: 'Options test extension description',
                  options_ui: { open_in_tab: true }
                };
              }
            }
          };
        `);
        return;
      }

      if (urlPath === '/dist/main.min.js' || urlPath === '/node_modules/chrome-options/dist/main.min.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(fs.readFileSync(path.join(DIST_DIR, 'main.min.js')));
        return;
      }

      if (urlPath === '/dist/styles.min.js' || urlPath === '/node_modules/chrome-options/dist/styles.min.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(fs.readFileSync(path.join(DIST_DIR, 'styles.min.js')));
        return;
      }

      if (urlPath === '/dist/styles.min.css' || urlPath === '/node_modules/chrome-options/dist/styles.min.css') {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(fs.readFileSync(path.join(DIST_DIR, 'styles.min.css')));
        return;
      }

      if (urlPath === '/tabs.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Options Page Tabs Test</title>
  <script src="/dist/styles.min.js"></script>
  <script src="/chrome.js"></script>
  <script src="/dist/main.min.js" defer></script>
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      chrome.options.opts.about = '<p>Custom about paragraph</p>';
      chrome.options.addTab('General', [
        { name: 'enable_feature', type: 'checkbox', desc: 'Enable feature', default: true },
        { name: 'username', type: 'text', desc: 'Username', default: 'testuser' },
        { name: 'theme', type: 'color', desc: 'Theme color', default: '#336699' },
        { name: 'speed', type: 'select', desc: 'Speed', options: ['Slow', 'Medium', 'Fast'] },
        { name: 'mode', type: 'radio', desc: 'Mode', options: ['A', 'B'] },
        {
          name: 'todo_list',
          type: 'list',
          desc: 'Tasks list',
          head: true,
          sortable: true,
          fields: [
            { name: 'task', type: 'text', desc: 'Task Name' },
            { name: 'done', type: 'checkbox', desc: 'Done' }
          ]
        },
        {
          name: 'profile',
          type: 'object',
          desc: 'User Profile',
          options: [
            { name: 'bio', type: 'text', desc: 'Biography' }
          ]
        },
        { name: 'alert_sound', type: 'predefined_sound', desc: 'Alert Sound' },
        { name: 'custom_alert', type: 'custom_sound', desc: 'Custom Sound' }
      ]);

      chrome.options.addTab('Advanced', [
        { name: 'debug_logging', type: 'checkbox', desc: 'Enable debug logging' }
      ]);
    });
  </script>
</head>
<body class="chrome-bootstrap">
  <div class="frame">
    <div class="navigation">
      <h1 class="chrome-options-title"></h1>
      <ul id="main-menu" class="menu"></ul>
      <ul class="menu about">
        <li><a href="#about">About</a></li>
      </ul>
    </div>
    <div class="mainview view">
      <div id="about">
        <header><h1>About</h1></header>
        <div class="content"><p>Default about</p></div>
      </div>
    </div>
    <div class="save-container">
      <span class="auto">Saved!</span>
      <button disabled>Save</button>
    </div>
  </div>
</body>
</html>`);
        return;
      }

      if (urlPath === '/single.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Options Single Page Test</title>
  <script src="/dist/styles.min.js"></script>
  <script src="/chrome.js"></script>
  <script src="/dist/main.min.js" defer></script>
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      chrome.options.set('General Settings', [
        { name: 'simple_toggle', type: 'checkbox', desc: 'Enable toggle' }
      ]);
    });
  </script>
</head>
<body class="chrome-bootstrap">
  <div class="frame">
    <div class="navigation">
      <h1 class="chrome-options-title"></h1>
      <ul id="main-menu" class="menu"></ul>
      <ul class="menu about">
        <li><a href="#about">About</a></li>
      </ul>
    </div>
    <div class="mainview view">
      <div id="about">
        <header><h1>About</h1></header>
        <div class="content"><p>About</p></div>
      </div>
    </div>
    <div class="save-container">
      <span class="auto">Saved!</span>
      <button disabled>Save</button>
    </div>
  </div>
</body>
</html>`);
        return;
      }

      if (urlPath === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (urlPath.startsWith('/sounds/') || urlPath.startsWith('/node_modules/chrome-options/sounds/')) {
        const soundFile = path.basename(urlPath);
        const filePath = path.join(ROOT_DIR, 'sounds', decodeURIComponent(soundFile));
        if (fs.existsSync(filePath)) {
          res.writeHead(200, { 'Content-Type': 'audio/wav' });
          res.end(fs.readFileSync(filePath));
          return;
        }
      }

      res.writeHead(404);
      res.end('Not found');
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const executablePath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH;
    browser = await puppeteer.launch({
      channel: executablePath ? undefined : 'chrome',
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  after(async () => {
    if (server) {
      try {
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        server.close();
      } catch (e) {}
    }
    if (browser) {
      try {
        const proc = browser.process();
        await Promise.race([
          browser.close(),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
        if (proc && !proc.killed) {
          proc.kill('SIGKILL');
        }
      } catch (e) {}
    }
  });

  let page;
  let consoleErrors;
  let pageErrors;

  beforeEach(async () => {
    page = await browser.newPage();
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  it('loads multi-tab options page with no console or runtime errors', async () => {
    await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });

    assert.strictEqual(
      pageErrors.length,
      0,
      `Expected 0 page errors, received:\n${pageErrors.join('\n')}`
    );
    assert.strictEqual(
      consoleErrors.length,
      0,
      `Expected 0 console errors, received:\n${consoleErrors.join('\n')}`
    );

    // Verify title and manifest metadata applied
    const titleText = await page.$eval('.chrome-options-title', (el) => el.textContent);
    assert.strictEqual(titleText, 'Test Extension');

    // Verify tabs rendered in menu
    const tabCount = await page.$$eval('#main-menu li', (els) => els.length);
    assert.strictEqual(tabCount, 2);

    // Verify style tag injected by styles.min.js
    const styleInjected = await page.$eval('head style', (el) => el.textContent.length > 0);
    assert.strictEqual(styleInjected, true);

    // Verify fields rendered in DOM
    const hasCheckbox = await page.$('input[type="checkbox"]');
    assert.ok(hasCheckbox, 'Checkbox should be rendered');

    const hasColorBox = await page.$('span.color-box');
    assert.ok(hasColorBox, 'Color box element should be rendered');

    const hasListTable = await page.$('tbody');
    assert.ok(hasListTable, 'Sortable list table should be rendered');

    const hasSelect = await page.$('select');
    assert.ok(hasSelect, 'Select dropdown should be rendered');

    // Verify option containers have data-name and data-key attributes
    const hasNamedCheckbox = await page.$('[data-name="enable_feature"][data-key="general.enable_feature"]');
    assert.ok(hasNamedCheckbox, 'Checkbox container should have data-name and data-key');

    const hasNamedText = await page.$('[data-name="username"][data-key="general.username"]');
    assert.ok(hasNamedText, 'Text field container should have data-name and data-key');

    const hasNamedColor = await page.$('[data-name="theme"][data-key="general.theme"]');
    assert.ok(hasNamedColor, 'Color field container should have data-name and data-key');

    const hasNamedList = await page.$('[data-name="todo_list"][data-key="general.todo_list"]');
    assert.ok(hasNamedList, 'List container should have data-name and data-key');

    const hasNestedObjectField = await page.$('[data-name="bio"][data-key="general.profile.bio"]');
    assert.ok(hasNestedObjectField, 'Nested object field container should have data-name and full data-key');
  });

  it('loads single-page options layout with no console or runtime errors', async () => {
    await page.goto(`${serverUrl}/single.html`, { waitUntil: 'networkidle0' });

    assert.strictEqual(
      pageErrors.length,
      0,
      `Expected 0 page errors, received:\n${pageErrors.join('\n')}`
    );
    assert.strictEqual(
      consoleErrors.length,
      0,
      `Expected 0 console errors, received:\n${consoleErrors.join('\n')}`
    );

    const hasCheckbox = await page.$('input[type="checkbox"]');
    assert.ok(hasCheckbox, 'Checkbox should be rendered');

    const hasSingleKey = await page.$('[data-name="simple_toggle"][data-key="simple_toggle"]');
    assert.ok(hasSingleKey, 'Single page container should have data-name and data-key');
  });

  it('saves option changes to chrome.storage.sync without errors', async () => {
    await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });

    // Click checkbox to toggle value
    const checkbox = await page.$('input[type="checkbox"]');
    await checkbox.click();

    // Small delay to allow requestAnimationFrame and storage sync
    await new Promise((r) => setTimeout(r, 200));

    assert.strictEqual(pageErrors.length, 0);
    assert.strictEqual(consoleErrors.length, 0);

    const storedValue = await page.evaluate(() => {
      return window.chrome.storage.sync._data['general.enable_feature'];
    });
    assert.strictEqual(storedValue, false);
  });
});
