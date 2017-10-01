/* global chrome, dragula, CP */
/* global h, slideYShow, slideYHide, slideXShow, slideXHide, hideTR, showTR */
/* global flashClass, util */

(function() {
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


  var $menu = document.querySelector('#main-menu');
  var $mainview = document.querySelector('.mainview');
  var lastHash = null;
  var hashPath = window.location.hash.split('.');
  var hashOption = hashPath.length > 1;
  var hashPosition = 1;

  function menuClick() {
    var newHash = window.location.hash;
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

    var $currentView = document.querySelector(hashPath[0]);
    if ($currentView) {
      var $target = document.querySelector('.menu a[href="' + hashPath[0] + '"]');
      $target.parentNode.classList.add('selected');
      $currentView.classList.add('selected');
      document.body.scrollTop = 0;
    }
  }

  setTimeout(menuClick, 100);
  window.addEventListener('hashchange', menuClick);

  var urlParams = {};
  window.location.search.substring(1).split('&').forEach(function(param) {
    urlParams[param] = true;
  });

  var changedValues = {};
  var $saveContainer = document.querySelector('.save-container');
  var $saveButton = $saveContainer.querySelector('button');
  $saveButton.addEventListener('click', function() {
    chrome.storage.sync.set(changedValues);
    $saveButton.setAttribute('disabled', true);
  });
  var showSavedAlert = flashClass($saveContainer, 'show', 2000);
  var flashSavedAlert = flashClass($saveContainer, 'flash', 150);

  // Add the extension's title to the top of the page.
  var setupRan = false;
  function setup() {
    if (setupRan) { return; }
    var manifest = chrome.runtime.getManifest();

    var extensionName = chrome.options.opts.title || manifest.name || 'chrome';
    document.querySelector('title').textContent = extensionName + ' options';
    var $title = document.querySelector('.chrome-options-title');
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
  }

  /**
   * @param {String} name
   * @param {String!} desc Will be placed at the top of the page of the tab
   * @param {Array.<Object>} options
   */
  chrome.options.addTab = function(name, desc, options) {
    setup();
    if (!options) {
      options = desc;
      desc = null;
    }
    var keyName = name.toLowerCase().replace(' ', '_');
    var $menuButton = h('li', h('a', { href: `#${keyName}` }, name));
    $menuButton.querySelector('a').addEventListener('click', menuClick);
    $menu.append($menuButton);
    var $tabview = h('div', { id: keyName }, h('header', h('h1', name)));
    var $tabcontent = h('div.content');
    if (desc) {
      $tabcontent.append(h('p.tab-desc', desc));
    }

    var keys = [];
    (function getOptionKeys(options) {
      options.forEach(function(option) {
        if (option.name) {
          keys.push(getKeyPath(keyName, option));
        } else if (option.type === 'column' || option.type === 'row') {
          getOptionKeys(option.options);
        }
      });
    })(options);

    chrome.storage.sync.get(keys, function(items) {
      addTabOptions($tabcontent, keyName, items, options);
    });
    $tabview.append($tabcontent);
    $mainview.append($tabview);
  };


  /**
   * @param {String} desc
   * @param {Array.<Object>} options
   */
  chrome.options.set = function(desc, options) {
    urlParams.hideSidebar = true;
    urlParams.hideTabTitle = true;
    chrome.options.addTab('', desc, options);
  };

  function getKeyPath(parentKey, option) {
    return (parentKey || '') +
      (parentKey && option.name ? '.' : '') + (option.name || '');
  } 

  function addTabOptions($parent, keyName, values, options) {
    options.forEach(function(option) {
      var key = getKeyPath(keyName, option);
      var value = values[key];
      var latestValue = value;

      // Clone value so that it can be compared to new value.
      var cloneValue = function() { value = util.deepClone(latestValue); };
      $saveButton.addEventListener('click', cloneValue);

      // Use requestAnimationFrame whenever possible,
      // so that it doensn't seep into load time.
      requestAnimationFrame(cloneValue);

      var save = function(newValue) {
        latestValue = newValue;

        requestAnimationFrame(function() {
          var isEqual = util.deepEqual(value, newValue);
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
      var $container = addOption(key, values, value, save, option, top);
      if ($container) { $parent.append($container); }
    });
  }

  function addH3(option) {
    return !hashOption && h('h3', option.desc);
  }

  function addHtml(option) {
    return !hashOption && h('', { innerHTML: option.html });
  }

  function addOption(key, values, value, save, option, top) {
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

    var $option, r;
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
      var $label = $option.querySelector('label');
      $label.append(h('span.preview-container', h('span.preview')),
        h('img.preview-image', { src: 'previews/' + key + '.' + option.preview }));
    }

    return $option;
  }

  chrome.options.base.checkbox = function(value, save, option, key) {
    var $label = h('label');
    var $container = h('.checkbox', $label);
    var $subContainer, $triangle;
    var options = option.options;
    var hasOptions = !!options;

    var checked = value;
    if (hasOptions) {
      if (value == null || typeof value !== 'object') {
        value = {};
      }
      checked = value.enabled;
    }

    var $checkbox = chrome.options.fields.checkbox(checked, function(checked) {
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

      var toggleContainer = function(checked) {
        if (checked) {
          $triangle.textContent = '▼';
          slideYShow($subContainer);
        } else {
          $triangle.textContent = '▶';
          slideYHide($subContainer);
        }
      };

      $triangle = $label.appendChild(h('span.triangle', checked ? '▼' : '▶'));
      $triangle.addEventListener('click', function(e) {
        e.preventDefault();
        checked = !checked;
        toggleContainer(checked);
      });

      $checkbox.addEventListener('change', function() {
        checked = $checkbox.checked;
        toggleContainer(checked);
      });
    }

    $label.append(h('span', option.desc));
    return $container;
  };

  chrome.options.base.checkboxNField = function(value, save, option, type) {
    if (value == null || typeof value !== 'object') {
      value = {};
    }
    var mustSave = false;
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
    var $container = h('.suboption');
    var $box = $container.appendChild(h('span'));

    $box
      .append(chrome.options.fields.checkbox(value.enabled, function(checked) {
        value.enabled = checked;
        save(value);
      }, option));

    $container.append(chrome.options.addField(value.value, function(newValue) {
      value.value = newValue;
      save(value);
    }, option, type));

    if (option.desc) {
      $container.append(h('label', option.desc));
    }
    return $container;
  };

  chrome.options.base.object = function(value, save, option, key) {
    var $container = h('.object', h('label', option.desc));
    $container.append(addOptions(value, save, option, key));
    return $container;
  };

  function addOptions(value, save, option, key) {
    if (value == null || typeof value !== 'object') {
      value = {};
    }
    var $container = h('.suboptions');
    option.options.forEach(function(option) {
      var optionKey = getKeyPath(key, option);
      var $option = addOption(optionKey, value, value[option.name],
        function(newValue) {
          if (option.name) { value[option.name] = newValue; }
          save(value);
        }, option);
      if ($option) { $container.append($option); }
    });
    return $container;
  }

  chrome.options.addLabelNField = function(value, save, option) {
    var $container = h('.suboption', h('label', option.desc || ''));
    var $field = chrome.options.addField(value, save, option);
    $container.append(h('.field-container', $field));
    $container.classList.add(option.singleline ? 'singleline' : 'multiline');
    return $container;
  };

  chrome.options.base.list = function(list, save, options, key) {
    var $container = h('.suboption.list');
    var $wrapper, shown = true;

    if (options.desc) {
      var $label = $container.appendChild(h('label', options.desc));
      if (options.collapsible) {
        shown = false;
        var $triangle = h('span.triangle', {
          onclick: function() {
            shown = !shown;
            if (shown) {
              $triangle.textContent = '▼';
              slideYShow($wrapper);
            } else {
              $triangle.textContent = '▶';
              slideYHide($wrapper);
            }
          },
        }, '▶');
        $label.prepend($triangle);
      }
    }

    list = list || [];
    var $table = $container.appendChild(h('table'));
    if (options.desc && options.collapsible) {
      $wrapper = $container.appendChild(h('', { style: 'display: none' }, $table));
    }
    var $tbody = $table.appendChild(h('tbody'));
    var rows;
    var heads = {};

    if (options.head) {
      var $thead = h('tr');
      var prevfield;
      options.fields.forEach(function(field) {
        if (!field.bindTo || !prevfield.bindTo) {
          var $container = heads[field.name] = h('div', field.desc);
          $thead.append(h('th', $container));
        } else {
          heads[field.name] = heads[prevfield.name];
        }
        prevfield = field;
      });
      $table.prepend(h('thead', $thead));
    }

    // Check if each column should be shown.
    function checkColumns(init) {
      options.fields.forEach(function(field) {
        if (!field.bindTo) { return; }
        var show = rows.some(function(row) { return row.shown[field.name]; });
        var $head = heads[field.name];
        var isVisible = !!$head.offsetParent;
        if (show && !isVisible) {
          setTimeout(slideXShow.bind(null, $head), init ? 0 : 500);
        } else if (!show && isVisible) {
          if (init) {
            $head.style.display = 'none';
          } else {
            slideXHide($head);
          }
        }
      });
    }

    function saveFields() {
      var newValues = rows.map(function(getValue) { return getValue(); });
      save(newValues.filter(function(rowValue) {
        if (rowValue == null || rowValue === '') {
          return false;
        } else if (options.filter && !options.filter(rowValue)) {
          return false;
        } else if (typeof rowValue === 'object') {
          for (var i = 0, len = options.fields.length; i < len; i++) {
            var field = options.fields[i];
            if (field.required && !rowValue[field.name]) {
              return false;
            }
          }
          return Object.keys(rowValue).some(function(key) {
            return rowValue[key] != null;
          });
        }
        return true;
      }));
      requestAnimationFrame(function() {
        rows.forEach(function(row) { row.update(newValues); });
        if (options.head) { checkColumns(false); }
      });
    }

    var fieldsMap = {};
    options.fields.forEach(function(field) {
      fieldsMap[field.name] = field;
    });

    function addNewRow(animate) {
      var row;
      function remove() {
        rows.splice(rows.indexOf(row), 1);
        saveFields();
      }
      row = addListRow($tbody, null, options.fields, fieldsMap, saveFields,
        remove, false, options.sortable, animate, key);
      rows.push(row);
      requestAnimationFrame(function() {
        var rowValues = rows.map(function(getValue) { return getValue(); });
        rows.forEach(function(row) { row.update(rowValues); });
      });
    }

    rows = list.map(function(rowData, i) {
      var row;
      function remove() {
        rows.splice(rows.indexOf(row), 1);
        saveFields();
      }
      var fields = i === 0 && options.first ? options.first : options.fields;
      row = addListRow($tbody, rowData, fields, fieldsMap, saveFields,
        remove, i === 0 && options.first,
        options.sortable, false, key);
      return row;
    });

    if (options.first && !rows.length) {
      var row = addListRow($tbody, null, options.first, fieldsMap, saveFields,
        function() {}, true, options.sortable, false, key);
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
    function onChange(e) {
      if ($tbody.lastChild.contains(e.target)) {
        addNewRow(true);
      }
    }

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
        var $mirrorTDs = $mirror.querySelectorAll(':scope > td');
        $original.querySelectorAll(':scope > td').forEach(function($td, i) {
          $mirrorTDs[i].style.width = $td.offsetWidth + 'px';
        });

        // Copy the value of the mirror's form elements.
        // Since `node.cloneNode()` does not do so for some of them.
        var selection = 'select, input[type=radio]';
        var $mirrorFields = $mirror.querySelectorAll(selection);
        $original.querySelectorAll(selection).forEach(function($field, i) {
          var $node = $mirrorFields[i];
          $node.value = $field.value;
          if ($node.checked) {
            // Change the name of the radio field so that checking the
            // original element again won't uncheck the mirrored element.
            $node.setAttribute('name', $node.getAttribute('name') + '_');
            $field.checked = true;
          }
        });

      }).on('dragend', () => {
        rows.forEach(function(a) {
          var $child = a.$tr;
          a.index = 0;
          while (($child = $child.previousSibling) != null) { a.index++; }
        });
        rows.sort(function(a, b) {
          return a.index - b.index;
        });
        saveFields();
      });
    }

    return $container;
  };

  function addListRow($table, values, fields, fieldsMap, save, remove,
    unremovable, sort, animate, key) {
    var $tr = h('tr');
    if (unremovable) {
      $tr.classList.add('unremovable');
    }
    if (animate) {
      $tr.style.display = 'none';
      setTimeout(showTR.bind(null, $tr), 100);
    }

    var getValue = function() { return values; };
    getValue.$tr = $tr;

    // Keep track which fields in this row are being shown.
    getValue.shown = {};

    var $prevtd, prevfield;
    var fieldUpdates = fields.map(function(field) {
      function saveField(newValue) {
        var name = field.name;
        if (fields.length === 1) {
          values = newValue;
        } else if (name) {
          values[name] = newValue;
        }
        fieldUpdates.forEach(function(up) {
          up.checkBind(name, newValue);
        });
        save();
      }

      var $field;
      var update = {};
      update.checkBind = function(name, newValue) {
        var bindTo = field.bindTo;
        if (bindTo && bindTo.field === name) {
          var isVisible = !!$field.offsetParent;
          var equals = bindToEquals(bindTo.value, newValue);
          if (equals && !isVisible) {
            slideXShow($field);
            getValue.shown[field.name] = true;
          } else if (!equals && isVisible) {
            slideXHide($field);
            getValue.shown[field.name] = false;
          }
        }
      };

      update.hide = function() {
        if (field.bindTo) {
          slideXHide($field);
        }
      };

      update.checkSelect = function(newValues) {
        if (field.type === 'select') {
          field.options
            .filter(function(f) { return f.unique; })
            .forEach(function(option) {
              var display = newValues.some(function(rowValue) {
                return rowValue !== values &&
                  rowValue[field.name] === option.value;
              }) ? 'none' : '';
              $field
                .querySelector('option[value="' + option.value + '"]')
                .style.display = display;
            });
        }
      };

      var bindTo = field.bindTo;
      var $td = bindTo && prevfield && prevfield.bindTo ?
        $prevtd : h('td');
      if (bindTo) {
        $td.classList.add('bind-to');
      }
      $prevtd = $td;
      prevfield = field;
      var $fieldContainer = $tr.appendChild($td);
      var fieldValue;
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

      requestAnimationFrame(function() {
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
              slideXShow($field);
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
      onclick: function() {
        fieldUpdates.forEach(function(update) { update.hide(); });
        setTimeout(function() {
          hideTR($tr, function() { $tr.remove(); });
        }, 250);
        remove();
      },
    }, 'delete')));
    
    if (!unremovable && sort) {
      $tr.append(h('td', h('a.sort', 'sort')));
    }
    $table.append($tr);

    getValue.update = function(newValues) {
      fieldUpdates.forEach(function(update) {
        update.checkSelect(newValues);
      });
    };

    return getValue;
  }

  function bindToEquals(bindToValue, fieldValue) {
    return Array.isArray(bindToValue) ?
      bindToValue.indexOf(fieldValue) > -1 : bindToValue === fieldValue;
  }

  chrome.options.base.singleFieldList = function(value, save, options, type) {
    options.fields = [{ type: type, name: options.name }];
    return chrome.options.base.list(value, save, options);
  };

  chrome.options.base.column = function(values, save, option, key, top) {
    delete option.name;
    var $container;
    if (top) {
      $container = h('div.column');
      addTabOptions($container, key, values, option.options);
    } else {
      $container = addOptions(values, save, option, key);
      $container.classList.add('column');
    }
    return $container;
  };

  chrome.options.base.row = function(values, save, option, key, top) {
    var $container =  chrome.options.base.column(values, save, option, key, top);
    $container.classList.add('row');
    return $container;
  };

  chrome.options.addField = function(value, save, option, type) {
    var fn = chrome.options.fields[type || option.type];
    if (!fn) { return; }
    var lastTimeStamp;
    var $field = fn(value, function(newValue, e) {
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
      $field.querySelectorAll('input, select, textarea').forEach(function($f) {
        $f.setAttribute('disabled', true);
      });
    }
    return $field;
  };
})();


// Define all available fields.
chrome.options.fields = {};

chrome.options.fields.checkbox = function(value, save) {
  var $checkbox = h('input[type=checkbox]');

  if (value != null) {
    $checkbox.checked = value;
  }

  $checkbox.addEventListener('change', function() {
    save($checkbox.checked);
  });

  return $checkbox;
};

chrome.options.fields.text = function(value, save) {
  var $textbox = h('input[type=text]');
  if (value !== undefined) {
    $textbox.value = value;
  }
  var debouncedInput = util.debounce(500, function(e) {
    if (e.target.validity.valid) {
      save($textbox.value, e);
    }
  });
  $textbox.addEventListener('input', debouncedInput);
  $textbox.addEventListener('change', debouncedInput);
  return $textbox;
};

chrome.options.fields.color = function(value, save, option) {
  var first = true;
  var format = option.format || 'rgba';
  if (!['rgb', 'rgba', 'hsl', 'hsla', 'hex'].includes(format)) {
    throw TypeError('Unsupported format given for color field: ' + format);
  }
  var showAlpha = ['rgba', 'hsla'].includes(format);
  var hsv2hsl = function(d) {
    return [
      Math.round(d[0] * 360),
      Math.round(d[1] * 100) + '%',
      Math.round(d[2] * 100) + '%'
    ];
  };
  var fn = {
    rgb: CP._HSV2RGB, rgba: CP._HSV2RGB,
    hsl: hsv2hsl, hsv2hsl,
    hex: CP._HSV2HEX,
  }[format];
  var debouncedSave = util.debounce(500, save);
  var onchange = function() {
    if (first) { return first = false; }
    var v = fn(picker.set());
    var color = /^hex/.test(format) ?
      `#${v}` :
      `${format}(${v.join(', ')}${showAlpha ? `, ${$alpha.value}` : ''})`;
    $field.value = color;
    $color.style.backgroundColor = color;
    debouncedSave(color);
  };

  function getAlpha(value) {
    var r = /(?:rgba|hsla)\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(\d?(?:\.\d+)?)\s*\)/
      .exec(value);
    return r && r[1] != '' ? r[1] : 1;
  }

  var $container = h('span.color');
  $container.append(h('span.color-alpha'));
  var $color = $container.appendChild(h('span.color-box', {
    style: value ? `background-color: ${value};` : '',
    onclick: function() { picker.enter(); },
  }));
  var $field = chrome.options.fields.text(value, function() {
    if ($alpha) {
      $alpha.value = getAlpha($field.value);
    }

    // color-picker doesn't accept alpha, so take it out.
    var s = $field.value .split(',');
    s = s.length >=4 ? s.slice(0, 3).join(',') + ')' : s.join(',');
    s = s.replace('rgba', 'rgb').replace('hsla', 'hsv').replace('hsl', 'hsv');
    picker.set(s);
  });
  $container.append($field);
  var picker = new CP($field);
  picker.on('change', onchange);

  var $extraOptions = picker.picker.appendChild(h('.extra-options'));
  if (showAlpha) {
    var $alpha = h('input[type=range][min=0][max=1][step=.1]', {
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
      onclick: function() {
        picker.set(option.default);
        picker.trigger('change', [option.default]);
      },
      style: `background-color: ${option.default};`,
    }));
  }
  return $container;
};

