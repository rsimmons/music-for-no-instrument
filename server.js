"use strict";

var WebSocket = require('ws');
var http = require('http');
var express = require('express');

var app = express();
var port = process.env.PORT;

app.use(express.static(__dirname + '/public'));

var server = http.createServer(app);
server.listen(port);

console.log('Listening on port', port);

var wss = new WebSocket.Server({server: server});

function sendMsg(ws, name, args) {
  ws.send(JSON.stringify({
    name: name,
    args: args
  }));
}

function randHex16bits() {
  // returns string of 4 random hex digits (lowercase). from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function randHex64bits() {
  return randHex16bits() + randHex16bits() + randHex16bits() + randHex16bits();
}

// keyed by player id (pid)
var players = {};

wss.on('connection', function(ws) {
  console.log('connection accepted');

  var pid = randHex64bits();
  console.log('assigned pid', pid);

  // send player a welcome message
  var otherPlayersInfo = {};
  for (var otherPid in players) {
    if (players.hasOwnProperty(otherPid)) {
      otherPlayersInfo[otherPid] = {
        instrument: players[otherPid].instrument
      }
    }
  }
  sendMsg(ws, 'welcome', {yourPid: pid, otherPlayers: otherPlayersInfo});

  // tell other players that a new one has joined
  for (var otherPid in players) {
    if (players.hasOwnProperty(otherPid)) {
      sendMsg(players[otherPid].ws, 'playerJoined', {pid: pid});
    }
  }

  // add player
  players[pid] = {
    ws: ws,
    instrumentName: null
  };

  ws.on('message', function(messageStr) {
    console.log('received message', messageStr);

    var msg = JSON.parse(messageStr);

    switch (msg.name) {
      case 'ping':
        sendMsg(ws, 'pong', {seqnum: msg.args.seqnum});
        break;

      case 'myInstrumentSelection':
        // register instrument selection
        players[pid].instrument = msg.args.name;

        // let all players (including this one) know about instrument change
        for (var p in players) {
          if (players.hasOwnProperty(p)) {
            sendMsg(players[p].ws, 'playerInstrumentChange', {pid: pid, instrumentName: msg.args.instrumentName});
          }
        }
        break;

      default:
        console.log('unknown message');
        break;
    }
  });

  ws.on('close', function() {
    delete players[pid];

    // let other players know that this one has left
    for (var otherPid in players) {
      if (players.hasOwnProperty(otherPid)) {
        sendMsg(players[otherPid].ws, 'playerLeft', {pid: pid});
      }
    }
  });
});
