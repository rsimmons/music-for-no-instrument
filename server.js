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

wss.on('connection', function(ws) {
    console.log('connection');
    ws.on('message', function(message) {
        console.log('received', message);
    });
});