chrome.options.fields.url = function(value, save, option) {
  var $field = chrome.options.fields.text(value, save, option);
  $field.setAttribute('type', 'url');
  return $field;
};

chrome.options.fields.select = function(value, save, option) {
  var valueMap = {};
  var $select = h('select', {
    onchange: function(e) {
      var val = $select.value;
      save(valueMap[val] !== undefined ? valueMap[val] : val, e);
    },
  });
  var firstValue = null;
  option.options.forEach(function(option) {
    var value = typeof option === 'object' ? option.value : option ;
    var desc = typeof option === 'object' ? option.desc : option;
    valueMap[value] = value;
    $select.append(h('option', { value }, desc));
    if (firstValue === null) {
      firstValue = value;
    }
  });
  $select.value = value || firstValue;
  return $select;
};

chrome.options.fields.radio = function(value, save, option) {
  var $container = h('.radio-options');
  var name = (~~(Math.random() * 1e9)).toString(36);
  option.options.forEach(function(option) {
    var val = typeof option === 'object' ? option.value : option;
    var desc = typeof option === 'object' ? option.desc : option;
    var id = (~~(Math.random() * 1e9)).toString(36);
    var $row = $container.appendChild(h('.radio-option'));
    var $radio = $row.appendChild(h('input[type=radio]', {
      id, name,
      value: val,
      checked: value == val,
      onchange: function(e) {
        if ($radio.checked) {
          save(val, e);
        }
      },
    }));

    $row.append(h('label', { for: id }, desc));
  });

  return $container;
};

