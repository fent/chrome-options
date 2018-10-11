/* global chrome */

import './base.js';
import './fields.js';
import h from './hyperscript.js';
import * as dom from './dom.js';
import * as util from './util.js';


// Expose this library.
chrome.options.opts = {
  // If not given, title of the page will be set to the extension's name.
  // Set to `false` if you want to hide the title.
  title: null,

  // Set this if you want to customize the about tab's contents,
  // otherwise it will be set to the extension's description.
  // Set to `false` if you don't want an About page.
  about: null,

  // True if you want settings to be saved as they are changed.
  autoSave: true,

  // True if you want default values to be saved when user visits
  // the options page. Useful if you want to only specify default values
  // in one place, without having to check if an option is set.
  // Note that it requires the options page to be visited once.
  saveDefaults: true,
};


const $menu = document.querySelector('#main-menu');
const $mainview = document.querySelector('.mainview');
let lastHash = null;
let hashPath = window.location.hash.split('.');

const menuClick = () => {
  const newHash = window.location.hash;
  if (!newHash) {
    document.querySelector('.mainview > *:nth-child(2)')
      .classList.add('selected');
    document.querySelector('#main-menu li:first-child')
      .classList.add('selected');
    return;
  }
  if (newHash === lastHash) { return; }
  lastHash = newHash;

  document.querySelectorAll('.mainview > *, .menu li').forEach((el) => {
    el.classList.remove('selected');
  });

  hashPath = newHash.split('.');

  const $currentView = document.querySelector(hashPath[0]);
  if ($currentView) {
    document.querySelector('.menu a[href="' + hashPath[0] + '"]')
      .parentNode.classList.add('selected');
    $currentView.classList.add('selected');
    document.body.scrollTop = 0;
  }
};

setTimeout(menuClick, 100);
window.addEventListener('hashchange', menuClick);

const urlParams = {};
window.location.search.substring(1).split('&').forEach((param) => {
  urlParams[param] = true;
});

const changedValues = {};
const $saveContainer = document.querySelector('.save-container');
const $saveButton = $saveContainer.querySelector('button');
$saveButton.addEventListener('click', () => {
  chrome.storage.sync.set(changedValues);
  $saveButton.setAttribute('disabled', true);
});
const showSavedAlert = dom.flashClass($saveContainer, 'show', 2000);
const flashSavedAlert = dom.flashClass($saveContainer, 'flash', 150);

// Add the extension's title to the top of the page.
let setupRan = false;
const setup = () => {
  if (setupRan) { return; }
  const manifest = chrome.runtime.getManifest();

  const extensionName =
    chrome.options.opts.title || manifest.name || 'chrome';
  document.querySelector('title').textContent =
    extensionName + ' options';
  const $title = document.querySelector('.chrome-options-title');
  $title.textContent = extensionName;
  if (chrome.options.opts.title !== false && !urlParams.hideTitle) {
    document.body.classList.add('show-title');
  }

  if (chrome.options.opts.about !== false &&
     (chrome.options.opts.about || manifest.description) &&
      !urlParams.hideAbout) {
    document.body.classList.add('show-about');
    let $about = document.querySelector('#about .content > p');
    if (chrome.options.opts.about) {
      $about.innerHTML = chrome.options.opts.about;
    } else {
      $about.textContent = manifest.description;
    }
  }

  if (!manifest.options_ui || manifest.options_ui.open_in_tab) {
    document.body.classList.add('open-in-tab');
  }

  if (!urlParams.hideSidebar) {
    document.body.classList.add('show-sidebar');
  }

  if (!urlParams.hideTabTitle) {
    document.body.classList.add('show-tab-title');
  }

  if (!urlParams.hideTabDesc) {
    document.body.classList.add('show-tab-desc');
  }

  if (chrome.options.opts.autoSave) {
    $saveButton.style.display = 'none';
  } else {
    $saveContainer.querySelector('.auto').style.display = 'none';
    $saveContainer.classList.add('show');
  }

  setupRan = true;
};

