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

wss.on('connection', function(ws) {
  console.log('connection accepted');

  ws.on('message', function(messageStr) {
    console.log('received message', messageStr);

    var msg = JSON.parse(messageStr);

    switch (msg.name) {
      case 'ping':
        sendMsg(ws, 'pong', {seqnum: msg.args.seqnum});
        break;

      default:
        console.log('unknown message');
        break;
    }
  });
});