chrome.options.fields.predefined_sound = function(value, save, option) {
  var $container = h('span.predefined-sound');
  var $play = h('span.play', { onclick: playSound, innerHTML: '&#9654;' });

  var options = [
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

  function saveField(newValue, e) {
    value = newValue;
    save(newValue, e);
  }

  function playSound() {
    if (!value) {
      $play.classList.add('disabled');
      return;
    }
    $play.classList.remove('disabled');
    var audio = new Audio();
    audio.src = 'bower_components/chrome-options/sounds/' + value + '.wav';
    audio.onerror = console.error;
    audio.play();
  }

  var $field = chrome.options.fields.select(value, saveField, { options });
  $field.addEventListener('change', playSound);
  $container.append($field, $play);

  return $container;
};

chrome.options.fields.custom_sound = function(value, save) {
  var $container = h('span.custom-sound');

  function saveField(newValue, e) {
    value = newValue;
    save(newValue, e);
  }

  function playSound() {
    var audio = new Audio();
    audio.src = value;
    audio.play();
  }

  var $field = chrome.options.addField(value, saveField, { type: 'url' });
  $field.addEventListener('keypress', function(e) {
    if (e.keyCode === 13) {
      playSound();
    }
  });
  $container.append($field);
  $container.append(h('span.play', { onclick: playSound, innerHTML: '&#9654;' }));

  return $container;
};

chrome.options.fields.file = function(value, save) {
  return h('input[type=file]', {
    value,
    onchange: function(e) {
      save(e.target.files, e);
    },
  });
};
