/* global chrome, CP */

require('c-p');
require('c-p/color-picker.css');

import h from './hyperscript.js';
import { debounce } from './util.js';

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
  const debouncedSave = debounce(500, save);
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
