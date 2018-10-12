/* global chrome */
import h from './hyperscript.js';
import * as dom from './dom.js';

import dragula from 'dragula';
require('dragula/dist/dragula.css');

chrome.options = {};
chrome.options.base = {};
chrome.options.fields = {};

const addH3 = (option) => h('h3', option.desc);
const addHtml = (option) => h('', { innerHTML: option.html });

chrome.options.addOption = (key, value, save, option) => {
  if (value === undefined && option.default != null) {
    value = option.default;
    if ((!option.type || option.type === 'checkbox') &&
      option.options && typeof value === 'boolean') {
      value = { enabled: value };
    }
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
      $option = chrome.options.base.column(value, save, option, key);
      break;
    case 'row':
      $option = chrome.options.base.row(value, save, option, key);
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

  if (option.hidden) {
    $option.classList.add('hidden');
  } else if (option.disabled) {
    $option.classList.add('disabled');
    $option.querySelectorAll('input, select, textarea').forEach(($f) => {
      $f.setAttribute('disabled', true);
    });
  } else if (option.preview) {
    // `key` is passed down from parent options to be used here.
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

  option = Object.assign({}, option, { type });
  $container.append(chrome.options.addField(value.value, (newValue) => {
    value.value = newValue;
    save(value);
  }, option));

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

const getKeyPath = (parentKey, option) => {
  return (parentKey || '') +
    (parentKey && option.name ? '.' : '') + (option.name || '');
};

const addOptions = (value, save, option, key) => {
  if (value == null || typeof value !== 'object') {
    value = {};
  }
  return h('.suboptions', option.options.map((option) => {
    const optionKey = getKeyPath(key, option);
    return chrome.options.addOption(optionKey, value[option.name],
      (newValue) => {
        if (option.name) { value[option.name] = newValue; }
        save(value);
      }, option);
  }));
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

chrome.options.base.column = (values, save, option, key) => {
  delete option.name;
  const $container = addOptions(values, save, option, key);
  $container.classList.add('column');
  return $container;
};

chrome.options.base.row = (values, save, option, key) => {
  const $container = chrome.options.base.column(values, save, option, key);
  $container.classList.add('row');
  return $container;
};

chrome.options.addField = (value, save, option) => {
  const fn = chrome.options.fields[option.type];
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
  return $field;
};
