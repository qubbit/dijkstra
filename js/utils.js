// Kinda like jQuery but cuter

// Fixed logical drawing space for the canvas. Graph coordinates (nodes/edges,
// presets) live in this 800x600 space regardless of the canvas's rendered size,
// so the whole graph stays visible on any viewport — CSS scales the element
// down responsively (see #canvas: width:100%; aspect-ratio:4/3). 4:3 matches.
const LOGICAL_W = 800;
const LOGICAL_H = 600;

const creationAttributes = {
  class: 'className',
  text: 'innerText',
  html: 'innerHTML',
};

class $ {
  static create(tag, attrs = {}) {
    const element = document.createElement(tag);
    Object.entries(creationAttributes).forEach(([attribute, domAttribute]) => {
      if (attribute in attrs) {
        element[domAttribute] = attrs[attribute];
      }
    });
    return element;
  }

  static select(selector) {
    return document.querySelector(selector);
  }

  static on(selector, event, handler) {
    const element = $.select(selector);
    const boundHandler = handler.bind(element);
    element.addEventListener(event, boundHandler);
  }

  static async get(url) {
    const response = await fetch(url);
    return await response.text();
  }

  static async getJSON(url) {
    const response = await fetch(url);
    console.log(response);
    return await response.json();
  }
}

function WeakMap() {
  this.map = [];
  this.uid = 0;
}

WeakMap.prototype = {
  constructor: WeakMap,

  put: function (obj, value) {
    if (obj.uid) {
      this.map[obj.uid] = value;
    } else {
      obj.uid = this.uid;
      this.map[this.uid] = value;
    }

    this.uid++;
  },

  get: function (obj) {
    return this.map[obj.uid];
  },
};

// An ugly way to deep clone objects but it works for
// objects with primitive keys
function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function setupCanvas(canvas) {
  var pixelRatio = window.devicePixelRatio || 1;
  // Let CSS (width:100%; aspect-ratio) own the on-screen size — clear any inline
  // pixel size so the element scales responsively.
  canvas.style.width = '';
  canvas.style.height = '';
  // The drawing buffer is a FIXED logical space (LOGICAL_W x LOGICAL_H) times the
  // device pixel ratio for crispness. Because the buffer no longer depends on the
  // rendered width, the graph occupies the same coordinate space on every device
  // and is never clipped on narrow screens.
  canvas.width = Math.round(LOGICAL_W * pixelRatio);
  canvas.height = Math.round(LOGICAL_H * pixelRatio);
  var ctx = canvas.getContext('2d');
  // setTransform (not scale) so repeated fixCanvas() calls — e.g. on preset
  // change — reset the transform instead of compounding it.
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return ctx;
}

function fixCanvas() {
  var c = $.select('#canvas');
  setupCanvas(c);
}

fixCanvas();
