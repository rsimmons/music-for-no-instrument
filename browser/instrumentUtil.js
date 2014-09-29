'use strict';

exports.addPressListener = function(elem, fn) {
  elem.addEventListener('mousedown', fn, false);
  elem.addEventListener('touchstart', fn, false);
}
