"use script";
const util = require("util");

/* Class to hold games */
module.exports = class Games {
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
};
