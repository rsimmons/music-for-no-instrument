'use strict';

var noisehit = require('./instruments/noisehit.js');

var qs = document.querySelector.bind(document);
var qsa = document.querySelectorAll.bind(document);

function addPressListener(elem, fn) {
  elem.addEventListener('mousedown', fn, false);
  elem.addEventListener('touchstart', fn, false);
}

function removeNode(n) {
  n.parentNode.removeChild(n);
}

window.onerror = function(error) {
    alert(error);
};

function sendMsg(ws, name, args) {
  ws.send(JSON.stringify({
    name: name,
    args: args
  }));
}

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  });

  qs('#begin-button').addEventListener('click', function(e) {
    e.preventDefault();

    removeNode(qs('#begin-overlay'));

    // initialize audio context
    // NOTE: iOS will reject playing of sounds that happen before any user input, so this is necessary
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    var noiseBackend = noisehit.createBackend(audioCtx);
    noiseBackend.getOutputNode().connect(audioCtx.destination);

    addPressListener(qs('#play-button'), function(e) {
      e.preventDefault();
      noiseBackend.processInput();
    });
 });

/*
  //var host = location.origin.replace(/^http/, 'ws');
  var host = 'ws://10.0.1.11:6970';
  var ws = new WebSocket(host);

  ws.onopen = function(e) {
    console.log('connected');
    setInterval(function() {
      sendMsg(ws, 'ping', {});
    }, 1000);
  };

  ws.onmessage = function(e) {
    console.log(e.data);
  };
*/
});
