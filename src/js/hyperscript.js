const isArray = (obj) => {
  return Array.isArray(obj) ||
    obj instanceof NodeList;
};

export default (selector, props = {}, children) => {
  if (props != null && (isArray(props) ||
    typeof props === 'string' ||
    props.tagName)) {
    children = props;
    props = {};
  }

  const attrs = {};
  const attrsRe = /\[([^\s=]+)=(?:"([^"]*)"|([^\]]*))\]/;
  let res;
  while ((res = attrsRe.exec(selector))) {
    attrs[res[1]] = res[2] || res[3];
    selector = selector.slice(0, res.index) +
      selector.slice(res.index + res[0].length);
  }

  const m = selector.split(/(\.|#)/);
  const tagName = m[0] === '.' || m[0] === '#' || m[0] === '' ?
    'div' : m[0];
  const el = document.createElement(tagName);
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
