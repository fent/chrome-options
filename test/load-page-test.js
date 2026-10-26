const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const puppeteer = require('puppeteer-core');
const v8toIstanbul = require('v8-to-istanbul');
const { createCoverageMap } = require('istanbul-lib-coverage');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

describe('chrome-options page loading', function() {
  this.timeout(15000);

  let server;
  let serverUrl;
  let browser;

  before(async () => {
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

      if (urlPath === '/fallback.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title></title>
  <script src="/dist/styles.min.js"></script>
  <script>
    window.chrome = {
      storage: { sync: { _data: {}, get: (k, cb) => cb({}), set: (o, cb) => cb && cb() } },
      runtime: { getManifest: () => ({ name: null, description: 'Manifest fallback description', options_ui: { open_in_tab: false } }) }
    };
  </script>
  <script src="/dist/main.min.js" defer></script>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      chrome.options.opts.title = false;
      chrome.options.opts.about = null;
      chrome.options.addTab('FallbackTab', [{ name: 'opt1', type: 'checkbox' }]);
    });
  </script>
</head>
<body class="chrome-bootstrap">
  <div class="frame">
    <div class="navigation"><h1 class="chrome-options-title"></h1><ul id="main-menu" class="menu"></ul><ul class="menu about"><li><a href="#about">About</a></li></ul></div>
    <div class="mainview view"><div id="about"><header><h1>About</h1></header><div class="content"><p>Placeholder</p></div></div></div>
    <div class="save-container"><span class="auto">Saved!</span><button disabled>Save</button></div>
  </div>
</body>
</html>`);
        return;
      }

      if (urlPath === '/params.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title></title>
  <script src="/dist/styles.min.js"></script>
  <script src="/chrome.js"></script>
  <script src="/dist/main.min.js" defer></script>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      chrome.options.addTab('Filtered', [
        {
          type: 'column',
          options: [
            { name: 'other_opt', type: 'checkbox' },
            { name: 'target_opt', type: 'checkbox' }
          ]
        },
        {
          type: 'row',
          options: [
            { name: 'row_opt', type: 'checkbox' }
          ]
        }
      ]);
    });
  </script>
</head>
<body class="chrome-bootstrap">
  <div class="frame">
    <div class="navigation"><h1 class="chrome-options-title"></h1><ul id="main-menu" class="menu"></ul><ul class="menu about"><li><a href="#about">About</a></li></ul></div>
    <div class="mainview view"><div id="about"><header><h1>About</h1></header><div class="content"><p>About</p></div></div></div>
    <div class="save-container"><span class="auto">Saved!</span><button disabled>Save</button></div>
  </div>
</body>
</html>`);
        return;
      }

      if (urlPath === '/manual.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title></title>
  <script src="/dist/styles.min.js"></script>
  <script src="/chrome.js"></script>
  <script src="/dist/main.min.js" defer></script>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      chrome.options.opts.autoSave = false;
      chrome.options.addTab('ManualInitial', [{ name: 'opt', type: 'checkbox' }]);
    });
  </script>
