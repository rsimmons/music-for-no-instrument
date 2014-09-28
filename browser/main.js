'use strict';

var noisehit = require('./instruments/noisehit.js');
var synthnote = require('./instruments/synthnote.js');

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

    // var inst = noisehit.createBackend(audioCtx);
    var inst = synthnote.createBackend(audioCtx);
    inst.getOutputNode().connect(audioCtx.destination);

    addPressListener(qs('#play-button'), function(e) {
      e.preventDefault();
      inst.processInput();
    });

    var host = location.origin.replace(/^http/, 'ws');
    console.log(host);
    var ws = new WebSocket(host);

    var pingSeqnum = 0;
    var pingSentTimes = {};

    ws.onopen = function(e) {
      console.log('connected');
      setInterval(function() {
        pingSentTimes[pingSeqnum] = Date.now();
        sendMsg(ws, 'ping', {seqnum: pingSeqnum});
        pingSeqnum++;
      }, 1000);
    };

    ws.onmessage = function(e) {
      console.log('received message', e.data);
      var msg = JSON.parse(e.data);

      switch (msg.name) {
        case 'pong':
          var seqnum = msg.args.seqnum;
          var dt = Date.now() - pingSentTimes[seqnum];
          console.log('latency is', dt, 'ms');
          delete pingSentTimes[seqnum];
          break;

        default:
          console.log('unknown message');
          break;
      }
    };
  });
});
