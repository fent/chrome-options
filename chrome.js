window.chrome = window.chrome || {};

if (!window.chrome.storage || !window.chrome.storage.sync) {
  window.chrome.storage = window.chrome.storage || {};
  window.chrome.storage.sync = {
    get: function(keys, callback) {
      var store = {};
      keys.forEach(function(key) {
        try {
          store[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          store[key] = null;
        }
      });
      setTimeout(function() { callback(store); });
    },
    set: function(values) {
      for (var key in values) {
        localStorage.setItem(key, JSON.stringify(values[key]));
      }
    },
  };
}

if (!window.chrome.runtime || !window.chrome.runtime.getManifest) {
  window.chrome.runtime = window.chrome.runtime || {};
  window.chrome.runtime.getManifest = function() {
    return {
      name: 'Chrome Options Demo',
      description: 'Example Chrome extension demonstrating chrome-options',
      options_ui: { open_in_tab: true },
    };
  };
}
