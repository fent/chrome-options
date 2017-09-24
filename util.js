(function() {
  var util = window.util = {};

  util.deepEqual = function(a, b) {
    var t1 = typeof a;
    var t2 = typeof b;
    if (t1 !== t2) { return false; }
    if (t1 !== 'object' || a == null) { return a === b; }

    var k1 = Object.keys(a).sort();
    var k2 = Object.keys(b).sort();
    if (k1.length !== k2.length) { return false; }

    for (var i = 0, len = k1.length; i < len; i++) {
      if (k1[i] !== k2[i]) { return false; }
      if (!util.deepEqual(a[k1[i]], b[k2[i]])) { return false; }
    }

    return true;
  };

  util.deepClone = function(obj) {
    if (!(obj instanceof Object)) { return obj; }
    var clone = {};
    for (var prop in obj) { clone[prop] = util.deepClone(obj[prop]); }
    return clone;
  };

  util.debounce = function(wait, func) {
    var timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  };

})(window);
