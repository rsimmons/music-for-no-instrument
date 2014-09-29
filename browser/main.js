'use strict';

var noisehit = require('./instruments/noisehit.js');
var synthnote = require('./instruments/synthnote.js');

var instrumentPlugins = {
  noisehit: noisehit,
  synthnote: synthnote
};

var qs = document.querySelector.bind(document);
var qsa = document.querySelectorAll.bind(document);

function addPressListener(elem, fn) {
  elem.addEventListener('mousedown', fn, false);
  elem.addEventListener('touchstart', fn, false);
}

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
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  });

  qs('#begin-button').addEventListener('click', function(e) {
    e.preventDefault();

    removeNode(qs('#begin-button'));
    hideElem(qs('#grey-overlay'));

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

    var welcomeReceived = false;
    var myPid;

    var players = {};

    ws.onopen = function(e) {
      console.log('connected');

      // send regular pings
      /*
      setInterval(function() {
        pingSentTimes[pingSeqnum] = Date.now();
        sendMsg(ws, 'ping', {seqnum: pingSeqnum});
        pingSeqnum++;
      }, 1000);
      */
    };

    function setPlayerInstrument(p, instName) {
      var oldBackend = players[p].instrumentBackend;

      // disconnect/remove any currently instantiated instrument backend
      if (oldBackend) {
        oldBackend.getOutputNode().disconnect();
        players[p].instrumentBackend = null;
      }

      if (instName) {
        // TODO: create backend
      }

      // if this message is about me, update/create my instrument frontend
      if (p === myPid) {
        var plugin = instrumentPlugins[instName];
        // TODO: create frontend
        // var frontend = plugin.createFrontend();
      }
    }

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

        case 'welcome':
          myPid = msg.args.yourPid;
          console.log('assigned pid', myPid);

          players[myPid] = {
            instrumentName: null,
            instrumentBackend: null
          }

          for (var p in msg.args.otherPlayers) {
            if (msg.args.otherPlayers.hasOwnProperty(p)) {
              players[p] = {
                instrumentName: null,
                instrumentBackend: null,
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
