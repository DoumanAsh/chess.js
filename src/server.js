'use strict';
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, { pingTimeout: 20000 });
const GAMES = new (require("./games.js"))();
app.set('views', __dirname + '/../views');
app.set('view engine', 'pug');
app.use('/', express.static(__dirname + '/../static'));

/* Logging
 *
 * Set process.env.LOG = "true" */
const trace = require("./logger.js");

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

io.on('connection', function(socket) {
    trace("New user has connected(id=%s)", socket.id);
    /* Registers a new game.
     *
     * @param name Name of the party.
     * @param side The chess's side which is reserved for creator: white or black.
     * @param type The type of party: public, private, hotspot
     */
    socket.on("party_create", function(name, side, type) {
        trace("User(id=%s) request party_create(name=%s, side=%s, type=%s", socket.id, name, side, type);
        if (GAMES.create(name, type, side, socket)) {
            trace("User(id=%s) create_ok(name=%s, side=%s)", socket.id, name, side);
            socket.emit("create_ok", name, side);
        }
        else {
            trace("User(id=%s) create_fail", socket.id);
            socket.emit("create_fail");
        }
    });

    /* Handles user's request to join game.
     */
    socket.on("party_join", function(name, side) {
        trace("User(id=%s) request party_join(name=%s, side=%s)", socket.id, name, side);
        if (GAMES.add_user(name, side, socket)) {
            trace("User(id=%s) join_ok", socket.id);
            socket.emit("join_ok");
            GAMES.get_another_socket(name, side).emit("joined");
        }
        else {
            trace("User(id=%s) join_fail", socket.id);
            socket.emit("join_fail");
        }
    });

    socket.on("move", function(data) {
        var game_name = data.name;
        var move_side = GAMES.enum_side[data.side];
        trace("User(id=%s) sends move(data=%j)", socket.id, data);

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
        trace("User(id=%s) sends check(data=%j)", socket.id, data);

        GAMES.get_another_socket(game_name, checked_by)
             .emit("check");
    });

    socket.on("uncheck", function(data) {
        var game_name = data.name;
        var checked_by = GAMES.enum_side[data.side];
        trace("User(id=%s) sends uncheck(data=%j)", socket.id, data);

        GAMES.get_another_socket(game_name, checked_by)
             .emit("uncheck", data.old_pos);
    });

    socket.on("pawn_promo", function(data) {
        var game_name = data.name;
        var checked_by = GAMES.enum_side[data.side];
        trace("User(id=%s) sends pawn_promo(data=%j)", socket.id, data);

        GAMES.get_another_socket(game_name, checked_by)
             .emit("pawn_promo", data.new_piece, data.pos);
    });

    socket.on('sync_game', function(data) {
        trace("User(id=%s) sends sync_game(data=%j)", socket.id, data);
        GAMES.get_another_socket(data.name, GAMES.enum_side[data.side])
             .emit("sync_game", data.sync_data);
    });

    socket.on("en_passant", function(data) {
        trace("User(id=%s) sends en_passant(data=%j)", socket.id, data);
        GAMES.get_another_socket(data.name, GAMES.enum_side[data.side])
             .emit("en_passant", data.poor_pawn);
    });

    socket.on('disconnect', function() {
        trace("User(id=%s) disconnects", socket.id);
        if (socket.chess_name === undefined) return;

        GAMES.user_discon(socket.chess_name, socket.chess_side);
        var opponent_socket = GAMES.get_another_socket(socket.chess_name, socket.chess_side);

        if (opponent_socket) opponent_socket.emit("opponent_disconnect");
        else {
            /* Terminate game as sync requires at least 1 online */
            trace("User(id=%s) is last one. Delete game(%s)", socket.id, socket.chess_name);
            GAMES.del_game(socket.chess_name);
        }
    });
});

module.exports = http;
