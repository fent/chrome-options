/* global chrome, $, dragula */

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
  var hashPath = window.location.hash.split('.');
  var hashOption = hashPath.length > 1;
  var hashPosition = 1;

  function menuClick() {
    var newHash = window.location.hash;
    if (!newHash) {
      $('.mainview > *:nth-child(2)').addClass('selected');
      $('#main-menu li:first-child').addClass('selected');
      return;
    }
    if (newHash === lastHash) { return; }
    lastHash = newHash;

    $('.mainview > *, .menu li').removeClass('selected');

    hashPath = newHash.split('.');
    hashOption = hashPath.length > 1;

    var $target = $('.menu a[href="' + hashPath[0] + '"]');
    $target.parent().addClass('selected');
    var $currentView = $(hashPath[0]);
    $currentView.addClass('selected');
    $('body')[0].scrollTop = 0;
  }

  setTimeout(menuClick, 100);
  window.addEventListener('hashchange', menuClick);

  var urlParams = {};
  window.location.search.substring(1).split('&').forEach(function(param) {
    urlParams[param] = true;
  });

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
    if (chrome.options.opts.title !== false && !urlParams.hideTitle) {
      $(document.body).addClass('show-title');
    }

    if (chrome.options.opts.about !== false &&
       (chrome.options.opts.about || manifest.description) &&
        !urlParams.hideAbout) {
      $(document.body).addClass('show-about');
      if (chrome.options.opts.about) {
        $('#about .content > p').html(chrome.options.opts.about);
      } else {
        $('#about .content > p').text(manifest.description);
      }
    }

    if (!urlParams.hideSidebar) {
      $(document.body).addClass('show-sidebar');
    }

    if (!urlParams.hideTabTitle) {
      $(document.body).addClass('show-tab-title');
    }

    if (!urlParams.hideTabDesc) {
      $(document.body).addClass('show-tab-desc');
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
      $tabcontent.append($('<p class="tab-desc"></p>').text(desc));
    }
    keyName = keyName ? keyName + '.' : '';
    var keys = options
      .filter(function(option) { return !!option.name; })
      .map(function(option) {
        return keyName + option.name;
      });
    chrome.storage.sync.get(keys, function(items) {
      addTabOptions($tabcontent, keyName, items, options);
    });
    $tabcontent.appendTo($tabview);
    $tabview.appendTo($mainview);
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

  function addTabOptions($parent, keyName, values, options) {
    options.forEach(function(option) {
      var key = keyName + option.name;
      var $container;
      switch (option.type) {
        case 'h3':
          $container = addH3(option);
          break;

        default:
          var value = values[key];
          var latestValue = value;

          // Clone value so that it can be compared to new value.
          var cloneValue = function() { value = deepClone(latestValue); };

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
                  chrome.storage.sync.set({ [key]: newValue });
                  showSavedAlert();
                  flashSavedAlert();
                  cloneValue();
                }
              } else if (isEqual) {
                delete changedValues[key];
                $saveButton.off('click', cloneValue);
                if (!Object.keys(changedValues).length) {
                  $saveButton.attr('disabled', true);
                } else {
                  flashSavedAlert();
                }
              } else {
                changedValues[key] = newValue;
                $saveButton.attr('disabled', false);
                $saveButton.one('click', cloneValue);
                flashSavedAlert();
              }
            });
          };
          $container = addOption(key, values, value, save, option, top);
      }
      if ($container) { $container.appendTo($parent); }
    });
  }

  function addH3(option) {
    return !hashOption && $('<h3>').text(option.desc);
  }

  function addHtml(option) {
    return (!hashOption) && $('<div>').html(option.html);
  }

  function addOption(key, values, value, save, option, top) {
    if (hashOption) {
      if (hashPosition < hashPath.length &&
          option.name && option.name !== hashPath[hashPosition]) {
        return;
      }
      hashPosition++;
    }

    if (value === undefined &&
       (option.default || typeof option.default === 'boolean')) {
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

    if (!chrome.options.fields[type]) {
      throw Error('Could not find option type: ' + type);
    }
    var $container = $('<div class="suboption">');
    var $box = $('<span>').appendTo($container);

    chrome.options.fields.checkbox(value.enabled, function(checked) {
      value.enabled = checked;
      save(value);
    }, option).appendTo($box);

    chrome.options.addField(value.value, function(newValue) {
      value.value = newValue;
      save(value);
    }, option, type).appendTo($container);

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
      var optionKey = (key || '') +
        (key && option.name ? '.' : '') + (option.name || '');
      var $option = addOption(optionKey, value, value[option.name],
        function(newValue) {
          if (option.name) { value[option.name] = newValue; }
          save(value);
        }, option);
      if ($option) { $option.appendTo($container); }
    });
    return $container;
  }

  chrome.options.addLabelNField = function(value, save, option) {
    var $container = $('<div class="suboption"><label></label></div>');
    var $field = chrome.options.addField(value, save, option);
    if (option.desc) {
      $container.find('label').text(option.desc);
    }
    $('<div class="field-container"></div>')
      .append($field)
      .appendTo($container);
    $container.addClass(option.singleline ? 'singleline' : 'multiline');
    return $container;
  };

  chrome.options.base.list = function(list, save, options, key) {
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

    // Check if each column should be shown.
    function checkColumns(init) {
      options.fields.forEach(function(field) {
        if (!field.bindTo) { return; }
        var show = rows.some(function(row) { return row.shown[field.name]; });
        var $head = heads[field.name];
        var isVisible = $head.is(':visible');
        if (show && !isVisible) {
          setTimeout(function() {
            slideShow($head);
          }, init ? 0 : 500);
        } else if (!show && isVisible) {
          if (init) {
            $head.css('display', 'none');
          } else {
            slideHide($head);
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
        remove, false, options.sortable, animate, key);
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
      raf(checkColumns.bind(null, true));
    }

    // When user focuses on the last row, add another.
    $tbody.on('input change', '> tr:last-child', addNewRow.bind(null, true));

    if (options.sortable) {
      dragula([$tbody.get(0)], {
        moves: (el, source, handle) => {
          return (!options.first || el != el.parentNode.children[0]) &&
            handle.closest('tbody') == $tbody.get(0) &&
            handle.classList.contains('sort');
        },
        accepts: (el, target, source, sibling) => {
          return !sibling.classList.contains('gu-mirror');
        },
        direction: 'vertical',
        mirrorContainer: $tbody.get(0),

      }).on('cloned', (mirror, original) => {
        // Set the mirror's td's to a fixed width since taking a row
        // out of a table removes its alignments from the
        // table's columns.
        var $mirrorTDs = $(mirror).find('> td');
        $(original).find('> td').each(function(i) {
          $mirrorTDs.eq(i).width($(this).width());
        });

        // Copy the value of the mirror's form elements.
        // Since `node.cloneNode()` does not do so for some of them.
        var selection = 'select, input[type=radio]';
        var $mirrorSelects = $(mirror).find(selection);
        $(original).find(selection).each(function(i) {
          var $node = $mirrorSelects.get(i);
          $node.value = this.value;
          if ($node.checked) {
            // Change the name of the radio field so that checking the
            // original element again won't uncheck the mirrored element.
            $node.setAttribute('name', $node.getAttribute('name') + '_');
            this.checked = true;
          }
        });

      }).on('dragend', () => {
        //ui.item.find('td').css('width', '');
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
    unremovable, sort, animate, key) {
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
          var isVisible = $field.is(':visible');
          var equals = bindToEquals(bindTo.value, newValue);
          if (equals && !isVisible) {
            slideShow($field);
            getValue.shown[field.name] = true;
          } else if (!equals && isVisible) {
            slideHide($field);
            getValue.shown[field.name] = false;
          }
        }
      };

      update.hide = function() {
        if (field.bindTo) {
          slideHide($field);
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
      $field.appendTo($fieldContainer);

      raf(function() {
        if (!bindTo) { return; }
        if (
          (values[bindTo.field] &&
           !bindToEquals(bindTo.value, values[bindTo.field])) ||
          (!values[bindTo.field] &&
           !bindToEquals(bindTo.value,
             fieldsMap[bindTo.field].options[0].value))
        ) {
          $field.css('display', 'none');
          getValue.shown[field.name] = false;
        } else {
          if (animate) {
            setTimeout(() => {
              slideShow($field);
            }, 500);
          } else {
            $field.css('max-width', '100%');
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

  function slideHide($node, ms = 500) {
    $node.css({
      maxWidth: '100%',
      paddingLeft: '',
      paddingRight: '',
      transition: `max-width ${ms}ms, padding ${ms}ms`,
    });
    setTimeout(() => {
      $node.css({
        maxWidth: 0,
        paddingLeft: 0,
        paddingRight: 0,
      });
      setTimeout(() => {
        $node.css('display', 'none');
      }, ms);
    });
  }

  function slideShow($node, ms = 500) {
    $node.css({
      display: '',
      maxWidth: 0,
      paddingLeft: 0,
      paddingRight: 0,
      transition: `max-width ${ms}ms, padding ${ms}ms`,
    });
    setTimeout(() => {
      $node.css({
        maxWidth: '100%',
        paddingLeft: '',
        paddingRight: '',
      });
    });
  }

  chrome.options.base.singleFieldList = function(value, save, options, type) {
    options.fields = [{ type: type, name: options.name }];
    return chrome.options.base.list(value, save, options);
  };

  chrome.options.base.column = function(values, save, option, key, top) {
    delete option.name;
    if (top) {
      var $container = $('<div class="column"></div>');
      addTabOptions($container, key, values, option.options);
      return $container;
    } else {
      return addOptions(values, save, option, key)
        .attr('class', 'column');
    }
  };

  chrome.options.base.row = function(values, save, option, key, top) {
    return chrome.options.base.column(values, save, option, key, top)
      .attr('class', 'row');
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
    if (t1 !== 'object' || a == null) { return a === b; }

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
        $field.addClass('invalid');
      } else {
        $field.removeClass('invalid');
        save(newValue, e);
      }
    }, option);
    if (option.desc) {
      $field.attr('data-title', option.desc);
    }
    if (option.disabled) {
      $field.find('input, select, textarea').attr('disabled', true);
    }
    return $field;
  };
})();


// Define all available fields.
chrome.options.fields = {};

chrome.options.fields.checkbox = function(value, save) {
  var $checkbox = $('<input type="checkbox">');

  if (value != null) {
    $checkbox[0].checked = value;
  }

  $checkbox.click(function() {
    save($checkbox[0].checked);
  });

  return $checkbox;
};

function debounce(wait, func) {
  var timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

chrome.options.fields.text = function(value, save) {
  var $textbox = $('<input type="text">');
  $textbox.val(value);
  $textbox.on('input change', debounce(500, function(e) {
    if (e.target.validity.valid) {
      save($textbox.val(), e);
    }
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

chrome.options.fields.url = function(value, save, option) {
  return chrome.options.fields.text(value, save, option).attr('type', 'url');
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
  $select.val(value || firstValue);
  return $select;
};

chrome.options.fields.radio = function(value, save, option) {
  var $container = $('<div class="radio-options"></div>');
  var name = (~~(Math.random() * 1e9)).toString(36);
  option.options.forEach(function(option) {
    var val = typeof option === 'object' ? option.value : option;
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

  chrome.options.addField(value, saveField, { type: 'url' })
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
