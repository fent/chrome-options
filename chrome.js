window.chrome = {
  storage: {
    sync: {
      get: function(keys, callback) {
        setTimeout(function() { callback({}); });
      },
      set: function() {},
    },
  },
  runtime: {
    getManifest: function() { return {}; },
  },
};
