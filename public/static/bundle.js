(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/russ/Projects/music-for-no-instrument/browser/instruments/noisehit.js":[function(require,module,exports){
'use strict';

// slightly based on http://webaudioapi.com/samples/procedural/procedural-sample.js

/**
 * Creates a AudioBufferSourceNode containing a short, looping sample of white noise.
 */
function createWhiteNoiseBufferSource(ctx) {
  var samples = 16*1024;
  var buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  var data = buffer.getChannelData(0);

  for (var i = 0; i < samples; i++) {
    data[i] = ((Math.random() * 2) - 1);
  }

  var node = ctx.createBufferSource();
  node.buffer = buffer;
  node.loop = true;

  return node;
}

/**
 * Schedules a certain hard-coded envelope on a given AudioParam, starting at t0.
 */
function scheduleParameterEnvelope(t0, param) {
  param.linearRampToValueAtTime(0, t0);
  param.linearRampToValueAtTime(1, t0 + 0.001);
  param.linearRampToValueAtTime(0.3, t0 + 0.101);
  param.linearRampToValueAtTime(0, t0 + 0.500);
}

/**
 * Backend constructor
 */
function Backend(ctx) {
  // create nodes
  this.ctx = ctx;

  this.noiseNode = createWhiteNoiseBufferSource(ctx);
  this.noiseNode.start(0);

  this.volumeEnvNode = ctx.createGain();
  this.volumeEnvNode.gain.value = 0;

  // connect them up
  this.noiseNode.connect(this.volumeEnvNode);

  this.noiseNode.onended = function() {
    alert('ended');
  };
}

Backend.prototype.processInput = function(input) {
  // for now, no matter what input we get, we just play the same "note"
  scheduleParameterEnvelope(this.ctx.currentTime, this.volumeEnvNode.gain);
};

Backend.prototype.getOutputNode = function() {
  return this.volumeEnvNode;
}

module.exports = {
  createBackend: function(ctx) {
    return new Backend(ctx);
  },
}

},{}],"/Users/russ/Projects/music-for-no-instrument/browser/main.js":[function(require,module,exports){
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

},{"./instruments/noisehit.js":"/Users/russ/Projects/music-for-no-instrument/browser/instruments/noisehit.js"}]},{},["/Users/russ/Projects/music-for-no-instrument/browser/main.js"]);
