var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const PORT = 8080;

app.set('views', './views');
app.set('view engine', 'pug');
app.use('/', express.static(__dirname + '/static'));

app.get('/', function (req, res) {
    res.render("index", {
        title: "hello word"
    });
});

http.listen(PORT, function () {
    console.log('Start chess.js on port ' + PORT);
});
