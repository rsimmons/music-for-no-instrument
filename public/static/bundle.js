(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/russ/Projects/music-for-no-instrument/browser/instrumentUtil.js":[function(require,module,exports){
'use strict';

exports.addPressListener = function(elem, fn) {
  elem.addEventListener('mousedown', fn, false);
  elem.addEventListener('touchstart', fn, false);
}

},{}],"/Users/russ/Projects/music-for-no-instrument/browser/instruments/noisehit.js":[function(require,module,exports){
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
  param.cancelScheduledValues(t0);
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

  createFrontend: function(container, sendData) {
    container.innerHTML = '<div id="note-button" style="height:100px;border:1px solid green;line-height:100px;text-align:center">Noise Hit</div>';

    instrumentUtil.addPressListener(container.querySelector('#note-button'), function(e) {
      e.preventDefault();
      sendData();
    });
  }
}

},{}],"/Users/russ/Projects/music-for-no-instrument/browser/instruments/synthnote.js":[function(require,module,exports){
'use strict';

var instrumentUtil = require('../instrumentUtil.js');

/**
 * Schedules a certain hard-coded envelope on a given AudioParam, starting at t0.
 */
function scheduleParameterEnvelope(t0, param) {
  param.cancelScheduledValues(t0);
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

  this.oscNode = ctx.createOscillator();
  this.oscNode.type = 'square';
  this.oscNode.frequency.value = 100;
  this.oscNode.start(0);

  this.filterNode = ctx.createBiquadFilter();
  this.filterNode.type = 'lowpass';
  this.filterNode.frequency.value = 2000;
  this.filterNode.Q.value = 1;

  this.volumeEnvNode = ctx.createGain();
  this.volumeEnvNode.gain.value = 0;

  // connect them up
  this.oscNode.connect(this.filterNode);
  this.filterNode.connect(this.volumeEnvNode);
}

Backend.prototype.processInput = function(data, clockTime) {
  // for now, no matter what input we get, we just play the same "note"
  var ctxCur = this.ctx.currentTime;
  var t;
  if (clockTime > ctxCur) {
    console.log('comp: OK');
    t = clockTime;
  } else {
    console.log('comp: BEHIND');
    t = ctxCur;
  }
  // var t = (clockTime > ctxCur) ? clockTime : ctxCur;
  scheduleParameterEnvelope(t, this.volumeEnvNode.gain);
};

Backend.prototype.getOutputNode = function() {
  return this.volumeEnvNode;
}

module.exports = {
  createBackend: function(ctx) {
    return new Backend(ctx);
  },

  createFrontend: function(container, sendData) {
    container.innerHTML = '<div id="note-button" style="height:100px;border:1px solid green;line-height:100px;text-align:center">Synth Note</div>';

    instrumentUtil.addPressListener(container.querySelector('#note-button'), function(e) {
      e.preventDefault();
      sendData();
    });
  }
}

},{"../instrumentUtil.js":"/Users/russ/Projects/music-for-no-instrument/browser/instrumentUtil.js"}],"/Users/russ/Projects/music-for-no-instrument/browser/main.js":[function(require,module,exports){
'use strict';

var instrumentUtil = require('./instrumentUtil.js');

var noisehit = require('./instruments/noisehit.js');
var synthnote = require('./instruments/synthnote.js');

var instrumentPlugins = {
  noisehit: noisehit,
  synthnote: synthnote
};

var qs = document.querySelector.bind(document);
var qsa = document.querySelectorAll.bind(document);

function removeNode(n) {
  n.parentNode.removeChild(n);
}

function hideElem(elem) {
  elem.style.display = 'none';
}

function showElem(elem) {
  elem.style.display = null;
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
  // prevent scrolling
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  });

  var instUiContainer = qs('#inst-ui-container');
  var statusDisplay = qs('#status-display');

  qs('#begin-button').addEventListener('click', function(e) {
    e.preventDefault();

    removeNode(qs('#begin-button'));
    hideElem(qs('#grey-overlay'));

    // initialize audio context
    // NOTE: iOS will reject playing of sounds that happen before any user input, so this is necessary
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // play welcome sound
    var back = noisehit.createBackend(audioCtx);
    back.getOutputNode().connect(audioCtx.destination);
    back.processInput();

    var host = location.origin.replace(/^http/, 'ws');
    console.log('connecting to', host);
    var ws = new WebSocket(host);

    var pingSeqnum = 0;
    var pingSentTimes = {};

    // ring buffer of skew estimates from pings. a positive value means server clock is ahead of ours.
    var SKEW_BUFFER_SIZE = 32;
    var skewBuffer = [];
    var skewBufferPos = 0;
    var skewEstimate = 0;

    var FIXED_LATENCY_COMPENSATION = 0.100;

    var welcomeReceived = false;
    var myPid;

    var players = {};

    ws.onopen = function(e) {
      console.log('connected');

      // send regular pings
      setInterval(function() {
        pingSentTimes[pingSeqnum] = audioCtx.currentTime;
        sendMsg(ws, 'ping', {seqnum: pingSeqnum});
        pingSeqnum++;
      }, 1000);
    };

    function setPlayerInstrument(p, instName) {
      var oldBackend = players[p].instrumentBackend;

      // disconnect/remove any currently instantiated instrument backend
      if (oldBackend) {
        oldBackend.getOutputNode().disconnect();
        players[p].instrumentBackend = null;
      }

      // look up plugin of new instrument
      var plugin = null;
      if (instName) {
        plugin = instrumentPlugins[instName];
      }

      if (instName) {
        // create backend
        var backend = plugin.createBackend(audioCtx);

        // connect backend to audio output
        backend.getOutputNode().connect(audioCtx.destination);

        // store new backend reference
        players[p].instrumentBackend = backend;
      }

      // if this message is about me, update/create my instrument frontend
      if (p === myPid) {
        // remove old frontend UI
        instUiContainer.innerHTML = '';

        plugin.createFrontend(instUiContainer, function(data) {
          // send this data that came from instrument frontend to the instrument's backend (via server).
          // we timestamp the data with an estimate of the _server_ clock time at which it happened
          sendMsg(ws, 'myInstrumentData', {data: data, serverClock: audioCtx.currentTime + skewEstimate + FIXED_LATENCY_COMPENSATION});
        });
      }
    }

    ws.onmessage = function(e) {
      console.log('received message', e.data);
      var msg = JSON.parse(e.data);

      switch (msg.name) {
        case 'pong':
          var seqnum = msg.args.seqnum;
          var now = audioCtx.currentTime;
          var dt = now - pingSentTimes[seqnum];
          // console.log('latency is', dt, 'ms');
          statusDisplay.textContent = 'Latency: ' + Math.floor(1000*dt) + 'ms';

          // estimate current clock time on server to be what it sent us plus half of ping.
          // so skew is then (estimated) current server clock time minus our local AudioContext clock time
          var skew = (msg.args.serverClock + 0.5*dt) - now;

          if (skewBuffer.length < SKEW_BUFFER_SIZE) {
            skewBuffer.push(skew);
          } else {
            skewBuffer[skewBufferPos] = skew;
            skewBufferPos = (skewBufferPos + 1) % SKEW_BUFFER_SIZE;
          }

          var skewSum = 0;
          for (var i = 0; i < skewBuffer.length; i++) {
            skewSum += skewBuffer[i];
          }
          skewEstimate = skewSum/skewBuffer.length;

          delete pingSentTimes[seqnum];
          break;

        case 'welcome':
          myPid = msg.args.yourPid;
          console.log('was assigned pid', myPid);

          players[myPid] = {
            instrumentName: null,
            instrumentBackend: null
          }

          for (var p in msg.args.otherPlayers) {
            if (msg.args.otherPlayers.hasOwnProperty(p)) {
              players[p] = {
                instrumentName: null,
                instrumentBackend: null
              }

              // initialize the player's instrument
              setPlayerInstrument(p, msg.args.otherPlayers[p].instrumentName);
            }
          }

          // hardcode instrument selection for now
          sendMsg(ws, 'myInstrumentSelection', {instrumentName: 'synthnote'});

          welcomeReceived = true;
          break;

        case 'playerJoined':
          players[msg.args.pid] = {
            instrumentName: null,
            instrumentBackend: null,
          }
          break;

        case 'playerInstrumentChange':
          setPlayerInstrument(msg.args.pid, msg.args.instrumentName);
          break;

        case 'playerInstrumentData':
          players[msg.args.pid].instrumentBackend.processInput(msg.args.data, msg.args.serverClock - skewEstimate);
          break;

        case 'playerLeft':
          // disconnect/shutdown the player's instrument
          setPlayerInstrument(msg.args.pid, null);

          // remove player record
          delete players[msg.args.pid];

          break;

        default:
          console.log('unknown message');
          break;
      }
    };
  });
});

},{"./instrumentUtil.js":"/Users/russ/Projects/music-for-no-instrument/browser/instrumentUtil.js","./instruments/noisehit.js":"/Users/russ/Projects/music-for-no-instrument/browser/instruments/noisehit.js","./instruments/synthnote.js":"/Users/russ/Projects/music-for-no-instrument/browser/instruments/synthnote.js"}]},{},["/Users/russ/Projects/music-for-no-instrument/browser/main.js"]);
