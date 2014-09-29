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

    var welcomeReceived = false;
    var myPid;

    var players = {};

    ws.onopen = function(e) {
      console.log('connected');

      // send regular pings
      setInterval(function() {
        pingSentTimes[pingSeqnum] = Date.now();
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
          // send this data that came from instrument frontend to the instrument's backend (via server)
          sendMsg(ws, 'myInstrumentData', {data: data});
        });
      }
    }

    ws.onmessage = function(e) {
      console.log('received message', e.data);
      var msg = JSON.parse(e.data);

      switch (msg.name) {
        case 'pong':
          var seqnum = msg.args.seqnum;
          var dt = Date.now() - pingSentTimes[seqnum];
          // console.log('latency is', dt, 'ms');
          statusDisplay.textContent = 'Latency: ' + dt + 'ms';

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
          players[msg.args.pid].instrumentBackend.processInput(msg.args.data);
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