const getKeyPath = (parentKey, option) => {
  return (parentKey || '') +
    (parentKey && option.name ? '.' : '') + (option.name || '');
};

/**
 * @param {string} name
 * @param {!string} desc Will be placed at the top of the page of the tab
 * @param {Array.<Object>} options
 */
chrome.options.addTab = (name, desc, options) => {
  setup();
  if (!options) {
    options = desc;
    desc = null;
  }
  const tabKey = name.toLowerCase().replace(' ', '_');
  const $menuButton = h('li', h('a', { href: `#${tabKey}` }, name));
  $menuButton.querySelector('a').addEventListener('click', menuClick);
  $menu.append($menuButton);
  const $tabview = h('div', { id: tabKey }, h('header', h('h1', name)));
  const $tabcontent = h('div.content');
  if (desc) {
    $tabcontent.append(h('p.tab-desc', desc));
  }

  // If hash contains a specific option to display,
  // only display that one option.
  if (hashPath.length && hashPath[0].length) {
    const tabHashPath = tabKey.length ? hashPath.slice(1) : hashPath.slice();
    const filterOptions = (options = [], depth) => {
      if (tabHashPath.length <= depth) { return options; }
      return options.filter(option => {
        // Layout field types, such as `column` and `row, have no name.
        return !option.name || option.name === tabHashPath[depth];
      }).map((option, depth) => {
        option = Object.assign({}, option);
        if (option.name) { depth++; }
        option.options = filterOptions(option.options, depth);
        return option;
      });
    };
    options = filterOptions(options, 0);
  }

  const keys = [];
  const getOptionKeys = (options) => {
    options.forEach((option) => {
      if (option.name) {
        keys.push(getKeyPath(tabKey, option));
      } else if (option.type === 'column' || option.type === 'row') {
        getOptionKeys(option.options);
      }
    });
  };
  getOptionKeys(options);

  chrome.storage.sync.get(keys, (items) => {
    $tabcontent.append(addTabOptions(tabKey, items, options));
  });
  $tabview.append($tabcontent);
  $mainview.append($tabview);
};


/**
 * @param {!string} desc
 * @param {Array.<Object>} options
 */
chrome.options.set = (desc, options) => {
  urlParams.hideSidebar = true;
  urlParams.hideTabTitle = true;
  chrome.options.addTab('', desc, options);
};

const addTabOptions = (tabKey, values, options) => {
  return h('', options.map((option) => {
    const key = getKeyPath(tabKey, option);
    const isLayout = option.type === 'column' || option.type === 'row';
    let value = isLayout ? values : values[key];
    let latestValue = value;

    // Clone value so that it can be compared to new value.
    const cloneValue = () => { value = util.deepClone(latestValue); };
    $saveButton.addEventListener('click', cloneValue);

    // Use requestAnimationFrame whenever possible,
    // so that it doensn't seep into load time.
    requestAnimationFrame(cloneValue);

    const save = (newValue) => {
      requestAnimationFrame(() => {
        latestValue = newValue;
        const isEqual = util.deepEqual(value, newValue);
        const valueToSave = isLayout ? newValue : { [key]: newValue };
        if (chrome.options.opts.autoSave) {
          if (!isEqual) {
            chrome.storage.sync.set(valueToSave);
            showSavedAlert();
            flashSavedAlert();
            cloneValue();
          }
        } else if (isEqual) {
          for (let optionKey in valueToSave) { delete changedValues[optionKey]; }
          if (!Object.keys(changedValues).length) {
            $saveButton.setAttribute('disabled', true);
          } else {
            flashSavedAlert();
          }
        } else {
          Object.assign(changedValues, valueToSave);
          $saveButton.removeAttribute('disabled');
          flashSavedAlert();
        }
      });
    };
    return chrome.options.addOption(key, value, save, option);
  }));
};
