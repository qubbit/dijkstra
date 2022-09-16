// Kinda like jQuery but cuter

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
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;
  var ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  return ctx;
}

function fixCanvas() {
  var c = $.select('#canvas');
  setupCanvas(c);
}

fixCanvas();
