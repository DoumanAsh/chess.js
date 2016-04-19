"use strict";
const util = require('util');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = 8080;

app.set('views', './views');
app.set('view engine', 'pug');
app.use('/', express.static(__dirname + '/static'));

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

    res.render("index", {
        party_name: name,
        party_side: side
    });
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
    res.status(404).render("404");
});

class Games {
    constructor() {
        this.inner = {};

        this.enum_side = {
            7: "black",
            2: "white"
        };

        /* Opposite side map.
         * Returns the name of opposite's side. */
        this.op_side_map = {
            white: "black",
            black: "white"
        };
    }

    /* Creates game upon user request.
     *
     * @return true On success.
     *         false If game with such name exists. */
    create(name, type, side, socket) {
        if (name in this.inner) return false;

        this.inner[name] = { type: type };
        this.inner[name][side] = socket;
        socket.chess_name = name;
        socket.chess_side = side;
        return true;
    }

    /* Adds user to existing game. */
    add_user(name, side, socket) {
        if (!this.is_game(name) || !this.is_side_free(name, side)) return false;

        this.inner[name][side] = socket;
        socket.chess_name = name;
        socket.chess_side = side;
        return true;
    }

    /* Tests if game exists */
    is_game(name) {
        return name in this.inner;
    }

    /* Tests if side is free for user to join */
    is_side_free(name, side) {
        if (!(side in this.inner[name])) return true;

        return this.inner[name][side] === undefined;
    }

    /* Handle user disconnect */
    user_discon(name, side) {
        this.inner[name][side] = undefined;
    }

    del_game(name) {
        delete this.inner[name];
    }

    /* Gets game if any. */
    get_game(name) {
        return this.inner[name];
    }

    /* Gets socket of another's side */
    get_another_socket(name, cur_side) {
        if (!this.is_game(name)) {
            throw util.format("get_another_socket(name=%s, cur_side=%s): No such game",
                              name, cur_side);
        }

        return this.inner[name][this.op_side_map[cur_side]];
    }
}

const GAMES = new Games();

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

http.listen(PORT, function () {
    console.log('Start chess.js on port ' + PORT);
});