</head>
<body class="chrome-bootstrap">
  <div class="frame">
    <div class="navigation"><h1 class="chrome-options-title"></h1><ul id="main-menu" class="menu"></ul><ul class="menu about"><li><a href="#about">About</a></li></ul></div>
    <div class="mainview view"><div id="about"><header><h1>About</h1></header><div class="content"><p>About</p></div></div></div>
    <div class="save-container"><span class="auto">Saved!</span><button disabled>Save</button></div>
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

  const collectedCoverage = [];

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

    if (collectedCoverage.length > 0) {
      try {
        const coverageMap = createCoverageMap({});
        for (const entry of collectedCoverage) {
          if (entry.url && entry.url.includes('main.min.js') && entry.rawScriptCoverage) {
            const filePath = path.join(DIST_DIR, 'main.min.js');
            const mapPath = path.join(DIST_DIR, 'main.min.js.map');
            if (fs.existsSync(mapPath)) {
              const converter = v8toIstanbul(filePath, 0, {
                source: entry.text,
                sourceMap: { sourcemap: JSON.parse(fs.readFileSync(mapPath, 'utf8')) }
              });
              await converter.load();
              converter.applyCoverage(entry.rawScriptCoverage.functions);
              const istanbulData = converter.toIstanbul();
              for (const [sourcePath, data] of Object.entries(istanbulData)) {
                if (sourcePath.startsWith(path.join(ROOT_DIR, 'src'))) {
                  coverageMap.merge({ [sourcePath]: data });
                }
              }
            }
          }
        }
        const nycDir = path.join(ROOT_DIR, '.nyc_output');
        if (!fs.existsSync(nycDir)) {
          fs.mkdirSync(nycDir, { recursive: true });
        }
        fs.writeFileSync(path.join(nycDir, 'browser-coverage.json'), JSON.stringify(coverageMap.toJSON()));
      } catch (err) {
        console.error('Error generating coverage:', err);
      }
    }
  });

  let page;
  let consoleErrors;
  let pageErrors;

  beforeEach(async () => {
    page = await browser.newPage();
    consoleErrors = [];
    pageErrors = [];

    await page.coverage.startJSCoverage({ includeRawScriptCoverage: true, resetOnNavigation: false });

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
      try {
        const pageCoverage = await page.coverage.stopJSCoverage();
        if (pageCoverage) {
          collectedCoverage.push(...pageCoverage);
        }
      } catch (e) {}
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

  describe('utility functions', () => {
    it('compares primitives, nulls, and nested structures with deepEqual', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const checks = await page.evaluate(() => {
        const { deepEqual } = chrome.options.util;
        return {
          diffTypes: deepEqual(1, '1'),
          bothNull: deepEqual(null, null),
          firstNull: deepEqual(null, {}),
          secondNull: deepEqual({}, null),
          keyCountDiff: deepEqual({ a: 1 }, { a: 1, b: 2 }),
          keyNamesDiff: deepEqual({ a: 1 }, { b: 1 }),
          valuesDiff: deepEqual({ a: 1 }, { a: 2 }),
          nestedMatch: deepEqual({ a: [1, 2], b: { c: 'd' } }, { a: [1, 2], b: { c: 'd' } })
        };
      });

      assert.strictEqual(checks.diffTypes, false);
      assert.strictEqual(checks.bothNull, true);
      assert.strictEqual(checks.firstNull, false);
      assert.strictEqual(checks.secondNull, false);
      assert.strictEqual(checks.keyCountDiff, false);
      assert.strictEqual(checks.keyNamesDiff, false);
      assert.strictEqual(checks.valuesDiff, false);
      assert.strictEqual(checks.nestedMatch, true);
    });

    it('creates deep copies of primitives, arrays, and objects with deepClone', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const checks = await page.evaluate(() => {
        const { deepClone, deepEqual } = chrome.options.util;
        const num = deepClone(42);
        const nullVal = deepClone(null);
        const originalArr = [1, { val: 2 }];
        const clonedArr = deepClone(originalArr);
        const originalObj = { x: 1, y: [2, 3] };
        const clonedObj = deepClone(originalObj);

        return {
          numCopy: num === 42,
          nullCopy: nullVal === null,
          arrEqual: deepEqual(originalArr, clonedArr) && originalArr !== clonedArr && originalArr[1] !== clonedArr[1],
          objEqual: deepEqual(originalObj, clonedObj) && originalObj !== clonedObj && originalObj.y !== clonedObj.y
        };
      });

      assert.strictEqual(checks.numCopy, true);
      assert.strictEqual(checks.nullCopy, true);
      assert.strictEqual(checks.arrEqual, true);
      assert.strictEqual(checks.objEqual, true);
    });

    it('debounces rapid sequential calls and executes after the wait duration', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        const { debounce } = chrome.options.util;
        let callCount = 0;
        let receivedArg;
        const debounced = debounce(30, (arg) => {
          callCount++;
          receivedArg = arg;
        });

        debounced('first');
        debounced('second');
        debounced('final');

        await new Promise((resolve) => setTimeout(resolve, 60));
        return { callCount, receivedArg };
      });

      assert.strictEqual(result.callCount, 1);
      assert.strictEqual(result.receivedArg, 'final');
    });
  });

  describe('hyperscript element creation', () => {
    it('parses attribute selectors, IDs, classes, and tag names', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const results = await page.evaluate(() => {
        const h = chrome.options.h;
        const el1 = h('[data-key="custom-val"][id=elem-id][data-mode=auto]');
        const el2 = h('.alpha.beta');
        const el3 = h('#heading-id');
        const el4 = h('');
        const el5 = h('span#item.active');

        return {
          el1Attr: el1.getAttribute('data-key') === 'custom-val' && el1.id === 'elem-id' && el1.getAttribute('data-mode') === 'auto',
          el2Class: el2.tagName === 'DIV' && el2.classList.contains('alpha') && el2.classList.contains('beta'),
          el3Id: el3.tagName === 'DIV' && el3.id === 'heading-id',
          el4Div: el4.tagName === 'DIV',
          el5Span: el5.tagName === 'SPAN' && el5.id === 'item' && el5.classList.contains('active')
        };
      });

      for (const [key, val] of Object.entries(results)) {
        assert.strictEqual(val, true, `Expected ${key} to be true`);
      }
    });

    it('binds event listeners, innerHTML, properties, and boolean attributes', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const results = await page.evaluate(() => {
        const h = chrome.options.h;
        let wasClicked = false;
        const btn = h('button', {
          onclick: () => { wasClicked = true; },
          innerHTML: '<em>Action</em>',
          disabled: false,
          tabindex: '2'
        });
        btn.click();

        return {
          wasClicked,
          hasInnerHTML: btn.querySelector('em') != null && btn.textContent === 'Action',
          disabledSkipped: !btn.hasAttribute('disabled'),
          hasTabIndex: btn.getAttribute('tabindex') === '2'
        };
      });

      assert.strictEqual(results.wasClicked, true);
      assert.strictEqual(results.hasInnerHTML, true);
      assert.strictEqual(results.disabledSkipped, true);
      assert.strictEqual(results.hasTabIndex, true);
    });

    it('appends text, array of elements, single nodes, and NodeLists', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const results = await page.evaluate(() => {
        const h = chrome.options.h;
        const textParent = h('div', 'direct text');
        const arrParent = h('div', [h('span', 'a'), h('span', 'b')]);
        const singleNode = document.createElement('strong');
        const nodeParent = h('div', singleNode);

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = '<code>1</code><code>2</code>';
        const listParent = h('div', tempContainer.childNodes);

        return {
          textMatches: textParent.textContent === 'direct text',
          arrCount: arrParent.children.length === 2,
          nodeMatches: nodeParent.firstElementChild === singleNode,
          listCount: listParent.childNodes.length === 2
        };
      });

      assert.strictEqual(results.textMatches, true);
      assert.strictEqual(results.arrCount, true);
      assert.strictEqual(results.nodeMatches, true);
      assert.strictEqual(results.listCount, true);
    });
  });

  describe('dom animation helpers', () => {
    it('animates vertical and horizontal transitions for standard and tall elements', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const results = await page.evaluate(async () => {
        const dom = chrome.options.dom;

        const elStandard = document.createElement('div');
        elStandard.style.height = '40px';
        document.body.appendChild(elStandard);
        dom.slideYShow(elStandard, 10);

        const elTall = document.createElement('div');
        elTall.innerHTML = `<div style="height: ${window.innerHeight + 400}px">content</div>`;
        document.body.appendChild(elTall);
        dom.slideYShow(elTall, 10);
        dom.slideYHide(elTall, 10);

        const elHorizontal = document.createElement('div');
        elHorizontal.style.width = '80px';
        document.body.appendChild(elHorizontal);
        dom.slideXShow(elHorizontal, 10);
        dom.slideXHide(elHorizontal, 10);

        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          horizontalHidden: elHorizontal.style.display === 'none'
        };
      });

      assert.strictEqual(results.horizontalHidden, true);
    });

    it('animates showing and hiding table rows and applies temporary flash highlight classes', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const results = await page.evaluate(async () => {
        const dom = chrome.options.dom;
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');
        const tr1 = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = 'item 1';
        tr1.appendChild(td1);
        tbody.appendChild(tr1);

        const tr2 = document.createElement('tr');
        const td2 = document.createElement('td');
        td2.textContent = 'item 2';
        tr2.appendChild(td2);
        tbody.appendChild(tr2);

        table.appendChild(tbody);
        document.body.appendChild(table);

        dom.showTR(tr1);
        let hideCallbackRan = false;
        dom.hideTR(tr1, () => { hideCallbackRan = true; });
        dom.hideTR(tr2);

        const flashTarget = document.createElement('div');
        document.body.appendChild(flashTarget);
        const flasher = dom.flashClass(flashTarget, 'active-flash', 25);
        flasher();
        flasher();

        await new Promise((resolve) => setTimeout(resolve, 600));
        return {
          hideCallbackRan,
          flashRemoved: !flashTarget.classList.contains('active-flash')
        };
      });

      assert.strictEqual(results.hideCallbackRan, true);
      assert.strictEqual(results.flashRemoved, true);
    });
  });

  describe('field types and interactions', () => {
    it('supports text and url inputs with debounced input and change events', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        let savedVal;
        const textField = chrome.options.fields.text('initial', (val) => {
          savedVal = val;
        });
        document.body.appendChild(textField);

        textField.value = 'updated';
        textField.dispatchEvent(new Event('input', { bubbles: true }));
        textField.dispatchEvent(new Event('change', { bubbles: true }));

        const urlField = chrome.options.fields.url('https://example.com', () => {});
        document.body.appendChild(urlField);

        await new Promise((resolve) => setTimeout(resolve, 600));
        return {
          savedVal,
          isUrlType: urlField.getAttribute('type') === 'url'
        };
      });

      assert.strictEqual(result.savedVal, 'updated');
      assert.strictEqual(result.isUrlType, true);
    });

    it('renders select dropdowns with string and key-value options', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        let savedStringVal;
        const strSelect = chrome.options.fields.select('opt2', (val) => {
          savedStringVal = val;
        }, { options: ['opt1', 'opt2'] });

        let savedObjVal;
        const objSelect = chrome.options.fields.select('k1', (val) => {
          savedObjVal = val;
        }, {
          options: [
            { value: 'k1', desc: 'Label One' },
            { value: 'k2', desc: 'Label Two' }
          ]
        });

        objSelect.value = 'k2';
        objSelect.dispatchEvent(new Event('change'));

        return {
          strSelected: strSelect.value === 'opt2',
          savedObjVal
        };
      });

      assert.strictEqual(result.strSelected, true);
      assert.strictEqual(result.savedObjVal, 'k2');
    });

    it('renders radio button groups with unique names and updates selected values', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        let savedRadioVal;
        const radioGroup = chrome.options.fields.radio('a', (val) => {
          savedRadioVal = val;
        }, {
          options: [
            { value: 'a', desc: 'Option A' },
            { value: 'b', desc: 'Option B' }
          ]
        });
        document.body.appendChild(radioGroup);

        const secondRadio = radioGroup.querySelectorAll('input[type="radio"]')[1];
        secondRadio.checked = true;
        secondRadio.dispatchEvent(new Event('change', { bubbles: true }));

        // string option radio
        const strRadioGroup = chrome.options.fields.radio('one', () => {}, { options: ['one', 'two'] });
        document.body.appendChild(strRadioGroup);

        return {
          savedRadioVal,
          firstSelected: radioGroup.querySelector('input[type="radio"]').value === 'a'
        };
      });

      assert.strictEqual(result.savedRadioVal, 'b');
      assert.strictEqual(result.firstSelected, true);
    });

    it('renders and interacts with color fields across color formats and reset options', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        let savedColor;
        const colorContainer = chrome.options.fields.color('#336699', (val) => {
          savedColor = val;
        }, { format: 'hex', default: '#112233' });
        document.body.appendChild(colorContainer);

        // Click color-box to open picker
        const colorBox = colorContainer.querySelector('.color-box');
        colorBox.click();

        // Click reset to default
        const resetBtn = document.querySelector('.color-reset');
        if (resetBtn) {
          resetBtn.click();
        }

        // Test format rgba, rgb, hsl, hsla
        const rgbaContainer = chrome.options.fields.color('rgba(10, 20, 30, 0.5)', () => {}, { format: 'rgba' });
        const rgbContainer = chrome.options.fields.color('rgb(10, 20, 30)', () => {}, { format: 'rgb' });
        const hslContainer = chrome.options.fields.color('hsl(120, 50%, 50%)', () => {}, { format: 'hsl' });
        const hslaContainer = chrome.options.fields.color('hsla(120, 50%, 50%, 0.8)', () => {}, { format: 'hsla' });
        const emptyColorContainer = chrome.options.fields.color('', () => {}, {});
        const nullAlphaColorContainer = chrome.options.fields.color(null, () => {}, { format: 'rgba' });

        document.body.appendChild(rgbaContainer);
        document.body.appendChild(rgbContainer);
        document.body.appendChild(hslContainer);
        document.body.appendChild(hslaContainer);
        document.body.appendChild(emptyColorContainer);
        document.body.appendChild(nullAlphaColorContainer);

        // Trigger input on text field with rgba and hsla values
        const rgbaInput = rgbaContainer.querySelector('input[type="text"]');
        rgbaInput.value = 'rgba(100, 150, 200, 0.7)';
        rgbaInput.dispatchEvent(new Event('input', { bubbles: true }));

        const hslaInput = hslaContainer.querySelector('input[type="text"]');
        hslaInput.value = 'hsla(180, 80%, 40%, 0.6)';
        hslaInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Trigger change on alpha range input
        const alphaInput = rgbaContainer.querySelector('input[type="range"]');
        if (alphaInput) {
          alphaInput.value = '0.9';
          alphaInput.dispatchEvent(new Event('input', { bubbles: true }));
          alphaInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        await new Promise((resolve) => setTimeout(resolve, 600));

        if (window.CP && window.CP.__instance__) {
          for (const p of Object.values(window.CP.__instance__)) {
            if (p.fire) p.fire('change', [p.set()]);
          }
        }

        let threwUnsupported = false;
        try {
          chrome.options.fields.color('#fff', () => {}, { format: 'cmyk' });
        } catch (e) {
          threwUnsupported = e instanceof TypeError;
        }

        return {
          hasContainers: !!rgbaContainer && !!rgbContainer && !!hslContainer && !!hslaContainer,
          threwUnsupported
        };
      });

      assert.strictEqual(result.hasContainers, true);
      assert.strictEqual(result.threwUnsupported, true);
    });

    it('handles predefined sounds with and without allowNoSound', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        let savedSound;
        const noSoundContainer = chrome.options.fields.predefined_sound('', (val) => {
          savedSound = val;
        }, { allowNoSound: true });
        document.body.appendChild(noSoundContainer);

        const playBtn = noSoundContainer.querySelector('.play');
        const initiallyDisabled = playBtn.classList.contains('disabled');
        // Click while disabled
        playBtn.click();

        // Change select to Basso
        const select = noSoundContainer.querySelector('select');
        select.value = 'Basso';
        select.dispatchEvent(new Event('change'));

        // Click play button with active sound
        playBtn.click();

        // Without allowNoSound option
        const standardContainer = chrome.options.fields.predefined_sound(null, () => {}, {});
        document.body.appendChild(standardContainer);

        return {
          initiallyDisabled,
          savedSound,
          hasStandardSelect: standardContainer.querySelector('select').value === 'Basso'
        };
      });

      assert.strictEqual(result.initiallyDisabled, true);
      assert.strictEqual(result.savedSound, 'Basso');
      assert.strictEqual(result.hasStandardSelect, true);
    });

    it('handles custom sound fields with enter keypress and play button clicks', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        let savedVal;
        const soundContainer = chrome.options.fields.custom_sound('/sounds/Basso.wav', (val) => {
          savedVal = val;
        });
        document.body.appendChild(soundContainer);

        const input = soundContainer.querySelector('input');
        input.value = 'http://localhost/sounds/Hero.wav';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Press Enter key to trigger play
        const enterEvent = new KeyboardEvent('keypress', { keyCode: 13, which: 13, bubbles: true });
        input.dispatchEvent(enterEvent);

        // Click play button
        const playBtn = soundContainer.querySelector('.play');
        playBtn.click();

        await new Promise((resolve) => setTimeout(resolve, 600));

        return {
          hasPlayBtn: !!playBtn,
          hasInput: !!input,
          savedVal
        };
      });

      assert.strictEqual(result.hasPlayBtn, true);
      assert.strictEqual(result.hasInput, true);
      assert.strictEqual(result.savedVal, 'http://localhost/sounds/Hero.wav');
    });

    it('handles file inputs and persists selected file references', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        let savedFiles;
        const fileInput = chrome.options.fields.file(null, (files) => {
          savedFiles = files;
        });
        document.body.appendChild(fileInput);

        const mockFileList = [{ name: 'options-demo.png' }];
        const changeEvent = new Event('change', { bubbles: true });
        Object.defineProperty(changeEvent, 'target', {
          value: { files: mockFileList },
          writable: false
        });
        fileInput.dispatchEvent(changeEvent);

        return {
          hasFileAttribute: fileInput.getAttribute('type') === 'file',
          savedFilesCount: savedFiles ? savedFiles.length : 0
        };
      });

      assert.strictEqual(result.hasFileAttribute, true);
      assert.strictEqual(result.savedFilesCount, 1);
    });
  });

  describe('option containers and layouts', () => {
    it('supports hidden, disabled, and preview option attributes', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        const optHidden = chrome.options.addOption('hidden_opt', true, () => {}, {
          name: 'hidden_opt',
          type: 'checkbox',
          hidden: true
        });
        const optDisabled = chrome.options.addOption('disabled_opt', 'val', () => {}, {
          name: 'disabled_opt',
          type: 'text',
          disabled: true
        });
        const optPreview = chrome.options.addOption('preview_opt', true, () => {}, {
          name: 'preview_opt',
          type: 'checkbox',
          preview: 'png'
        });

        document.body.append(optHidden, optDisabled, optPreview);

        return {
          isHidden: optHidden.classList.contains('hidden'),
          isDisabled: optDisabled.classList.contains('disabled') && optDisabled.querySelector('input').disabled,
          hasPreview: !!optPreview.querySelector('.preview-container') && !!optPreview.querySelector('img.preview-image')
        };
      });

      assert.strictEqual(result.isHidden, true);
      assert.strictEqual(result.isDisabled, true);
      assert.strictEqual(result.hasPreview, true);
    });

    it('toggles nested options when parent checkbox or expand triangle is clicked', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        let savedParent;
        const parentOpt = chrome.options.addOption('parent_feature', { enabled: true, sub_opt: 'text' }, (v) => {
          savedParent = v;
        }, {
          name: 'parent_feature',
          type: 'checkbox',
          options: [
            { name: 'sub_opt', type: 'text' }
          ]
        });
        document.body.appendChild(parentOpt);

        const triangle = parentOpt.querySelector('.triangle');
        const parentCheckbox = parentOpt.querySelector('input[type="checkbox"]');

        // Click triangle to toggle collapse and expand
        triangle.click();
        const collapsedText = triangle.textContent;
        triangle.click();
        const expandedText = triangle.textContent;

        // Click parent checkbox to toggle
        parentCheckbox.checked = false;
        parentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        const uncheckSaved = savedParent && savedParent.enabled === false;

        parentCheckbox.checked = true;
        parentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        const recheckSaved = savedParent && savedParent.enabled === true;

        return {
          collapsedText,
          expandedText,
          uncheckSaved,
          recheckSaved
        };
      });

      assert.strictEqual(result.collapsedText, '▶');
      assert.strictEqual(result.expandedText, '▼');
      assert.strictEqual(result.uncheckSaved, true);
      assert.strictEqual(result.recheckSaved, true);
    });

    it('supports combined checkbox-and-field options with default values', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        let savedCombo;
        const comboOpt = chrome.options.addOption('combo_setting', null, (v) => {
          savedCombo = v;
        }, {
          name: 'combo_setting',
          type: 'checkbox-text',
          defaultEnabled: true,
          defaultValue: 'initial-val',
          desc: 'Combined description'
        });
        document.body.appendChild(comboOpt);

        const chk = comboOpt.querySelector('input[type="checkbox"]');
        const txt = comboOpt.querySelector('input[type="text"]');

        chk.checked = false;
        chk.dispatchEvent(new Event('change', { bubbles: true }));

        txt.value = 'updated-val';
        txt.dispatchEvent(new Event('input', { bubbles: true }));
        txt.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 600));

        return {
          hasLabel: !!comboOpt.querySelector('label'),
          enabledUpdated: savedCombo && savedCombo.enabled === false,
          valueUpdated: savedCombo && savedCombo.value === 'updated-val'
        };
      });

      assert.strictEqual(result.hasLabel, true);
      assert.strictEqual(result.enabledUpdated, true);
      assert.strictEqual(result.valueUpdated, true);
    });

    it('supports object, column, row, h3, and html option layouts', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        const colOpt = chrome.options.addOption('col_layout', { c1: 'a', c2: 'b' }, () => {}, {
          type: 'column',
          options: [
            { name: 'c1', type: 'text' },
            { name: 'c2', type: 'text' }
          ]
        });
        const rowOpt = chrome.options.addOption('row_layout', { r1: 'x' }, () => {}, {
          type: 'row',
          options: [
            { name: 'r1', type: 'text' }
          ]
        });
        let objSaved = false;
        const objOpt = chrome.options.addOption('obj_layout', { o1: 'y' }, () => { objSaved = true; }, {
          type: 'object',
          desc: 'Object Section',
          options: [
            { name: 'o1', type: 'text' }
          ]
        });
        const objInput = objOpt.querySelector('input');
        objInput.value = 'updated_obj';
        objInput.dispatchEvent(new Event('input', { bubbles: true }));
        objInput.dispatchEvent(new Event('change', { bubbles: true }));
        const h3Opt = chrome.options.addOption('h3_layout', null, () => {}, {
          type: 'h3',
          desc: 'Header Section'
        });
        const htmlOpt = chrome.options.addOption('html_layout', null, () => {}, {
          type: 'html',
          html: '<strong>Custom content</strong>'
        });

        document.body.append(colOpt, rowOpt, objOpt, h3Opt, htmlOpt);

        return {
          isColumn: colOpt.classList.contains('column'),
          isRow: rowOpt.classList.contains('row'),
          isObject: objOpt.classList.contains('object'),
          isH3: h3Opt.tagName === 'H3' && h3Opt.textContent === 'Header Section',
          isHtml: htmlOpt.querySelector('strong') != null
        };
      });

      assert.strictEqual(result.isColumn, true);
      assert.strictEqual(result.isRow, true);
      assert.strictEqual(result.isObject, true);
      assert.strictEqual(result.isH3, true);
      assert.strictEqual(result.isHtml, true);
    });

    it('manages single-field lists and multi-column lists with row addition, deletion, and filtering', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        let savedSingleList;
        const singleList = chrome.options.addOption('tag_list', ['tag-a'], (v) => {
          savedSingleList = v;
        }, {
          name: 'tag_list',
          type: 'text-list'
        });
        document.body.appendChild(singleList);

        // Edit last row in single list to add a new row
        const lastInput = singleList.querySelector('tbody tr:last-child input');
        lastInput.value = 'tag-b';
        lastInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Multi-column list with collapsible header, column binding, and unique select
        let savedMultiList;
        const multiList = chrome.options.base.list([
          { action: 'notify', details: 'email', priority: 'high' }
        ], (v) => {
          savedMultiList = v;
        }, {
          desc: 'Rule Table',
          collapsible: true,
          head: true,
          sortable: true,
          first: [
            { name: 'action', type: 'select', options: [{ value: 'notify', desc: 'Notify' }] },
            { name: 'details', type: 'text' }
          ],
          fields: [
            {
              name: 'action',
              type: 'select',
              options: [
                { value: 'notify', desc: 'Notify', unique: true },
                { value: 'log', desc: 'Log', unique: true }
              ]
            },
            { name: 'details', type: 'text', bindTo: { field: 'action', value: 'notify' }, required: true },
            { name: 'priority', type: 'select', options: ['low', 'high'] }
          ],
          filter: (row) => row.action !== 'skip'
        }, 'rule_list');
        document.body.appendChild(multiList);

        // Click collapsible triangle in multi list
        const triangle = multiList.querySelector('label .triangle');
        if (triangle) {
          triangle.click();
          triangle.click();
        }

        // Test delete button on second row
        const delBtn = multiList.querySelector('tbody tr:last-child .delete');
        if (delBtn) {
          delBtn.click();
        }

        await new Promise((resolve) => setTimeout(resolve, 350));

        return {
          hasSingleTable: !!singleList.querySelector('table'),
          hasMultiTable: !!multiList.querySelector('table')
        };
      });

      assert.strictEqual(result.hasSingleTable, true);
      assert.strictEqual(result.hasMultiTable, true);
    });

    it('validates field input and rejects invalid submissions', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        let savedVal;
        chrome.options.fields.test_validate = (val, cb) => {
          return chrome.options.h('input', {
            oninput: (e) => cb(e.target.value, e)
          });
        };
        const field = chrome.options.addField('valid', (val) => {
          savedVal = val;
        }, {
          type: 'test_validate',
          validate: (val) => val.length >= 4,
          desc: 'Validating field'
        });
        document.body.appendChild(field);

        field.value = 'abc';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        const hasInvalidClass = field.classList.contains('invalid');

        field.value = 'abcdef';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        const removedInvalidClass = !field.classList.contains('invalid');

        // Test event timestamp ordering (older timestamp returns early)
        let callCount = 0;
        chrome.options.fields.test_time = (val, cb) => {
          const el = document.createElement('div');
          el.triggerEvents = () => {
            cb('first', { timeStamp: 200 });
            cb('second', { timeStamp: 100 }); // earlier timestamp is ignored
          };
          return el;
        };
        const timeField = chrome.options.addField('initial', () => { callCount++; }, { type: 'test_time' });
        timeField.triggerEvents();
        const olderIgnored = callCount === 1;

        return {
          hasInvalidClass,
          removedInvalidClass,
          olderIgnored
        };
      });

      assert.strictEqual(result.hasInvalidClass, true);
      assert.strictEqual(result.removedInvalidClass, true);
      assert.strictEqual(result.olderIgnored, true);
    });

    it('throws descriptive errors for unrecognized option types', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        let threwMain = false;
        try {
          chrome.options.addOption('bad', null, () => {}, { type: 'nonexistent_option_type' });
        } catch (e) {
          threwMain = e.message.includes('Could not find option type');
        }

        let threwCheckbox = false;
        try {
          chrome.options.base.checkboxNField({}, () => {}, {}, 'nonexistent_subfield');
        } catch (e) {
          threwCheckbox = e.message.includes('Could not find option type');
        }

        return { threwMain, threwCheckbox };
      });

      assert.strictEqual(result.threwMain, true);
      assert.strictEqual(result.threwCheckbox, true);
    });
  });

  describe('extension options persistence, navigation, and display configuration', () => {
    it('manages manual saving, enabling the save button on changes and disabling on revert', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        chrome.options.opts.autoSave = false;
        let savedPayload;
        window.chrome.storage.sync.set = (obj) => { savedPayload = obj; };

        // Add a tab with autoSave false
        chrome.options.addTab('Manual', [
          { name: 'manual_chk', type: 'checkbox', default: true }
        ]);

        await new Promise((resolve) => setTimeout(resolve, 150));

        const saveBtn = document.querySelector('.save-container button');
        const initialDisabled = saveBtn.hasAttribute('disabled');

        // Toggle checkbox to dirty value
        const chk = document.querySelector('[data-name="manual_chk"] input');
        chk.checked = false;
        chk.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 150));
        const enabledAfterChange = !saveBtn.hasAttribute('disabled');

        // Revert checkbox back to original value
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 150));
        const disabledAfterRevert = saveBtn.hasAttribute('disabled');

        // Change again and click Save
        chk.checked = false;
        chk.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 150));
        saveBtn.click();

        return {
          initialDisabled,
          enabledAfterChange,
          disabledAfterRevert,
          hasSaveBtn: !!saveBtn
        };
      });

      assert.strictEqual(result.initialDisabled, true);
      assert.strictEqual(result.enabledAfterChange, true);
      assert.strictEqual(result.disabledAfterRevert, true);
      assert.strictEqual(result.hasSaveBtn, true);
    });

    it('switches active tabs and displays about content when menu items are clicked', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        const aboutLink = document.querySelector('.menu.about a');
        aboutLink.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const aboutActive = document.querySelector('#about').classList.contains('selected');

        const generalLink = document.querySelector('#main-menu a');
        if (generalLink) {
          generalLink.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        return { aboutActive };
      });

      assert.strictEqual(result.aboutActive, true);
    });

    it('flashes the saved indicator when partially reverting changes under manual save', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        chrome.options.opts.autoSave = false;
        chrome.options.addTab('MultiManual', [
          { name: 'm_opt1', type: 'checkbox', default: true },
          { name: 'm_opt2', type: 'checkbox', default: true }
        ]);

        await new Promise((resolve) => setTimeout(resolve, 150));

        const chk1 = document.querySelector('[data-name="m_opt1"] input');
        const chk2 = document.querySelector('[data-name="m_opt2"] input');

        // Dirty both
        chk1.checked = false;
        chk1.dispatchEvent(new Event('change', { bubbles: true }));

        chk2.checked = false;
        chk2.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 150));

        // Revert only chk1 (leaves chk2 dirty, triggering flashSavedAlert branch)
        chk1.checked = true;
        chk1.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 150));

        const saveBtn = document.querySelector('.save-container button');
        const remainsEnabled = !saveBtn.hasAttribute('disabled');

        return { remainsEnabled };
      });

      assert.strictEqual(result.remainsEnabled, true);
    });

    it('falls back gracefully when manifest metadata or title/about options are omitted', async () => {
      await page.goto(`${serverUrl}/fallback.html`, { waitUntil: 'networkidle0' });

      const result = await page.evaluate(() => {
        const titleText = document.querySelector('title').textContent;
        const hasShowTitle = document.body.classList.contains('show-title');
        const aboutText = document.querySelector('#about .content > p').textContent;
        const openInTab = document.body.classList.contains('open-in-tab');

        return {
          titleMatches: titleText === 'chrome options',
          titleHidden: !hasShowTitle,
          aboutMatches: aboutText === 'Manifest fallback description',
          notOpenInTab: !openInTab
        };
      });

      assert.strictEqual(result.titleMatches, true);
      assert.strictEqual(result.titleHidden, true);
      assert.strictEqual(result.aboutMatches, true);
      assert.strictEqual(result.notOpenInTab, true);
    });

    it('applies URL query parameters to toggle navigation elements and filters options by URL hash', async () => {
      await page.goto(
        `${serverUrl}/params.html?hideTitle&hideAbout&hideSidebar&hideTabTitle&hideTabDesc#filtered.target_opt`,
        { waitUntil: 'networkidle0' }
      );

      const result = await page.evaluate(() => {
        const bodyClass = document.body.className;
        const targetOpt = document.querySelector('[data-name="target_opt"]');
        const otherOpt = document.querySelector('[data-name="other_opt"]');
        const rowOpt = document.querySelector('[data-name="row_opt"]');

        return {
          hidesTitle: !bodyClass.includes('show-title'),
          hidesAbout: !bodyClass.includes('show-about'),
          hidesSidebar: !bodyClass.includes('show-sidebar'),
          hidesTabTitle: !bodyClass.includes('show-tab-title'),
          hidesTabDesc: !bodyClass.includes('show-tab-desc'),
          targetRendered: !!targetOpt,
          otherFilteredOut: !otherOpt
        };
      });

      assert.strictEqual(result.hidesTitle, true);
      assert.strictEqual(result.hidesAbout, true);
      assert.strictEqual(result.hidesSidebar, true);
      assert.strictEqual(result.hidesTabTitle, true);
      assert.strictEqual(result.hidesTabDesc, true);
      assert.strictEqual(result.targetRendered, true);
      assert.strictEqual(result.otherFilteredOut, true);
    });

    it('configures initial manual save mode when autoSave is disabled at setup', async () => {
      await page.goto(`${serverUrl}/manual.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        const autoSpan = document.querySelector('.save-container .auto');
        const saveContainer = document.querySelector('.save-container');
        return {
          autoHidden: autoSpan.style.display === 'none',
          containerShown: saveContainer.classList.contains('show')
        };
      });
      assert.strictEqual(result.autoHidden, true);
      assert.strictEqual(result.containerShown, true);
    });

    it('filters options by hash on single-page layouts where tabKey is empty', async () => {
      await page.goto(`${serverUrl}/single.html#simple_toggle`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        const toggle = document.querySelector('[data-name="simple_toggle"]');
        return { hasToggle: !!toggle };
      });
      assert.strictEqual(result.hasToggle, true);
    });
  });

  describe('advanced list table behavior and dragula integration', () => {
    it('manages column binding, row creation for empty lists, row filtering, and dragula events', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        // 1. Initial empty list with first option
        const emptyList = chrome.options.base.list([], () => {}, {
          first: [{ name: 'f1', type: 'text' }],
          fields: [{ name: 'f1', type: 'text' }]
        });
        document.body.appendChild(emptyList);
        const hasInitialFirstRow = emptyList.querySelectorAll('tbody tr').length > 0;

        // 2. Bound columns with consecutive bindTo fields sharing the column header
        // Start with mode: 'c' so initially shown is false and checkColumns(true) hides $head with display = 'none'
        let boundSaved;
        const boundTable = chrome.options.base.list([
          { mode: 'c', choice: 'r1', optA: 'valA', optB: '' },
          { mode: 'c', choice: 'r2', optA: '', optB: '' }
        ], (v) => { boundSaved = v; }, {
          head: true,
          sortable: true,
          fields: [
            { name: 'mode', type: 'select', options: ['c', 'a', 'b'] },
            { name: 'choice', type: 'radio', options: ['r1', 'r2'] },
            { name: 'optA', type: 'text', desc: 'Combined Header', bindTo: { field: 'mode', value: ['a', 'b'] } },
            { name: 'optB', type: 'text', desc: 'Combined Header', bindTo: { field: 'mode', value: ['a', 'b'] } },
            { name: 'reqField', type: 'text', required: true }
          ],
          filter: (r) => r.mode !== 'none'
        });
        document.body.appendChild(boundTable);

        // Wait for checkColumns(true) to run on next frame
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Toggle select mode to 'a' to show columns (dom.slideXShow on $head)
        const selectMode = boundTable.querySelector('tbody tr select');
        selectMode.value = 'a';
        selectMode.dispatchEvent(new Event('change'));
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Toggle select mode back to 'c' to hide columns (dom.slideXHide on $head)
        selectMode.value = 'c';
        selectMode.dispatchEvent(new Event('change'));
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Toggle back to 'a' so optA is shown again
        selectMode.value = 'a';
        selectMode.dispatchEvent(new Event('change'));
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Call checkColumns(true) while column header is hidden but row is shown to exercise delay of 0 on init
        if (boundTable.heads && boundTable.heads.optA && boundTable.checkColumns) {
          boundTable.heads.optA.style.display = 'none';
          boundTable.checkColumns(true);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Edit the last row to trigger addNewRow(true) with animation
        const lastInput = boundTable.querySelector('tbody tr:last-child input[type="text"]');
        if (lastInput) {
          lastInput.value = 'new row';
          lastInput.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 600));
        }

        // Delete an existing row from the initial list (triggers lines 339-341)
        const firstDelete = boundTable.querySelector('tbody tr:first-child .delete');
        if (firstDelete) {
          firstDelete.click();
        }

        // 3. Test dragula integration methods on sortable table
        const drake = boundTable.drake;
        let drakeTested = false;
        let mirrorRadioRenamed = false;
        let acceptsFilterPassed = false;
        if (drake) {
          const tbody = boundTable.querySelector('tbody');
          const trs = tbody.querySelectorAll('tr');
          const mockHandle = trs[0].querySelector('.sort');

          const movesResult = drake.canMove(mockHandle);

          // Test accepts
          const siblingWithMirror = document.createElement('tr');
          siblingWithMirror.className = 'gu-mirror';
          const rejectsGuMirror = drake.accepts(trs[0], tbody, tbody, siblingWithMirror) === false;
          const acceptsNormal = drake.accepts(trs[0], tbody, tbody, trs[1]) === true;
          acceptsFilterPassed = rejectsGuMirror && acceptsNormal;

          // Emit cloned with matching clone mirror containing checked radio
          const mirror = trs[0].cloneNode(true);
          drake.emit('cloned', mirror, trs[0]);

          const mirrorRadio = mirror.querySelector('input[type="radio"]');
          if (mirrorRadio && mirrorRadio.getAttribute('name').endsWith('_')) {
            mirrorRadioRenamed = true;
          }

          // Emit dragend
          drake.emit('dragend');
          drakeTested = movesResult === true;
        }

        // 4. Test saveDefaults on checkbox with sub-options
        let defaultSavedVal;
        chrome.options.opts.saveDefaults = true;
        chrome.options.addOption('def_test', undefined, (v) => {
          defaultSavedVal = v;
        }, {
          name: 'def_test',
          type: 'checkbox',
          default: true,
          options: [{ name: 'sub_def', type: 'text' }]
        });

        await new Promise((resolve) => setTimeout(resolve, 350));

        return {
          hasInitialFirstRow,
          drakeTested,
          acceptsFilterPassed,
          mirrorRadioRenamed,
          defaultSavedEnabled: defaultSavedVal && defaultSavedVal.enabled === true
        };
      });

      assert.strictEqual(result.hasInitialFirstRow, true);
      assert.strictEqual(result.drakeTested, true);
      assert.strictEqual(result.acceptsFilterPassed, true);
      assert.strictEqual(result.mirrorRadioRenamed, true);
      assert.strictEqual(result.defaultSavedEnabled, true);
    });

    it('supports nested layout columns, rows, suboptions, and single-field saves in list rows', async () => {
      await page.goto(`${serverUrl}/tabs.html`, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(async () => {
        // Single field list save (line 447: values = newValue)
        let savedSingle;
        const single = chrome.options.base.singleFieldList(['initial_val'], (v) => {
          savedSingle = v;
        }, {
          fields: [{ type: 'text' }]
        }, 'text');
        document.body.appendChild(single);

        const singleInput = single.querySelector('tbody tr input');
        singleInput.value = 'updated_single';
        singleInput.dispatchEvent(new Event('change', { bubbles: true }));

        // List row with type column and row (lines 518-521)
        let layoutSaved;
        const layoutList = chrome.options.base.list([
          { col_val: 'c1', row_val: 'r1' }
        ], (v) => { layoutSaved = v; }, {
          fields: [
            {
              type: 'column',
              options: [{ name: 'col_val', type: 'text' }]
            },
            {
              type: 'row',
              options: [{ name: 'row_val', type: 'text' }]
            }
          ]
        });
        document.body.appendChild(layoutList);

        // Unknown type in list row (line 523)
        let threwInvalidListField = false;
        try {
          chrome.options.base.list([], () => {}, {
            fields: [{ type: 'invalid_field_xyz' }]
          });
        } catch (e) {
          threwInvalidListField = e.message.includes('Could not find option type: invalid_field_xyz');
        }

        // Option without type defaulting to checkbox (line 58)
        let noTypeSaved;
        const noTypeContainer = chrome.options.addOption('no_type_field', false, (v) => {
          noTypeSaved = v;
        }, { name: 'no_type_field' });
        document.body.appendChild(noTypeContainer);

        // Suboption change propagating to parent save callback (lines 213-214)
        let subSaved;
        const objOption = chrome.options.addOption('nested_parent', { sub_item: 'a' }, (v) => {
          subSaved = v;
        }, {
          name: 'nested_parent',
          type: 'object',
          options: [{ name: 'sub_item', type: 'text' }]
        });
        document.body.appendChild(objOption);

        const subInput = objOption.querySelector('.suboptions input');
        subInput.value = 'b';
        subInput.dispatchEvent(new Event('change', { bubbles: true }));

        // List with unique select options and animated bound column reveal (lines 487-493, 544-546)
        let animSaved;
        const animTable = chrome.options.base.list([
          { mode: 'x', bound_col: 'val 1' }
        ], (v) => { animSaved = v; }, {
          fields: [
            {
              name: 'mode',
              type: 'select',
              options: [
                { value: 'x', desc: 'X', unique: true },
                { value: 'y', desc: 'Y', unique: true }
              ]
            },
            {
              name: 'bound_col',
              type: 'text',
              bindTo: { field: 'mode', value: 'x' }
            }
          ]
        });
        document.body.appendChild(animTable);

        // Edit the last row to trigger addNewRow(true) with animation
        const lastAnimInput = animTable.querySelector('tbody tr:last-child input[type="text"]');
        if (lastAnimInput) {
          lastAnimInput.value = 'trigger new animated row';
          lastAnimInput.dispatchEvent(new Event('input', { bubbles: true }));
          lastAnimInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        await new Promise((resolve) => setTimeout(resolve, 650));

        // Singleline option styling (line 223)
        const singlelineOpt = chrome.options.addLabelNField('val', () => {}, { singleline: true, desc: 'Single Line' });
        document.body.appendChild(singlelineOpt);

        // Falsy key attribute check (line 74)
        const falsyKeyOpt = chrome.options.addOption('', 'val', () => {}, { name: 'falsy_key' });
        document.body.appendChild(falsyKeyOpt);

        // Suboption without name in object (line 200)
        const noNameSubOpt = chrome.options.addOption('obj_noname', {}, () => {}, {
          name: 'obj_noname',
          type: 'object',
          options: [{ type: 'h3', desc: 'Heading Without Name' }]
        });
        document.body.appendChild(noNameSubOpt);

        // Single field list with row undefined taking field default (line 514)
        const defaultSingleList = chrome.options.base.list([undefined], () => {}, {
          fields: [{ type: 'text', default: 'fallback_def' }]
        });
        document.body.appendChild(defaultSingleList);

        // addField with unsupported type returning undefined (line 607)
        const missingField = chrome.options.addField('val', () => {}, { type: 'unsupported_type' });

        return {
          savedSingle,
          hasLayoutList: !!layoutList.querySelector('tbody tr'),
          threwInvalidListField,
          isCheckboxInput: !!noTypeContainer.querySelector('input[type="checkbox"]'),
          subSavedMatches: subSaved && subSaved.sub_item === 'b',
          isSingleline: singlelineOpt.classList.contains('singleline'),
          falsyKeyMatches: falsyKeyOpt.getAttribute('data-key') === 'falsy_key',
          hasMissingField: missingField === undefined,
          defaultSingleVal: defaultSingleList.querySelector('input').value === 'fallback_def'
        };
      });

      assert.strictEqual(result.savedSingle[0], 'updated_single');
      assert.strictEqual(result.hasLayoutList, true);
      assert.strictEqual(result.threwInvalidListField, true);
      assert.strictEqual(result.isCheckboxInput, true);
      assert.strictEqual(result.subSavedMatches, true);
      assert.strictEqual(result.isSingleline, true);
      assert.strictEqual(result.falsyKeyMatches, true);
      assert.strictEqual(result.hasMissingField, true);
      assert.strictEqual(result.defaultSingleVal, true);
    });
  });
});
