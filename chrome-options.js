/* global chrome, $ */

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


  var $menu = $('#main-menu');
  var $mainview = $('.mainview');
  var lastHash = null;

  function menuClick() {
    var hash = window.location.hash;
    if (!hash) {
      $('.mainview > *:nth-child(2)').addClass('selected');
      $('#main-menu li:first-child').addClass('selected');
      return;
    }
    if (hash === lastHash) { return; }
    lastHash = hash;

    $('.mainview > *, .menu li').removeClass('selected');

    var $target = $('.menu a[href="' + hash + '"]');
    $target.parent().addClass('selected');
    var $currentView = $(hash);
    $currentView.addClass('selected');
    $('body')[0].scrollTop = 0;
  }

  setTimeout(menuClick, 100);
  window.addEventListener('hashchange', menuClick);

  var changedValues = {};
  var $saveContainer = $('.save-container');
  var $saveButton = $saveContainer.find('button')
    .click(function() {
      chrome.storage.sync.set(changedValues);
      $saveButton.attr('disabled', true);
    });
  var showSavedAlert = flashClass($saveContainer, 'show', 2000);
  var flashSavedAlert = flashClass($saveContainer, 'flash', 150);

  // Shortcut.
  var raf = window.requestAnimationFrame;

  // Add the extension's title to the top of the page.
  var setupRan = false;
  function setup() {
    if (setupRan) { return; }
    var manifest = chrome.runtime.getManifest();

    var extensionName = chrome.options.opts.title || manifest.name || 'chrome';
    $('title').text(extensionName + ' options');
    var $title = $('.chrome-options-title');
    $title.text(extensionName);
    if (chrome.options.opts.title === false) {
      $title.hide();
    }

    if (chrome.options.opts.about === false || !manifest.description) {
      $('.menu.about').hide();
    } else {
      if (chrome.options.opts.about) {
        $('#about .content > p').html(chrome.options.opts.about);
      } else {
        $('#about .content > p').text(manifest.description);
      }
    }

    if (chrome.options.opts.autoSave) {
      $saveButton.hide();
    } else {
      $saveContainer.find('.auto').hide();
      $saveContainer.addClass('show');
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
    var $menuButton = $('<li><a href="#' + keyName + '">' + name + '</a></li>');
    $menuButton.find('a').click(menuClick);
    $menuButton.appendTo($menu);
    var $tabview = $('<div id="' + keyName + '">' +
      '<header><h1></h1></header>' +
      '</div>');
    $tabview.find('header > h1').text(name);
    var $tabcontent = $('<div class="content"></div>');
    if (desc) {
      $tabcontent.append($('<p></p>').text(desc));
    }
    keyName = keyName ? keyName + '.' : '';
    var keys = options
      .filter(function(option) { return !!option.name; })
      .map(function(option) {
        return keyName + option.name;
      });
    chrome.storage.sync.get(keys, function(items) {
      options.forEach(function(option) {
        var key = keyName + option.name;
        var $container;
        switch (option.type) {
          case 'h3':
            $container = addH3(option);
            break;
          default:
            var value = items[key];
            var latestValue = value;

            // Clone value so that it can be compared to new value.
            function cloneValue() { value = deepClone(latestValue); }

            // Also use a timeout so that it doensn't seep into load time.
            raf(cloneValue);

            var save = function(newValue) {
              latestValue = newValue;

              // Wrap this in requestAnimationFrame so that it
              // doesn't block user interaction.
              raf(function() {
                var isEqual = deepEqual(value, newValue);
                if (chrome.options.opts.autoSave) {
                  if (!isEqual) {
                    var items = {};
                    items[key] = newValue;
                    chrome.storage.sync.set(items);
                    showSavedAlert();
                    flashSavedAlert();
                    cloneValue();
                  }
                } else if (isEqual) {
                  delete changedValues[key];
                  $saveButton.off('click', cloneValue);
                  flashSavedAlert();
                  if (!Object.keys(changedValues).length) {
                    $saveButton.attr('disabled', true);
                  }
                } else {
                  changedValues[key] = newValue;
                  $saveButton.attr('disabled', false);
                  $saveButton.one('click', cloneValue);
                  flashSavedAlert();
                }
              });
            };
            $container = addOption(key, value, save, option);
        }
        $container.appendTo($tabcontent);
      });
    });
    $tabcontent.appendTo($tabview);
    $tabview.appendTo($mainview);
  };


  /**
   * @param {String} desc
   * @param {Array.<Object>} options
   */
  chrome.options.set = function(desc, options) {
    chrome.options.opts.title = false;
    chrome.options.addTab('', desc, options);
    $('.frame .navigation, .frame .mainview header').hide();
    $('.frame .mainview').css('-webkit-margin-start', '10px');
    $('.frame .content').css('padding-top', '2px');
  };

  function addH3(option) {
    return $('<h3>').text(option.desc);
  }

  function addOption(key, value, save, option) {
    if (value === undefined &&
       (option.default || typeof option.default === 'boolean')) {
      value = option.default;
      if (chrome.options.opts.saveDefaults) {
        save(value);
      }
    }

    if (option.transform) {
      var origSave = save;
      save = function(newValue) { origSave(option.transform(newValue)); };
    }

    var $option, fn, r;
    if (option.type === 'checkbox' || !option.type) {
      $option = chrome.options.base.checkbox(value, save, option, key);
    } else if (option.type === 'object') {
      $option = chrome.options.base.object(value, save, option, key);
    } else if (option.type === 'list') {
      $option = chrome.options.base.list(value, save, option);
    } else if (fn = chrome.options.fields[option.type]) {
      $option = chrome.options.base.field(value, save, option, fn);
    } else if (r = /(\w+)-list/.exec(option.type)) {
      $option = chrome.options.base.singleFieldList(value, save, option, r[1]);
    } else if (r = /checkbox-(\w+)/.exec(option.type)) {
      $option = chrome.options.base.checkboxNField(value, save, option, r[1]);
    } else {
      throw Error('Could not find option type: ' + option.type);
    }

    if (option.preview) {
      var $label = $option.find('label').first();
      $label.append('<span class="preview"></span>');
      $('<img class="preview-image" />')
        .appendTo($label)
        .get(0).src = 'previews/' + key + '.' + option.preview;
    }

    return $option;
  }

  chrome.options.base.checkbox = function(value, save, option, key) {
    var $container = $('<div class="checkbox"><label></label></div>');
    var $subContainer, $triangle;
    var options = option.options;
    var hasOptions = !!options;
    var $label = $container.find('label');

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
    }, option).appendTo($label);

    if (hasOptions) {
      $triangle = $('<span class="triangle"></span>').appendTo($label);
      $triangle.text(checked ? '▼' : '▶');
      $triangle.click(function(e) {
        e.preventDefault();
        checked = !checked;
        if (checked) {
          $triangle.text('▼');
          $subContainer.slideDown();
        } else {
          $triangle.text('▶');
          $subContainer.slideUp();
        }
      });

      $checkbox.click(function() {
        checked = $checkbox[0].checked;
        if (checked) {
          $triangle.text('▼');
          $subContainer.slideDown();
        } else {
          $triangle.text('▶');
          $subContainer.slideUp();
        }
      });
    }

    $('<span></span>')
      .text(option.desc)
      .appendTo($label);

    if (hasOptions) {
      $subContainer = addOptions(value, save, option, key)
        .appendTo($container);
      if (!checked) { $subContainer.hide(); }
    }

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

    var fn = chrome.options.fields[type];
    if (!fn) {
      throw Error('Could not find option type: ' + option.type);
    }
    var $container = $('<div class="suboption">');
    var $box = $('<span>').appendTo($container);

    chrome.options.fields.checkbox(value.enabled, function(checked) {
      value.enabled = checked;
      save(value);
    }, option).appendTo($box);

    fn(value.value, function(newValue) {
      value.value = newValue;
      save(value);
    }, option).appendTo($container);

    if (option.desc) {
      $('<label></label>').text(option.desc).appendTo($container);
    }
    return $container;
  };

  chrome.options.base.object = function(value, save, option, key) {
    var $container = $('<div class="object"><label></label></div>');
    $container.find('label').text(option.desc);
    addOptions(value, save, option, key).appendTo($container);
    return $container;
  };

  function addOptions(value, save, option, key) {
    if (value == null || typeof value !== 'object') {
      value = {};
    }
    var $container = $('<div class="suboptions"></div>');
    option.options.forEach(function(option) {
      var optionKey = (key ? key + '.' : '') + option.name;
      addOption(optionKey, value[option.name], function(newValue) {
        value[option.name] = newValue;
        save(value);
      }, option).appendTo($container);
    });
    return $container;
  }

  chrome.options.base.field = function(value, save, option, fn) {
    var $container = $('<div class="suboption"><label></label></div>');
    var $label = $container.find('label');
    $label.text(option.desc);
    var $field = fn(value, save, option);
    if (fn.multiline) {
      $('<div></div>').append($field).appendTo($container);
    } else {
      $container.prepend($field);
    }
    return $container;
  };

  chrome.options.base.list = function(list, save, options) {
    var $container = $('<div class="suboption list"></div>');
    var $wrapper, shown = true;

    if (options.desc) {
      var $label = $('<label></label>')
        .text(options.desc)
        .appendTo($container);
      if (options.collapsible) {
        shown = false;
        var $triangle = $('<span class="triangle"></span>')
          .text('▶')
          .click(function() {
            shown = !shown;
            if (shown) {
              $triangle.text('▼');
              $wrapper.slideDown();
            } else {
              $triangle.text('▶');
              $wrapper.slideUp();
            }
          })
          .prependTo($label);
      }
    }

    list = list || [];
    var $table = $('<table></table>').appendTo($container);
    if (options.desc && options.collapsible) {
      $wrapper = $table.wrap('<div></div>').closest('div').hide();
    }
    var $tbody = $('<tbody></tbody>').appendTo($table);
    var rows;
    var heads = {};

    if (options.head) {
      var $thead = $('<thead><tr></tr></head>').prependTo($table).find('tr');
      options.fields.forEach(function(field) {
        heads[field.name] = $('<th><div></div></th>')
          .appendTo($thead)
          .find('div')
          .text(field.desc);
      });
    }

    function checkColumns(init) {
      options.fields.forEach(function(field) {
        if (!field.bindTo) { return; }
        var show = rows.some(function(row) { return row.shown[field.name]; });
        var $head = heads[field.name];
        var isVisible = $head.is(':visible');
        if (show && !isVisible) {
          setTimeout(function() {
            $head.css('display', '');
            $head.animateAuto('width', init ? 250 : 500);
          }, init ? 0 : 500);
        } else if (!show && isVisible) {
          if (init) {
            $head.css({display: 'none', width: 0 });
          } else {
            $head.animateAuto({
              dimension: 'width',
              action: 'close',
            }, 500, function() { $head.css('display', 'none'); });
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
      raf(function() {
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
                           remove, false, options.sortable, animate);
      rows.push(row);
      raf(function() {
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
                           remove, i === 0 && options.first, options.sortable);
      return row;
    });

    if (options.first && !rows.length) {
      var row = addListRow($tbody, null, options.first, fieldsMap, saveFields,
                           function() {}, true, options.sortable);
      rows.push(row);
      saveFields();
    }

    // Always start with one new row.
    addNewRow();

    // Check if columns with the `bindTo` should be displayed.
    if (options.head) {
      raf(checkColumns.bind(null, true));
    }

    // When user focuses on the last row, add another.
    $tbody.on('input change', '> tr:last-child', addNewRow.bind(null, true));

    if (options.sortable) {
      $tbody.sortable({
        axis: 'y',
        items: '> *' + (options.first ? ':not(:first-child)' : ''),
        handle: '.sort',
        placeholder: 'placeholder',
        cursor: 'move',
      }).on('sortstart', function(e, ui) {
        // It's possible that the width of each column will change as
        // a row is removed to be sorted. This keeps the widths as they were
        // when sorting started, and then resets things when sorting is done.
        var $trs = ui.placeholder.closest('table').find('tr:not(.placeholder)');
        var widths = [];
        $trs.each(function() {
          $(this).find('td').each(function(i) {
            var column = widths[i] = widths[i] || [];
            column.push($(this).width());
          });
        });
        var height = $trs.eq(0).find('td').eq(0).height();
        widths = widths.map(function(row) {
          return Math.max.apply(null, row);
        });
        var $placeholderTDs = ui.placeholder.find('td');
        var $itemTDs = ui.item.find('td');
        widths.forEach(function(width, i) {
          var $td = $placeholderTDs.eq(i);
          $td.css('width', width + 'px');
          $td.html('<div style="height: ' + height + 'px;">&nbsp;</div>');
          $itemTDs.eq(i).css('width', width + 'px');
        });
      }).on('sortstop', function(e, ui) {
        ui.item.find('td').css('width', '');
        rows.forEach(function(a) {
          var child = a.$tr[0];
          a.index = 0;
          while ((child = child.previousSibling) != null) { a.index++; }
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
                      unremovable, sort, animate) {
    var $tr = $('<tr></tr>');
    if (unremovable) {
      $tr.addClass('unremovable');
    }
    if (animate) {
      $tr.css('display', 'none');
      setTimeout(showTR.bind(null, $tr), 100);
    }

    var getValue = function() { return values; };
    getValue.$tr = $tr;
    getValue.shown = {};

    var $prevtd, prevfield;
    var fieldUpdates = fields.map(function(field) {
      function saveField(newValue) {
        var name = field.name;
        if (fields.length === 1) {
          values = newValue;
        } else {
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
          var isVisible = $field.is(':visible');
          var equals = bindToEquals(bindTo.value, newValue);
          if (equals && !isVisible) {
            $field.css('display', '');
            $field.animateAuto('width', 500);
            getValue.shown[field.name] = true;
          } else if (!equals && isVisible) {
            $field.animateAuto({
              dimension: 'width',
              action: 'close',
            }, 500, function() { $field.css('display', 'none'); });
            getValue.shown[field.name] = false;
          }
        }
      };

      update.hide = function() {
        if (field.bindTo) {
          $field.animateAuto({
            dimension: 'width',
            action: 'close',
          }, 250, function() {
            $field.css('display', 'none');
          });
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
                .find('option[value="' + option.value + '"]')
                .css('display', display);
            });
        }
      };

      var bindTo = field.bindTo;
      var $td = bindTo && prevfield && prevfield.bindTo ?
        $prevtd : $('<td></td>');
      if (bindTo) {
        $td.addClass('bind-to');
      }
      $prevtd = $td;
      prevfield = field;
      var $fieldContainer = $td.appendTo($tr);
      var fieldValue;
      if (fields.length === 1) {
        fieldValue = values = values !== undefined ? values : field.default;
      } else {
        if (!values) { values = {}; }
        fieldValue = values[field.name] =
          values[field.name] !== undefined ? values[field.name] : field.default;
      }

      var fn = chrome.options.fields[field.type];
      if (!fn) {
        throw Error('Could not find option type: ' + field.type);
      }
      $field = fn(fieldValue, saveField, field)
        .appendTo($fieldContainer);

      raf(function() {
        if (!bindTo) { return; }
        if (
             (values[bindTo.field] &&
              !bindToEquals(bindTo.value, values[bindTo.field])) ||
             (!values[bindTo.field] &&
              !bindToEquals(bindTo.value,
                            fieldsMap[bindTo.field].options[0].value))
           ) {
          $field.css({ display: 'none', width: 0 });
          getValue.shown[field.name] = false;
        } else {
          if (animate) {
            setTimeout(function() { $field.animateAuto('width', 500); }, 500);
          } else {
            $field.animateAuto('width', 500);
          }
          getValue.shown[field.name] = true;
        }
      });

      return update;
    });

    $('<td><a class="delete">delete</a></td>')
      .appendTo($tr)
      .find('a').click(function() {
        fieldUpdates.forEach(function(update) { update.hide(); });
        setTimeout(function() {
          hideTR($tr, function() { $tr.remove(); });
        }, 250);
        remove();
      });
    
    if (!unremovable && sort) {
      $('<td><a class="sort">sort</a></td>').appendTo($tr);
    }
    $tr.appendTo($table);

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

  function hideTR($tr, callback) {
    $tr
      .find('td')
      .wrapInner('<div style="display: block" />')
      .parent()
      .find('td > div')
      .slideUp(function() {
        $tr.hide();
        var $set = $(this);
        $set.replaceWith($set.contents());
        if (callback) { callback(); }
      });
  }

  function showTR($tr) {
    $tr.show();
    $tr
      .find('td')
      .wrapInner('<div style="display: none" />')
      .parent()
      .find('td > div')
      .slideDown(function() {
        var $set = $(this);
        $set.replaceWith($set.contents());
      });
  }

  function flashClass($container, className, ms) {
    var timeoutID;
    return function() {
      $container.addClass(className);
      clearTimeout(timeoutID);
      timeoutID = setTimeout(function() {
        $container.removeClass(className);
      }, ms);
    };
  }

  function deepEqual(a, b) {
    var t1 = typeof a;
    var t2 = typeof b;
    if (t1 !== t2) { return false; }
    if (t1 !== 'object') { return a === b; }

    var k1 = Object.keys(a).sort();
    var k2 = Object.keys(b).sort();
    if (k1.length !== k2.length) { return false; }

    for (var i = 0, len = k1.length; i < len; i++) {
      if (k1[i] !== k2[i]) { return false; }
      if (!deepEqual(a[k1[i]], b[k2[i]])) { return false; }
    }

    return true;
  }

  function deepClone(obj) {
    if (!(obj instanceof Object)) { return obj; }
    var clone = {};
    for (var prop in obj) { clone[prop] = deepClone(obj[prop]); }
    return clone;
  }
})();


// Define all available fields.
chrome.options.fields = {};

chrome.options.fields.checkbox = function(value, save, option) {
  var $checkbox = $('<input type="checkbox">');

  if (value != null) {
    $checkbox[0].checked = value;
  }

  $checkbox.click(function() {
    save($checkbox[0].checked);
  });

  if (option.desc) {
    $checkbox.attr('data-title', option.desc);
  }

  return $checkbox;
};

chrome.options.fields.text = function(value, save) {
  var $textbox = $('<input type="text">');
  $textbox.val(value);
  $textbox.on('input change', $.debounce(500, false, function(e) {
    save($textbox.val(), e);
  }));
  return $textbox;
};

chrome.options.fields.color = function(value, save, option) {
  var $container = $('<span class="color"></span>');
  var $color = chrome.options.fields.text(value, save)
    .appendTo($container)
    .spectrum($.extend({
      showInput: true,
      showAlpha: true,
      showInitial: true,
    }, option));
  if (option.desc) {
    $color.attr('data-title', option.desc);
  }
  if (option.default) {
    var $reset = $('<span class="color-reset"></span>')
      .click(function(e) {
        $color.spectrum('set', option.default);
        save(option.default, e);
      })
      .attr('data-title', 'Reset to default')
      .appendTo($container);

    // There's a bug with jquery where it will save a field's value.
    requestAnimationFrame(function() {
      $reset.css('background-color', option.default);
    });
  }
  return $container;
};

chrome.options.fields.url = function(value, save) {
  return chrome.options.fields.text(value, save).attr('type', 'url');
};

chrome.options.fields.select = function(value, save, option) {
  var valueMap = {};
  var $select = $('<select>');
  $select.change(function(e) {
    var val = $select.val();
    save(valueMap[val] !== undefined ? valueMap[val] : val, e);
  });
  var firstValue = null;
  option.options.forEach(function(option) {
    var value = typeof option === 'object' ? option.value : option ;
    var desc = typeof option === 'object' ? option.desc : option;
    valueMap[value] = value;
    $('<option>')
      .attr('value', value)
      .text(desc)
      .appendTo($select);
    if (firstValue === null) {
      firstValue = value;
    }
  });
  if (option.disabled) {
    $select.attr('disabled', true);
  }
  $select.val(value || firstValue);
  return $select;
};

chrome.options.fields.radio = function(value, save, options) {
  var $container = $('<div class="radio-options"></div>');
  var name = (~~(Math.random() * 1e9)).toString(36);
  options.forEach(function(option) {
    var val = typeof option === 'object' ? option.value : option ;
    var desc = typeof option === 'object' ? option.desc : option;
    var id = (~~(Math.random() * 1e9)).toString(36);
    var $row = $('<div class="radio-option"></div>').appendTo($container);
    var $radio = $('<input type="radio" />')
      .attr('id', id)
      .attr('name', name)
      .attr('value', val)
      .change(function(e) {
        if ($radio[0].checked) {
          save(val, e);
        }
      })
      .appendTo($row);
    if (value === val) {
      $radio.attr('checked', true);
    }

    $('<label></label>').attr('for', id).text(desc).appendTo($row);
  });

  return $container;
};

chrome.options.fields.predefined_sound = function(value, save, option) {
  var $container = $('<span class="predefined-sound">');
  var $play = $('<span class="play">&#9654;</span>');
  $play.click(playSound);

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
    if (!value) { $play.addClass('disabled'); }
  } else {
    value = value || options[0];
  }

  function saveField(newValue, e) {
    value = newValue;
    save(newValue, e);
  }

  function playSound() {
    if (!value) {
      $play.addClass('disabled');
      return;
    }
    $play.removeClass('disabled');
    var audio = new Audio();
    audio.src = 'bower_components/chrome-options/sounds/' + value + '.wav';
    audio.onerror = console.error;
    audio.play();
  }

  chrome.options.fields.select(value, saveField, { options: options })
    .change(playSound)
    .appendTo($container);
  $play.appendTo($container);

  return $container;
};

chrome.options.fields.custom_sound = function(value, save) {
  var $container = $('<span class="custom-sound">');

  function saveField(newValue, e) {
    value = newValue;
    save(newValue, e);
  }

  function playSound() {
    var audio = new Audio();
    audio.src = value;
    audio.play();
  }

  chrome.options.fields.url(value, saveField)
    .keypress(function(e) {
      if (e.keyCode === 13) {
        playSound();
      }
    })
    .appendTo($container);
  var $play = $('<span class="play">&#9654;</span>').appendTo($container);
  $play.click(playSound);

  return $container;
};

chrome.options.fields.file = function(value, save) {
  var $file = $('<input type="file">');
  $file.val(value);
  $file.change(function(e) {
    save(e.target.files, e);
  });
  return $file;
};
