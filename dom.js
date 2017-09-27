(function(window) {
  function isArray(obj) {
    return Array.isArray(obj) ||
      obj instanceof NodeList;
  }

  var h = window.h = function(selector, props = {}, children) {
    if (props != null && (isArray(props) ||
      typeof props === 'string' ||
      props.tagName)) {
      children = props;
      props = {};
    }

    var attrs = {};
    var attrsRe = /\[([^\s=]+)=(?:"([^"]*)"|([^\]]*))\]/;
    var res;
    while ((res = attrsRe.exec(selector))) {
      attrs[res[1]] = res[2] || res[3];
      selector = selector.slice(0, res.index) +
        selector.slice(res.index + res[0].length);
    }

    var m = selector.split(/(\.|#)/);
    var tagName = m[0] === '.' || m[0] === '#' || m[0] === '' ? 'div' : m[0];
    var el = document.createElement(tagName);
    for (let i = 1; i < m.length; i += 2) {
      if (m[i] === '.') {
        el.classList.add(m[i + 1]);
      } else if (m[i] === '#') {
        attrs.id = m[i + 1];
      }
    }

    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }

    for (let key in props) {
      let r = /^on(\w+)/.exec(key);
      let val = props[key];
      if (r) {
        el.addEventListener(r[1], val);
      } else if (key === 'innerHTML'){
        el[key] = val;
      } else if (val !== false){
        el.setAttribute(key, val);
      }
    }

    if (children != null) {
      if (isArray(children)) {
        el.append(...children);
      } else {
        el.append(children);
      }
    }

    return el;
  };

  const animTime = 500;
  const animFunc = 'ease-in-out';
  window.slideYShow = function($node, ms = animTime) {
    var startingHeight = $node.offsetParent ?
      window.getComputedStyle($node).height : '0';
    $node.style.display = 'block';
    $node.style.height = 'auto';
    $node.style.paddingTop = '';
    $node.style.paddingBottom = '';
    $node.style.marginTop = '';
    $node.style.marginBottom = '';
    var height = window.getComputedStyle($node).height;
    var heightInt = parseInt(height, 10);
    $node.style.height = startingHeight;
    $node.style.paddingTop = '0';
    $node.style.paddingBottom = '0';
    $node.style.marginTop = '0';
    $node.style.marginBottom = '0';
    $node.style.overflow = 'hidden';
    if (heightInt > window.innerHeight) {
      ms *= heightInt / window.innerHeight;
    }
    $node.style.transition = `
      height ${ms}ms ${animFunc},
      padding ${ms}ms ${animFunc},
      margin ${ms}ms ${animFunc}
    `;
    setTimeout(function() {
      $node.style.height = height;
      $node.style.paddingTop = '';
      $node.style.paddingBottom = '';
      $node.style.marginTop = '';
      $node.style.marginBottom = '';
    });
  };

  window.slideYHide = function($node, ms = animTime) {
    $node.style.overflow = 'hidden';
    $node.style.position = 'relative';
    $node.style.paddingTop = '';
    $node.style.paddingBottom = '';
    $node.style.marginTop = '';
    $node.style.marginBottom = '';
    var height = window.getComputedStyle($node).height;
    var heightInt = parseInt(height, 10);
    $node.style.height = height;
    if (heightInt > window.innerHeight) {
      ms *= 1 + (((heightInt / window.innerHeight) - 1) / 2);
    }
    $node.style.transition = `
      height ${ms}ms ${animFunc},
      padding ${ms}ms ${animFunc},
      margin ${ms}ms ${animFunc}
    `;
    setTimeout(function() {
      $node.style.height = '0';
      $node.style.paddingTop = '0';
      $node.style.paddingBottom = '0';
      $node.style.marginTop = '0';
      $node.style.marginBottom = '0';
    });
  };

  window.slideXShow = function($node, ms = animTime) {
    $node.style.display = '';
    $node.style.width = '';
    $node.style.paddingLeft = '';
    $node.style.paddingRight = '';
    $node.style.marginLeft = '';
    $node.style.marginRight = '';
    var width = window.getComputedStyle($node).width;
    $node.style.width = '0';
    $node.style.paddingLeft = '0';
    $node.style.paddingRight = '0';
    $node.style.marginLeft = '0';
    $node.style.marginRight = '0';
    $node.style.transition = `
      width ${ms}ms ${animFunc},
      padding ${ms}ms ${animFunc},
      margin ${ms}ms ${animFunc}
    `;
    $node.style.overflow = 'hidden';
    $node.style.whiteSpace = 'nowrap';
    setTimeout(() => {
      $node.style.width = width;
      $node.style.paddingLeft = '';
      $node.style.paddingRight = '';
      $node.style.marginLeft = '';
      $node.style.marginRight = '';
    });
  };

  window.slideXHide = function($node, ms = animTime) {
    $node.style.width = window.getComputedStyle($node).width;
    $node.style.paddingLeft = '';
    $node.style.paddingRight = '';
    $node.style.marginLeft = '';
    $node.style.marginRight = '';
    $node.style.transition = `
      width ${ms}ms ${animFunc},
      padding ${ms}ms ${animFunc},
      margin ${ms}ms ${animFunc}
    `;
    $node.style.overflow = 'hidden';
    $node.style.whiteSpace = 'nowrap';
    setTimeout(() => {
      $node.style.width = '0';
      $node.style.paddingLeft = '0';
      $node.style.paddingRight = '0';
      $node.style.marginLeft = '0';
      $node.style.marginRight = '0';
      setTimeout(() => {
        $node.style.display = 'none';
      }, ms);
    });
  };

  window.showTR = function($tr) {
    $tr.style.display = '';
    for (let $td of $tr.children) {
      let $wrapper = $td.appendChild(h('', {
        style: 'display: none',
      }, $td.childNodes));
      window.slideYShow($wrapper);
      setTimeout(function() {
        $td.append(...$wrapper.childNodes);
        $wrapper.remove();
      }, animTime);
    }
  };

  window.hideTR = function($tr, callback) {
    var n = $tr.children.length;
    for (let $td of $tr.children) {
      let $wrapper = h('');
      $wrapper.append(...$td.childNodes);
      $td.append($wrapper);
      window.slideYHide($wrapper);
      setTimeout(function() {
        $tr.style.display = 'none';
        $td.append(...$wrapper.childNodes);
        $wrapper.remove();
        if (--n === 0) {
          $tr.style.display = 'none';
          if (callback) { callback(); }
        }
      }, animTime);
    }
  };

  window.flashClass = function($node, className, ms) {
    var timeoutID;
    return function() {
      $node.classList.add(className);
      clearTimeout(timeoutID);
      timeoutID = setTimeout(function() {
        $node.classList.remove(className);
      }, ms);
    };
  };

})(window);
