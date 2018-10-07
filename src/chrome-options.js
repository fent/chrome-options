/* global chrome, CP */

require('c-p');
require('c-p/color-picker.css');

import dragula from 'dragula';
require('dragula/dist/dragula.css');

import h from './hyperscript.js';
import * as dom from './dom.js';
import * as util from './util.js';

(() => {
  // Expose this library.
  chrome.options = {};
  chrome.options.base = {};
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
  let hashOption = hashPath.length > 1;
  let hashPosition = 1;

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
    hashOption = hashPath.length > 1;

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
    const keyName = name.toLowerCase().replace(' ', '_');
    const $menuButton = h('li', h('a', { href: `#${keyName}` }, name));
    $menuButton.querySelector('a').addEventListener('click', menuClick);
    $menu.append($menuButton);
    const $tabview = h('div', { id: keyName }, h('header', h('h1', name)));
    const $tabcontent = h('div.content');
    if (desc) {
      $tabcontent.append(h('p.tab-desc', desc));
    }

    const keys = [];
    const getOptionKeys = (options) => {
      options.forEach((option) => {
        if (option.name) {
          keys.push(getKeyPath(keyName, option));
        } else if (option.type === 'column' || option.type === 'row') {
          getOptionKeys(option.options);
        }
      });
    };
    getOptionKeys(options);

    chrome.storage.sync.get(keys, (items) => {
      addTabOptions($tabcontent, keyName, items, options);
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

  const getKeyPath = (parentKey, option) => {
    return (parentKey || '') +
      (parentKey && option.name ? '.' : '') + (option.name || '');
  };

  const addTabOptions = ($parent, keyName, values, options) => {
    options.forEach((option) => {
      const key = getKeyPath(keyName, option);
      let value = values[key];
      let latestValue = value;

      // Clone value so that it can be compared to new value.
      const cloneValue = () => { value = util.deepClone(latestValue); };
      $saveButton.addEventListener('click', cloneValue);

      // Use requestAnimationFrame whenever possible,
      // so that it doensn't seep into load time.
      requestAnimationFrame(cloneValue);

      const save = (newValue) => {
        latestValue = newValue;

        requestAnimationFrame(() => {
          const isEqual = util.deepEqual(value, newValue);
          if (chrome.options.opts.autoSave) {
            if (!isEqual) {
              chrome.storage.sync.set({ [key]: newValue });
              showSavedAlert();
              flashSavedAlert();
              cloneValue();
            }
          } else if (isEqual) {
            delete changedValues[key];
            if (!Object.keys(changedValues).length) {
              $saveButton.setAttribute('disabled', true);
            } else {
              flashSavedAlert();
            }
          } else {
            changedValues[key] = newValue;
            $saveButton.removeAttribute('disabled');
            flashSavedAlert();
          }
        });
      };
      const $container = addOption(key, values, value, save, option, top);
      if ($container) { $parent.append($container); }
    });
  };

  const addH3 = (option) => !hashOption && h('h3', option.desc);
  const addHtml = (option) => !hashOption && h('', { innerHTML: option.html });

  const addOption = (key, values, value, save, option, top) => {
    if (hashOption) {
      if (hashPosition < hashPath.length &&
          option.name && option.name !== hashPath[hashPosition]) {
        return;
      }
      hashPosition++;
    }

    if (value === undefined && option.default != null) {
      value = option.default;
      if (chrome.options.opts.saveDefaults) {
        save(value);
      }
    }

    let $option, r;
    switch (option.type) {
      case 'checkbox':
        $option = chrome.options.base.checkbox(value, save, option, key);
        break;
      case 'object':
        $option = chrome.options.base.object(value, save, option, key);
        break;
      case 'list':
        $option = chrome.options.base.list(value, save, option, key);
        break;
      case 'column':
        $option = chrome.options.base.column(values, save, option, key, top);
        break;
      case 'row':
        $option = chrome.options.base.row(values, save, option, key, top);
        break;
      case 'h3':
        $option = addH3(option);
        break;
      case 'html':
        $option = addHtml(option);
        break;
      default:
        if (!option.type) {
          $option = chrome.options.base.checkbox(value, save, option, key);
        } else if (chrome.options.fields[option.type]) {
          $option = chrome.options.addLabelNField(value, save, option);
        } else if ((r = /(\w+)-list/.exec(option.type))) {
          $option = chrome.options.base
            .singleFieldList(value, save, option, r[1]);
        } else if ((r = /checkbox-(\w+)/.exec(option.type))) {
          $option = chrome.options.base
            .checkboxNField(value, save, option, r[1]);
        } else {
          throw Error('Could not find option type: ' + option.type);
        }
    }

    if (hashOption) { hashPosition--; }
    if (option.preview) {
      const $label = $option.querySelector('label');
      $label.append(h('span.preview-container', h('span.preview')),
        h('img.preview-image', { src: 'previews/' + key + '.' + option.preview }));
    }

    return $option;
  };

  chrome.options.base.checkbox = (value, save, option, key) => {
    const $label = h('label');
    const $container = h('.checkbox', $label);
    let $subContainer, $triangle;
    const options = option.options;
    const hasOptions = !!options;

    let checked = value;
    if (hasOptions) {
      if (value == null || typeof value !== 'object') {
        value = {};
      }
      checked = value.enabled;
    }

    const $checkbox = chrome.options.fields.checkbox(checked, (checked) => {
      if (hasOptions) {
        value.enabled = checked;
      } else {
        value = checked;
      }
      save(value);
    }, option);
    $label.append($checkbox);

    if (hasOptions) {
      $subContainer = addOptions(value, save, option, key);
      $container.append($subContainer);
      if (!checked) { $subContainer.style.display = 'none'; }

      const toggleContainer = (checked) => {
        if (checked) {
          $triangle.textContent = '▼';
          dom.slideYShow($subContainer);
        } else {
          $triangle.textContent = '▶';
          dom.slideYHide($subContainer);
        }
      };

      $triangle = $label.appendChild(h('span.triangle', checked ? '▼' : '▶'));
      $triangle.addEventListener('click', (e) => {
        e.preventDefault();
        checked = !checked;
        toggleContainer(checked);
      });

      $checkbox.addEventListener('change', () => {
        checked = $checkbox.checked;
        toggleContainer(checked);
      });
    }

    $label.append(h('span', option.desc));
    return $container;
  };

  chrome.options.base.checkboxNField = (value, save, option, type) => {
    if (value == null || typeof value !== 'object') {
      value = {};
    }
    let mustSave = false;
    if (value.enabled === undefined && option.defaultEnabled !== undefined) {
      value.enabled = option.defaultEnabled;
      mustSave = true;
    }
    if (value.value === undefined && option.defaultValue !== undefined) {
      value.value = option.defaultValue;
      mustSave = true;
    }
    if (mustSave && chrome.options.opts.saveDefaults) {
      save(value);
    }

    if (!chrome.options.fields[type]) {
      throw Error('Could not find option type: ' + type);
    }
    const $container = h('.suboption');
    const $box = $container.appendChild(h('span'));

    $box
      .append(chrome.options.fields.checkbox(value.enabled, (checked) => {
        value.enabled = checked;
        save(value);
      }, option));

    $container.append(chrome.options.addField(value.value, (newValue) => {
      value.value = newValue;
      save(value);
    }, option, type));

    if (option.desc) {
      $container.append(h('label', option.desc));
    }
    return $container;
  };

  chrome.options.base.object = (value, save, option, key) => {
    const $container = h('.object', h('label', option.desc));
    $container.append(addOptions(value, save, option, key));
    return $container;
  };

  const addOptions = (value, save, option, key) => {
    if (value == null || typeof value !== 'object') {
      value = {};
    }
    const $container = h('.suboptions');
    option.options.forEach((option) => {
      const optionKey = getKeyPath(key, option);
      const $option = addOption(optionKey, value, value[option.name],
        (newValue) => {
          if (option.name) { value[option.name] = newValue; }
          save(value);
        }, option);
      if ($option) { $container.append($option); }
    });
    return $container;
  };

  chrome.options.addLabelNField = (value, save, option) => {
    const $label = h('label');
    $label.innerHTML = option.desc || '';
    const $container = h('.suboption', $label);
    const $field = chrome.options.addField(value, save, option);
    $container.append(h('.field-container', $field));
    $container.classList.add(option.singleline ? 'singleline' : 'multiline');
    return $container;
  };

  chrome.options.base.list = (list, save, options, key) => {
    const $container = h('.suboption.list');
    let $wrapper, shown = true;

    if (options.desc) {
      const $label = $container.appendChild(h('label', options.desc));
      if (options.collapsible) {
        shown = false;
        const $triangle = h('span.triangle', {
          onclick: () => {
            shown = !shown;
            if (shown) {
              $triangle.textContent = '▼';
              dom.slideYShow($wrapper);
            } else {
              $triangle.textContent = '▶';
              dom.slideYHide($wrapper);
            }
          },
        }, '▶');
        $label.prepend($triangle);
      }
    }

    list = list || [];
    const $table = $container.appendChild(h('table'));
    if (options.desc && options.collapsible) {
      $wrapper = $container.appendChild(h('', { style: 'display: none' }, $table));
    }
    const $tbody = $table.appendChild(h('tbody'));
    let rows;
    let heads = {};

    if (options.head) {
      const $thead = h('tr');
      let prevfield;
      options.fields.forEach((field) => {
        if (!field.bindTo || !prevfield.bindTo) {
          const $container = heads[field.name] = h('div', field.desc);
          $thead.append(h('th', $container));
        } else {
          heads[field.name] = heads[prevfield.name];
        }
        prevfield = field;
      });
      $table.prepend(h('thead', $thead));
    }

    // Check if each column should be shown.
    const checkColumns = (init) => {
      options.fields.forEach((field) => {
        if (!field.bindTo) { return; }
        const show = rows.some(row => row.shown[field.name]);
        const $head = heads[field.name];
        const isVisible = !!$head.offsetParent;
        if (show && !isVisible) {
          setTimeout(dom.slideXShow.bind(null, $head), init ? 0 : 500);
        } else if (!show && isVisible) {
          if (init) {
            $head.style.display = 'none';
          } else {
            dom.slideXHide($head);
          }
        }
      });
    };

    const saveFields = () => {
      const newValues = rows.map(getValue => getValue());
      save(newValues.filter((rowValue) => {
        if (rowValue == null || rowValue === '') {
          return false;
        } else if (options.filter && !options.filter(rowValue)) {
          return false;
        } else if (typeof rowValue === 'object') {
          for (let field of options.fields) {
            if (field.required && !rowValue[field.name]) {
              return false;
            }
          }
          return Object.keys(rowValue).some(key => rowValue[key] != null);
        }
        return true;
      }));
      requestAnimationFrame(() => {
        rows.forEach((row) => { row.update(newValues); });
        if (options.head) { checkColumns(false); }
      });
    };

    const fieldsMap = {};
    options.fields.forEach((field) => { fieldsMap[field.name] = field; });

    const addNewRow = (animate) => {
      let row;
      const remove = () => {
        rows.splice(rows.indexOf(row), 1);
        saveFields();
      };
      row = addListRow($tbody, null, options.fields, fieldsMap, saveFields,
        remove, false, options.sortable, animate, key);
      rows.push(row);
      requestAnimationFrame(() => {
        const rowValues = rows.map(getValue => getValue());
        rows.forEach((row) => { row.update(rowValues); });
      });
    };

    rows = list.map((rowData, i) => {
      let row;
      const remove = () => {
        rows.splice(rows.indexOf(row), 1);
        saveFields();
      };
      const fields = i === 0 && options.first ? options.first : options.fields;
      row = addListRow($tbody, rowData, fields, fieldsMap, saveFields,
        remove, i === 0 && options.first,
        options.sortable, false, key);
      return row;
    });

    if (options.first && !rows.length) {
      const row = addListRow($tbody, null, options.first, fieldsMap,
        saveFields, () => {}, true, options.sortable, false, key);
      rows.push(row);
      saveFields();
    }

    // Always start with one new row.
    addNewRow();

    // Check if columns with the `bindTo` should be displayed.
    if (options.head) {
      requestAnimationFrame(checkColumns.bind(null, true));
    }

    // When user edits the last row, add another.
    const onChange = (e) => {
      if ($tbody.lastChild.contains(e.target)) {
        addNewRow(true);
      }
    };

    $tbody.addEventListener('input', onChange);
    $tbody.addEventListener('change', onChange);

    if (options.sortable) {
      dragula([$tbody], {
        moves: (el, source, handle) => {
          return (!options.first || el != el.parentNode.children[0]) &&
            handle.classList.contains('sort') &&
            handle.closest('tbody') == $tbody;
        },
        accepts: (el, target, source, sibling) => {
          return !sibling.classList.contains('gu-mirror');
        },
        direction: 'vertical',
        mirrorContainer: $tbody,

      }).on('cloned', ($mirror, $original) => {
        // Set the mirror's td's to a fixed width since taking a row
        // out of a table removes its alignments from the
        // table's columns.
        const $mirrorTDs = $mirror.querySelectorAll(':scope > td');
        $original.querySelectorAll(':scope > td').forEach(($td, i) => {
          $mirrorTDs[i].style.width = $td.offsetWidth + 'px';
        });

        // Copy the value of the mirror's form elements.
        // Since `node.cloneNode()` does not do so for some of them.
        const selection = 'select, input[type=radio]';
        const $mirrorFields = $mirror.querySelectorAll(selection);
        $original.querySelectorAll(selection).forEach(($field, i) => {
          const $node = $mirrorFields[i];
          $node.value = $field.value;
          if ($node.checked) {
            // Change the name of the radio field so that checking the
            // original element again won't uncheck the mirrored element.
            $node.setAttribute('name', $node.getAttribute('name') + '_');
            $field.checked = true;
          }
        });

      }).on('dragend', () => {
        rows.forEach((a) => {
          let $child = a.$tr;
          a.index = 0;
          while (($child = $child.previousSibling) != null) { a.index++; }
        });
        rows.sort((a, b) => a.index - b.index);
        saveFields();
      });
    }

    return $container;
  };

  const addListRow = ($table, values, fields, fieldsMap, save, remove,
    unremovable, sort, animate, key) => {
    const $tr = h('tr');
    if (unremovable) {
      $tr.classList.add('unremovable');
    }
    if (animate) {
      $tr.style.display = 'none';
      setTimeout(dom.showTR.bind(null, $tr), 100);
    }

    const getValue = () => values;
    getValue.$tr = $tr;

    // Keep track which fields in this row are being shown.
    getValue.shown = {};

    let $prevtd, prevfield;
    const fieldUpdates = fields.map((field) => {
      const saveField = (newValue) => {
        const name = field.name;
        if (fields.length === 1) {
          values = newValue;
        } else if (name) {
          values[name] = newValue;
        }
        fieldUpdates.forEach((up) => { up.checkBind(name, newValue); });
        save();
      };

      let $field;
      const update = {};
      update.checkBind = (name, newValue) => {
        const bindTo = field.bindTo;
        if (bindTo && bindTo.field === name) {
          const isVisible = !!$field.offsetParent;
          const equals = bindToEquals(bindTo.value, newValue);
          if (equals && !isVisible) {
            dom.slideXShow($field);
            getValue.shown[field.name] = true;
          } else if (!equals && isVisible) {
            dom.slideXHide($field);
            getValue.shown[field.name] = false;
          }
        }
      };

      update.hide = () => {
        if (field.bindTo) {
          dom.slideXHide($field);
        }
      };

      update.checkSelect = (newValues) => {
        if (field.type === 'select') {
          field.options
            .filter(f => f.unique)
            .forEach((option) => {
              const display = newValues.some((rowValue) => {
                return rowValue !== values &&
                  rowValue[field.name] === option.value;
              }) ? 'none' : '';
              $field
                .querySelector('option[value="' + option.value + '"]')
                .style.display = display;
            });
        }
      };

      const bindTo = field.bindTo;
      const $td = bindTo && prevfield && prevfield.bindTo ?
        $prevtd : h('td');
      if (bindTo) {
        $td.classList.add('bind-to');
      }
      $prevtd = $td;
      prevfield = field;
      const $fieldContainer = $tr.appendChild($td);
      let fieldValue;
      if (!values && (fields.length > 1 ||
          field.type === 'column' || field.type === 'row')) {
        values = {};
      }

      if (fields.length === 1) {
        fieldValue = values = values !== undefined ? values : field.default;
      } else {
        fieldValue = values[field.name] =
          values[field.name] !== undefined ? values[field.name] : field.default;
      }

      if (chrome.options.fields[field.type]) {
        $field = chrome.options.addField(fieldValue, saveField, field);
      } else if (field.type === 'column') {
        $field = chrome.options.base.column(values, save, field, key);
      } else if (field.type === 'row') {
        $field = chrome.options.base.row(values, save, field, key);
      } else {
        throw Error('Could not find option type: ' + field.type);
      }
      $fieldContainer.append($field);

      requestAnimationFrame(() => {
        if (!bindTo) { return; }
        if (
          (values[bindTo.field] &&
           !bindToEquals(bindTo.value, values[bindTo.field])) ||
          (!values[bindTo.field] &&
           !bindToEquals(bindTo.value,
             fieldsMap[bindTo.field].options[0].value))
        ) {
          $field.style.display = 'none';
          getValue.shown[field.name] = false;
        } else {
          if (animate) {
            setTimeout(() => {
              dom.slideXShow($field);
            }, 500);
          } else {
            $field.style.display = '';
            $field.style.maxWidth = '100%;';
          }
          getValue.shown[field.name] = true;
        }
      });

      return update;
    });

    $tr.append(h('td', h('a.delete', {
      onclick: () => {
        fieldUpdates.forEach((update) => { update.hide(); });
        setTimeout(() => {
          dom.hideTR($tr, () => { $tr.remove(); });
        }, 250);
        remove();
      },
    }, 'delete')));
    
    if (!unremovable && sort) {
      $tr.append(h('td', h('a.sort', 'sort')));
    }
    $table.append($tr);

    getValue.update = (newValues) => {
      fieldUpdates.forEach((update) => {
        update.checkSelect(newValues);
      });
    };

    return getValue;
  };

  const bindToEquals = (bindToValue, fieldValue) => {
    return Array.isArray(bindToValue) ?
      bindToValue.indexOf(fieldValue) > -1 : bindToValue === fieldValue;
  };

  chrome.options.base.singleFieldList = (value, save, options, type) => {
    options.fields = [{ type: type, name: options.name }];
    return chrome.options.base.list(value, save, options);
  };

  chrome.options.base.column = (values, save, option, key, top) => {
    delete option.name;
    let $container;
    if (top) {
      $container = h('div.column');
      addTabOptions($container, key, values, option.options);
    } else {
      $container = addOptions(values, save, option, key);
      $container.classList.add('column');
    }
    return $container;
  };

  chrome.options.base.row = (values, save, option, key, top) => {
    const $container =
      chrome.options.base.column(values, save, option, key, top);
    $container.classList.add('row');
    return $container;
  };

  chrome.options.addField = (value, save, option, type) => {
    const fn = chrome.options.fields[type || option.type];
    if (!fn) { return; }
    let lastTimeStamp;
    const $field = fn(value, (newValue, e) => {
      if (e) {
        if (e.timeStamp < lastTimeStamp) { return; }
        lastTimeStamp = e.timeStamp;
      }
      if (option.validate && !option.validate(newValue)) {
        $field.classList.add('invalid');
      } else {
        $field.classList.remove('invalid');
        save(newValue, e);
      }
    }, option);
    if (option.desc) {
      $field.setAttribute('data-title', option.desc);
    }
    if (option.disabled) {
      $field.setAttribute('disabled', true);
      $field.querySelectorAll(':scope, input, select, textarea').forEach(($f) => {
        $f.setAttribute('disabled', true);
      });
    }
    return $field;
  };
})();


// Define all available fields.
chrome.options.fields = {};

chrome.options.fields.checkbox = (value, save) => {
  const $checkbox = h('input[type=checkbox]');

  if (value != null) {
    $checkbox.checked = value;
  }

  $checkbox.addEventListener('change', () => {
    save($checkbox.checked);
  });

  return $checkbox;
};

chrome.options.fields.text = (value, save) => {
  const $textbox = h('input[type=text]');
  if (value !== undefined) {
    $textbox.value = value;
  }
  const debouncedInput = util.debounce(500, (e) => {
    if (e.target.validity.valid) {
      save($textbox.value, e);
    }
  });
  $textbox.addEventListener('input', debouncedInput);
  $textbox.addEventListener('change', debouncedInput);
  return $textbox;
};

chrome.options.fields.color = (value, save, option) => {
  let first = true;
  const format = option.format || 'rgba';
  if (!['rgb', 'rgba', 'hsl', 'hsla', 'hex'].includes(format)) {
    throw TypeError('Unsupported format given for color field: ' + format);
  }
  const showAlpha = ['rgba', 'hsla'].includes(format);
  const hsv2hsl = (d) => {
    return [
      Math.round(d[0] * 360),
      Math.round(d[1] * 100) + '%',
      Math.round(d[2] * 100) + '%'
    ];
  };
  const fn = {
    rgb: CP._HSV2RGB, rgba: CP._HSV2RGB,
    hsl: hsv2hsl, hsv2hsl,
    hex: CP._HSV2HEX,
  }[format];
  const debouncedSave = util.debounce(500, save);
  const onchange = () => {
    if (first) { return first = false; }
    const v = fn(picker.set());
    const color = /^hex/.test(format) ?
      `#${v}` :
      `${format}(${v.join(', ')}${showAlpha ? `, ${$alpha.value}` : ''})`;
    $field.value = color;
    $color.style.backgroundColor = color;
    debouncedSave(color);
  };

  const getAlpha = (value) => {
    const r = /(?:rgba|hsla)\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(\d?(?:\.\d+)?)\s*\)/
      .exec(value);
    return r && r[1] != '' ? r[1] : 1;
  };

  const $container = h('span.color');
  $container.append(h('span.color-alpha'));
  const $color = $container.appendChild(h('span.color-box', {
    style: value ? `background-color: ${value};` : '',
    onclick: () => { picker.enter(); },
  }));
  const $field = chrome.options.fields.text(value, () => {
    if ($alpha) {
      $alpha.value = getAlpha($field.value);
    }

    // color-picker doesn't accept alpha, so take it out.
    let s = $field.value .split(',');
    s = s.length >=4 ? s.slice(0, 3).join(',') + ')' : s.join(',');
    s = s.replace('rgba', 'rgb').replace('hsla', 'hsv').replace('hsl', 'hsv');
    picker.set(s);
  });
  $container.append($field);
  const picker = new CP($field);
  picker.on('change', onchange);

  const $extraOptions = picker.self.appendChild(h('.extra-options'));
  let $alpha;
  if (showAlpha) {
    $alpha = h('input[type=range][min=0][max=1][step=.1]', {
      'data-title': 'Alpha',
      onchange,
      oninput: onchange,
      value: value != null ? getAlpha(value) : 1,
    });
    $extraOptions.append($alpha);
  }

  if (option.default) {
    $extraOptions.append(h('span.color-reset', {
      'data-title': 'Reset to default',
      onclick: () => {
        picker.set(option.default);
        picker.trigger('change', [option.default]);
      },
      style: `background-color: ${option.default};`,
    }));
  }
  return $container;
};

chrome.options.fields.url = (value, save, option) => {
  const $field = chrome.options.fields.text(value, save, option);
  $field.setAttribute('type', 'url');
  return $field;
};

chrome.options.fields.select = (value, save, option) => {
  const valueMap = {};
  const $select = h('select', {
    onchange: (e) => {
      const val = $select.value;
      save(valueMap[val] !== undefined ? valueMap[val] : val, e);
    },
  });
  let firstValue = null;
  option.options.forEach((option) => {
    const value = typeof option === 'object' ? option.value : option ;
    const desc = typeof option === 'object' ? option.desc : option;
    valueMap[value] = value;
    $select.append(h('option', { value }, desc));
    if (firstValue === null) {
      firstValue = value;
    }
  });
  $select.value = value || firstValue;
  return $select;
};

chrome.options.fields.radio = (value, save, option) => {
  const $container = h('.radio-options');
  const name = (~~(Math.random() * 1e9)).toString(36);
  option.options.forEach((option) => {
    const val = typeof option === 'object' ? option.value : option;
    const desc = typeof option === 'object' ? option.desc : option;
    const id = (~~(Math.random() * 1e9)).toString(36);
    const $row = $container.appendChild(h('.radio-option'));
    const $radio = $row.appendChild(h('input[type=radio]', {
      id, name,
      value: val,
      checked: value == val,
      onchange: (e) => {
        if ($radio.checked) {
          save(val, e);
        }
      },
    }));

    $row.append(h('label', { for: id }, desc));
  });

  return $container;
};

chrome.options.fields.predefined_sound = (value, save, option) => {
  const playSound = () => {
    if (!value) {
      $play.classList.add('disabled');
      return;
    }
    $play.classList.remove('disabled');
    const audio = new Audio();
    audio.src = 'bower_components/chrome-options/sounds/' + value + '.wav';
    audio.onerror = console.error;
    audio.play();
  };

  const $container = h('span.predefined-sound');
  const $play = h('span.play', { onclick: playSound, innerHTML: '&#9654;' });

  const options = [
    'Basso', 'Bip', 'Blow', 'Boing', 'Bottle', 'Clink-Klank',
    'Droplet', 'Frog', 'Funk', 'Glass', 'Hero', 'Indigo', 'Laugh',
    'Logjam', 'Monkey', 'moof', 'Ping', 'Pong2003', 'Pop',
    'Purr', 'Quack', 'Single Click', 'Sosumi', 'Temple', 'Uh oh',
    'Voltage', 'Whit', 'Wild Eep'
  ];

  if (option.allowNoSound) {
    options.unshift({ value: '', desc: 'Select' });
    value = value || '';
    if (!value) { $play.classList.add('disabled'); }
  } else {
    value = value || options[0];
  }

  const saveField = (newValue, e) => {
    value = newValue;
    save(newValue, e);
  };

  const $field = chrome.options.fields.select(value, saveField, { options });
  $field.addEventListener('change', playSound);
  $container.append($field, $play);

  return $container;
};

chrome.options.fields.custom_sound = (value, save) => {
  const $container = h('span.custom-sound');

  const saveField = (newValue, e) => {
    value = newValue;
    save(newValue, e);
  };

  const playSound = () => {
    const audio = new Audio();
    audio.src = value;
    audio.play();
  };

  const $field = chrome.options.addField(value, saveField, { type: 'url' });
  $field.addEventListener('keypress', (e) => {
    if (e.keyCode === 13) {
      playSound();
    }
  });
  $container.append($field);
  $container.append(h('span.play', { onclick: playSound, innerHTML: '&#9654;' }));

  return $container;
};

chrome.options.fields.file = (value, save) => {
  return h('input[type=file]', {
    value,
    onchange: (e) => {
      save(e.target.files, e);
    },
  });
};
