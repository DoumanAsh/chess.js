"use strict";
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const PORT = 8080;

app.set('views', './views');
app.set('view engine', 'pug');
app.use('/', express.static(__dirname + '/static'));

app.get('/', function (req, res) {
    console.log(req.query);
    res.render("index");
});

app.get('/chess_board', function (req, res) {
    res.render("chess_board");
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
    res.status(404).render("404");
});

http.listen(PORT, function () {
    console.log('Start chess.js on port ' + PORT);
});
