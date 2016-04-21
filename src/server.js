'use strict';
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.set('views', __dirname + '/../views');
app.set('view engine', 'pug');
app.use('/', express.static(__dirname + '/../static'));

/* There is only single page.
 *
 * Upon first entering user is prompted to create party.
 *
 * Finishing that user shall get url for invite
 * or, if chosen Hotspot, just starts playing.
 *
 * After another user has been connected initiate game. */
app.get('/', function (req, res) {
    var name, side;
    /* Example: <root>/?game=<name>&side=<side> */
    if (Object.keys(req.query).length) {
        if (GAMES.is_game(req.query.game) && "side" in req.query) {
            name = req.query.game;
            side = req.query.side;
        }
        else {
            res.status(404).render("404");
            return;
        }
    }

    res.status(200).render("index", {
        party_name: name,
        party_side: side
    });
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
    res.status(404).render("404");
});

const GAMES = new (require("./games.js"))();

io.on('connection', function(socket) {
    /* Registers a new game.
     *
     * @param name Name of the party.
     * @param side The chess's side which is reserved for creator: white or black.
     * @param type The type of party: public, private, hotspot
     */
    socket.on("party_create", function(name, side, type) {
        if (GAMES.create(name, type, side, socket)) {
            socket.emit("create_ok", name, side);
        }
        else {
            socket.emit("create_fail");
        }
    });

    /* Handles user's request to join game.
     */
    socket.on("party_join", function(name, side) {
        if (GAMES.add_user(name, side, socket)) {
            socket.emit("join_ok");
            GAMES.get_another_socket(name, side).emit("joined");
        }
        else {
            /* There is some buggy race  condition when you refresh page
             * So check if there is double request from the same socket.
             * TODO: Get rid of this double connect */
            if (socket.chess_side !== side) socket.emit("join_fail");
        }
    });

    socket.on("move", function(data) {
        var game_name = data.name;
        var move_side = GAMES.enum_side[data.side];

        GAMES.get_another_socket(game_name, move_side)
             .emit("move", {
                 side: data.side,
                 old_pos: data.old_pos,
                 new_pos: data.new_pos,
                 finished: data.finished
             });
    });

    socket.on("check", function(data) {
        var game_name = data.name;
        var checked_by = GAMES.enum_side[data.side];

        GAMES.get_another_socket(game_name, checked_by)
             .emit("check");
    });

    socket.on("uncheck", function(data) {
        var game_name = data.name;
        var checked_by = GAMES.enum_side[data.side];

        GAMES.get_another_socket(game_name, checked_by)
             .emit("uncheck", data.old_pos);
    });

    socket.on("pawn_promo", function(data) {
        var game_name = data.name;
        var checked_by = GAMES.enum_side[data.side];

        GAMES.get_another_socket(game_name, checked_by)
             .emit("pawn_promo", data.new_piece, data.pos);
    });

    socket.on('sync_game', function(data) {
        GAMES.get_another_socket(data.name, GAMES.enum_side[data.side])
             .emit("sync_game", data.sync_data);
    });

    socket.on("en_passant", function(data) {
        GAMES.get_another_socket(data.name, GAMES.enum_side[data.side])
             .emit("en_passant", data.poor_pawn);
    });

    socket.on('disconnect', function() {
        if (socket.chess_name === undefined) return;

        GAMES.user_discon(socket.chess_name, socket.chess_side);
        var opponent_socket = GAMES.get_another_socket(socket.chess_name, socket.chess_side);

        if (opponent_socket) opponent_socket.emit("opponent_disconnect");
        else {
            /* Terminate game as sync requires at least 1 online */
            GAMES.del_game(socket.chess_name);
        }
    });
});

module.exports = http;
