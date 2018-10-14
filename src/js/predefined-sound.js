/* global chrome */

import h from './hyperscript.js';

chrome.options.fields.predefined_sound = (value, save, option) => {
  const playSound = () => {
    if (!value) {
      $play.classList.add('disabled');
      return;
    }
    $play.classList.remove('disabled');
    const audio = new Audio();
    audio.src = 'node_modules/chrome-options/sounds/' + value + '.wav';
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
