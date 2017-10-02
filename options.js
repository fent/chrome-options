/* global chrome */

chrome.options.opts.about = `
  <p>This is my about page :)</p>
  <p>
    See how this demo's options are structured
    in the <a href="options.js">options.js</a> file
  </p>
`;

chrome.options.addTab('General', [
  { name: '1', desc: 'Enable my feature' },
  { name: '2', desc: 'Enable watching' },
  { name: '3', desc: 'Allow users to start it out' },
  { type: 'h3', desc: 'Section' },
  { name: 'profile', type: 'object', options: [
    { name: 'name', type: 'text', desc: 'Name' },
    { name: 'loc', type: 'select', desc: 'Location', options: [
      'Viridian', 'Pewter', 'Cerulean', 'Vermilion',
      'Lavender', 'Celadon', 'Fuchsia', 'Saffron', 'Cinnabar'
    ] },
    { name: 'party', type: 'list', head: true, fields: [
      { name: 'name', type: 'text', desc: 'Name' },
      { name: 'type1', type: 'select', desc: 'Type 1', options: [
        'Grass', 'Water', 'Fire'
      ] },
      { name: 'type2', type: 'select', desc: 'Type 2', options: [
        'None', 'Grass', 'Water', 'Fire'
      ] }
    ] },
  ], desc: 'My character profile (this is an object type)' },
  { name: '4', desc: 'Enable the sushi feature', options: [
    { name: 'fresh', desc: 'Fresh sushi' },
    { name: 'roll', desc: 'Choose a type', type: 'select',
      options: [
        'Tuna Roll', 'Thumbtack Roll', 'Hairball Roll', 'Eel Roll'] },
    { name: 'color', type: 'color', desc: 'Choose a color fish' },
  ] },
  { type: 'h3', desc: 'My Todo List' },
  { type: 'list', name: 'mylist', desc: 'Here\'s a list, add some things',
    head: true, sortable: true, fields: [
      { type: 'select', name: 'type', desc: 'Type',
        options: ['Personal', 'Work', 'Study'] },
      { type: 'text', name: 'desc', desc: 'Todo' },
      { type: 'checkbox', name: 'done', desc: 'Done?' },
    ] }
]);

chrome.options.addTab('Advanced', [
  { type: 'predefined_sound', name: 'psound',
    desc: 'Choose from a list of common alert sounds' },
  { type: 'custom_sound', name: 'csound',
    desc: 'Or provide your own' },
]);
