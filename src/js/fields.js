/* global chrome */

import h from './hyperscript.js';
import { debounce } from './util.js';

import './color-picker.js';
import './predefined-sound.js';

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
  const debouncedInput = debounce(500, (e) => {
    if (e.target.validity.valid) {
      save($textbox.value, e);
    }
  });
  $textbox.addEventListener('input', debouncedInput);
  $textbox.addEventListener('change', debouncedInput);
  return $textbox;
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
