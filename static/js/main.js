'use strict';
var PIECES = {
    none: 0,
    pawn: 1,
    knight: 2,
    bishop: 3,
    rook: 4,
    queen: 5,
    king: 6
};
var TEAM = {
    none: 0,
    black: 7,
    white: 2,
};

var BOARD;
var PLAYER_TEAM = TEAM.none;
var SOCKET = io();

/**
 * Column/letter decrease by one
 */
function col_decrease(col, times) {
    var map = {
        a: undefined,
        b: "a",
        c: "b",
        d: "c",
        e: "d",
        f: "e",
        g: "f",
        h: "g"
    };

    if (times) {
        for (var i = 0; i < times; i++) {
            col = map[col];
        }
        return col;
    }
    else {
        return map[col];
    }
}

/**
 * Column/letter increase by one
 */
function col_increase(col, times) {
    var map = {
        a: "b",
        b: "c",
        c: "d",
        d: "e",
        e: "f",
        f: "g",
        g: "h",
        h: undefined
    };

    if (times) {
        for (var i = 0; i < times; i++) {
            col = map[col];
        }
        return col;
    }
    else {
        return map[col];
    }
}

/**
 * Chess board click callback.
 */
function click() {
    if (BOARD.turn !== PLAYER_TEAM) return;

    if (BOARD.selected) {
        selected_click(this.id);
    }
    else {
        not_selected_click(this.id);
    }

}

/**
 * Chess board click handler when figure has been selected.
 */
function selected_click(id) {
    var block = BOARD[id];

    if (block.team === PLAYER_TEAM) {
        BOARD.unselect();
        BOARD.select(id);
        return;
    }

    var move_to = BOARD.selected_move_area.indexOf(id);

    if (move_to !== -1) {
        BOARD.move(BOARD.selected_move_area[move_to]);
    }
}

/**
 * Chess board click handler when figure has NOT been selected.
 */
function not_selected_click(id) {
    var block = BOARD[id];

    if ((block.piece === PIECES.none) || !block.team || (PLAYER_TEAM !== block.team)) {
        return;
    }

    BOARD.select(id);
}

/**
 * Chess board class
 */
function ChessBoard() {
    /**
     * Function iterator over board.
     * Requires functor: func(me: reference to board, id: "<col><row>")
     */
    this.iterate = function(functor) {
        ["a", "b", "c", "d", "e", "f", "g", "h"].forEach(function(col) {
            for (var i = 1; i < 9; i++) functor(this, col+i);
        }, this);
    };

    this.name = undefined;
    this.side = undefined; /* text representation of team */
    this.turn = TEAM.white;
    this.selected = undefined;
    this.selected_move_area = [];
    this.king_pos = undefined;
    this.king_moved = false;
    this.h_rook_moved = false;
    this.a_rook_moved = false;
    this.king_checked = false;
    this.en_passant_to = undefined;

    this.set_name = function(name) {
        this.name = name;
        document.getElementById("party_name").innerHTML = decodeURIComponent(name);
    };

    //Initialize board
    this.iterate(function(me, id) {
        me[id] = {
            div: document.getElementById(id),
            team: TEAM.none,
            piece: PIECES.none
        };
        me[id].div.onclick=click;
    });

    /**
     * Ends current turn.
     */
    this.turn_end = function() {
        if (BOARD.turn === TEAM.white) {
            BOARD.turn = TEAM.black;
            document.getElementById("menu_turn").innerHTML = "BLACK";
        }
        else if (BOARD.turn === TEAM.black) {
            BOARD.turn = TEAM.white;
            document.getElementById("menu_turn").innerHTML = "WHITE";
        }
    };

    /**
     * Resets element/board to initial values(empty).
     *
     * @param id Specify if only specific element requires reset. Optional
     */
    this.reset = function(id) {
        if (id) {
            var block = this[id];
            block.team = TEAM.none;
            block.piece = PIECES.none;
            block.div.className = block.div.className
                                           .replace(/((black)|(white))_[^ ]+/, "")
                                           .replace("selected", "");
        }
        else {
            this.iterate(function(me, id) {
                me.reset(id);
            });
        }
    };

    /* Fires sync event with board's data */
    this.sync_game = function(socket) {
        var data = {
            name: this.name,
            side: PLAYER_TEAM,
            sync_data: {
                turn: this.turn,
                board: {}
            }
        };

        ["a", "b", "c", "d", "e", "f", "g", "h"].forEach(function(col) {
            var pos;
            for (var idx = 1; idx < 9; idx++) {
                pos = col + idx;

                data.sync_data.board[pos] = {};
                data.sync_data.board[pos].team = this[pos].team;
                data.sync_data.board[pos].piece = this[pos].piece;
            }
        }, this);

        socket.emit("sync_game", data);
    };

    /* Sets board element with data into position */
    this.set_board_elem = function(position, data) {
        var element = this[position];
        var team_str;

        if (data.team === TEAM.black) team_str = " black";
        else if (data.team === TEAM.white) team_str = " white";

        element.team = data.team;
        element.piece = data.piece;

        switch (data.piece) {
            case PIECES.pawn:
                element.div.className += team_str + "_pawn";
                break;
            case PIECES.rook:
                element.div.className += team_str + "_rook";
                break;
            case PIECES.knight:
                element.div.className += team_str + "_knight";
                break;
            case PIECES.bishop:
                element.div.className += team_str + "_bishop";
                break;
            case PIECES.queen:
                element.div.className += team_str + "_queen";
                break;
            case PIECES.king:
                this.king_pos = position;
                element.div.className += team_str + "_king";
                break;
        }
    };

    /* Restores board from sync data */
    this.read_sync = function(data) {
        this.reset();

        this.turn = data.turn;
        if (this.turn === TEAM.white) document.getElementById("menu_turn").innerHTML = "WHITE";
        else if (this.turn === TEAM.black) document.getElementById("menu_turn").innerHTML = "BLACK";

        ["a", "b", "c", "d", "e", "f", "g", "h"].forEach(function(col) {
            var pos;
            for (var idx = 1; idx < 9; idx++) {
                pos = col + idx;
                this.set_board_elem(pos, data.board[pos]);
            }
        }, this);

        if (this.is_me_check()) this.me_checked();
    };

    /**
     * Selects element on board.
     *
     * @param id Id of board's element.
     */
    this.select = function(id) {
        var block = BOARD[id];
        block.div.className += " selected";
        this.selected = id;
        this.set_avail_area();
    };

    /**
     * Unselect currently selected element.
     */
    this.unselect = function() {
        if (this.selected) {
            this.selected = undefined;
            this.selected_move_area.length = 0;
            this.iterate(function(me, id) {
                var block = me[id].div;
                block.className = block.className.replace("selected", "");
            });
        }
    };

    /**
     * Check if enemy king has been checked after move.
     *
     * @param moved_to Location where piece has moved.
     */
    this.is_enemy_check = function(moved_to) {
        var move_area = this.get_avail_area(moved_to);
        for (var idx = 0; idx < move_area.length; idx++) {
            var block = BOARD[move_area[idx]];
            if (block.piece === PIECES.king && block.team !== PLAYER_TEAM) {
                block.div.className = block.div.className + " checked";
                SOCKET.emit("check", {
                    name: this.name,
                    side: PLAYER_TEAM,
                });
                break;
            }
        }
    };

    this.pawn_promo = function(new_piece, position) {
        var pos = this[position];
        var figure_map = {};
        figure_map[PIECES.queen] = "queen";
        figure_map[PIECES.rook] = "rook";
        figure_map[PIECES.bishop] = "bishop";
        figure_map[PIECES.knight] = "knight";

        pos.piece = new_piece;
        pos.div.className = pos.div.className.replace(/_[^]+/, "_" + figure_map[new_piece]);
    };

    /**
     * Check if pawn's promotion is needed.
     */
    this.is_pawn_promo = function(pos) {
        var move_to = pos.div.id;
        if ((pos.team === TEAM.black && move_to[1] === "1") ||
            (pos.team === TEAM.white && move_to[1] === "8")) {

            var promo_select = document.getElementById("pawn_promo");
            var figure_name = promo_select.options[promo_select.selectedIndex].value;
            var figure_map = {
                Queen: PIECES.queen,
                Rook: PIECES.rook,
                Bishop: PIECES.bishop,
                Knight: PIECES.knight
            };

            pos.piece = figure_map[figure_name];
            pos.div.className = pos.div.className.replace(/_[^]+/, "_" + figure_name.toLowerCase());

            SOCKET.emit("pawn_promo", {
                name: this.name,
                side: PLAYER_TEAM,
                new_piece: pos.piece,
                pos: move_to
            });
        }
    };

    /**
     * @brief Gets movement area of enemy.
     *
     * Emulates set by using object's keys.
     */
    this.get_enemy_avail_area = function() {
        var set_enemy_moves = {};
        ["a", "b", "c", "d", "e", "f", "g", "h"].forEach(function(col) {
            for (var i = 1; i < 9; i++) {
                var enemy_pos = col+i;

                if (this[enemy_pos].team === TEAM.none ||
                    this[enemy_pos].team === PLAYER_TEAM) continue;

                var old_team = PLAYER_TEAM;
                /* Avoid castling calculation for enemy king */
                var old_king_moved = this.king_moved;
                this.king_moved = true;

                if (PLAYER_TEAM === TEAM.black) PLAYER_TEAM = TEAM.white;
                else PLAYER_TEAM = TEAM.black;

                var enemy_area = this.get_avail_area(enemy_pos, true);
                for (var enemy_idx = 0; enemy_idx < enemy_area.length; enemy_idx++) {
                    set_enemy_moves[enemy_area[enemy_idx]] = true;
                }

                PLAYER_TEAM = old_team;
                this.king_moved = old_king_moved;
            }
        }, this);

        return set_enemy_moves;
    };

    /**
     * Checks own king upon event from server.
     */
    this.me_checked = function() {
        this.king_checked = true;
        this[this.king_pos].div.className = this[this.king_pos].div.className + " checked";
    };

    /**
     * Uncheck own king.
     */
    this.me_uncheck = function(old_pos) {
        this.king_checked = false;

        this[this.king_pos].div.className = this[this.king_pos].div.className.replace(/ checked/, "");
        if (old_pos) this[old_pos].div.className = this[old_pos].div.className.replace(/ checked/, "");

        SOCKET.emit("uncheck", { name: this.name, side: PLAYER_TEAM, old_pos: old_pos });
    };

    /**
     * Checks if player's king got exposed to enemy.
     *
     * @return Bool.
     */
    this.is_me_check = function() {
        return this.king_pos in this.get_enemy_avail_area();
    };

    /**
     * Checks if castling possibility is lost
     */
    this.is_castling_lost = function(pos) {
        if (pos.piece === PIECES.king) {
            this.king_moved = true;

            var pos_id = pos.div.id;
            var num;
            if (PLAYER_TEAM === TEAM.black) num = "8";
            else num = "1";

            if (pos_id[1] === num) {
                var old_selected = this.selected;
                //move rook according castling
                if (!this.h_rook_moved && pos_id[0] === "g") {
                    this.selected = "h" + num;
                    this.move(col_decrease(this.king_pos[0]) + num, false);

                    this.selected = old_selected;
                }
                else if (!this.a_rook_moved && pos_id[0] === "c") {
                    this.selected = "a" + num;
                    this.move(col_increase(this.king_pos[0]) + num, false);

                    this.selected = old_selected;
                }
            }

        }
        else if (pos.piece === PIECES.rook) {
            if (this.selected[0] === "h") this.h_rook_moved = true;
            else if (this.selected[0] === "a") this.a_rook_moved = true;

            this.king_moved = this.h_rook_moved && this.a_rook_moved;
        }

        if (this.king_moved) {
            this.get_avail_castling_king = function() {
                return [];
            };
            this.is_castling_lost = function() {
                return undefined;
            };
        }
    };

    /**
     * Handles En passant move.
     */
    this.is_move_en_passant = function(to) {
        if (to === this.en_passant_to) {
            var passanted_pawn_pos = to[0];

            if (PLAYER_TEAM === TEAM.white) passanted_pawn_pos += "5";
            else passanted_pawn_pos += "4";

            SOCKET.emit("en_passant", {
                name: this.name,
                side: PLAYER_TEAM,
                poor_pawn: passanted_pawn_pos
            });

            this.reset(passanted_pawn_pos);
        }

        this.en_passant_to = undefined;
    };

    /**
     * Checks if it is possible to perform En passant.
     */
    this.is_en_passant = function(pos) {
        return this.en_passant_to && pos && (this[pos].team === TEAM.none && pos === this.en_passant_to);
    };

    /**
     * Set if En passant is possible for moved pawn.
     */
    this.en_passant = function(from, to) {
        if (PLAYER_TEAM === TEAM.white && from[1] === "7" && to[1] === "5") {
            this.en_passant_to = from[0] + "6";
        }
        else if (PLAYER_TEAM === TEAM.black && from[1] === "2" && to[1] === "4") {
            this.en_passant_to = from[0] + "3";
        }
    };

    /**
     * Performs enemy move.
     */
    this.enemy_move = function(from, to) {
        var old_pos = this[from];
        var new_pos = this[to];

        new_pos.team = old_pos.team;
        new_pos.piece = old_pos.piece;
        new_pos.div.className = new_pos.div.className.replace(/((black)|(white))_[^ ]+/, "") + " " + old_pos.div.className.split(/\s+/)[1];

        if (new_pos.piece === PIECES.pawn) this.en_passant(from, to);

        this.reset(from);
    };

    /**
     * @brief Moves piece to new location.
     *
     * Clear selection and checks for enemy king being checked
     * by this move.
     * Cancel move if own king is under threat.
     *
     * @param to New location.
     * @param finished Last move(in case of castling).
     */
    this.move = function(to, finished) {
        if (finished === undefined) finished = true;

        var old_pos = this[this.selected];
        var new_pos = this[to];

        if (old_pos.piece === PIECES.king) this.king_pos = to;

        if (this.is_me_check()) {
            if (old_pos.piece === PIECES.king) this.king_pos = this.selected;
            return;
        }
        else if (this.king_checked) {
            this.me_uncheck(this.selected);
        }

        new_pos.team = old_pos.team;
        new_pos.piece = old_pos.piece;
        new_pos.div.className = new_pos.div.className.replace(/((black)|(white))_[^ ]+/, "") + " " + old_pos.div.className.split(/\s+/)[1];

        SOCKET.emit("move", {
            name: this.name,
            side: PLAYER_TEAM,
            old_pos: this.selected,
            new_pos: to,
            finished: finished
        });

        if (new_pos.piece === PIECES.pawn) {
            this.is_move_en_passant(to);
            this.is_pawn_promo(new_pos);
        }
        this.en_passant_to = undefined;
        this.is_castling_lost(new_pos);

        this.is_enemy_check(to);

        if (finished) this.turn_end();

        this.reset(this.selected);
        this.selected = undefined;
    };

    /**
     * Store available area for move of currently selected piece.
     */
    this.set_avail_area = function() {
        this.selected_move_area = this.get_avail_area();
    };

    /**
     * Checks if location on board belongs to enemy team.
     */
    this.is_enemy_team = function(loc) {
        return Math.abs(this[loc].team - PLAYER_TEAM) === 5;
    };

    /**
     * Returns array of possible moves for pawn.
     *
     * @param eat Flag for special handling of king's check.
     */
    this.get_avail_area_pawn = function(col, row, cur, eat) {
        var result = [];
        var new_row;

        if (cur.team === TEAM.white) {
            new_row = row + 1;
        }
        else {
            new_row = row - 1;
        }

        var move = col + new_row;
        var eat_left = col_decrease(col) + new_row;
        var eat_right = col_increase(col) + new_row;

        //Check if can eat
        if (eat_left && (this.is_enemy_team(eat_left)) || this.is_en_passant(eat_left)) {
            result.push(eat_left);
        }

        if (eat_right && this.is_enemy_team(eat_right) || this.is_en_passant(eat_right)) {
            result.push(eat_right);
        }

        if (eat) return result;

        if (this[move].team === TEAM.none) {
            result.push(move);
            //First move can be for 2 cells
            //See TEAM enum for logic
            if ((cur.team - row) === 0) {
                if (cur.team === TEAM.white) {
                    move = col + (row + 2);
                }
                else {
                    move = col + (row - 2);
                }

                if (this[move].team === TEAM.none) result.push(move);
            }
        }

        return result;
    };

    /**
     * Returns array of possible moves for knight.
     */
    this.get_avail_area_knight = function(col, row) {
        var result = [];

        var moves = [
            [col_decrease(col, 2), [row+1, row-1]],
            [col_decrease(col), [row+2, row-2]],
            [col_increase(col), [row+2, row-2]],
            [col_increase(col, 2), [row+1, row-1]]
        ].filter(function(elem) { return elem[0]; });

        for (var idx = 0; idx < moves.length; idx++) {
            var new_col = moves[idx][0];
            var new_rows = moves[idx][1];

            for (var jdx = 0; jdx < new_rows.length; jdx++) {
                if (new_rows[jdx] > 0 && new_rows[jdx] < 9) {
                    var new_move = new_col + new_rows[jdx];
                    if (this[new_move] !== PLAYER_TEAM) result.push(new_move);
                }
            }
        }

        return result;
    };

    /**
     * Checks if it is possible to move in loops
     *
     * @returns [is_break; is_to_add]
     */
    this.board_is_move_ok = function(move) {
        var result = [false, false];
        if (this[move].team === TEAM.none) {
            result[1] = true;
        }
        else if (this.is_enemy_team(move)) {
            result[1] = true;
            result[0] = true;
        }
        else {
            result[0] = true;
        }

        return result;
    };

    /**
     * Returns array of possible moves for bishop.
     */
    this.get_avail_area_bishop = function(col, row) {
        var result = [];

        var move, move_check;
        var idx = row - 1;
        var col_idx = col_decrease(col);
        for (;
            idx > 0 && col_idx !== undefined;
            col_idx = col_decrease(col_idx)) {

            move = col_idx + idx;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;

            idx--;
        }

        idx = row + 1;
        col_idx = col_decrease(col);
        for (;
            idx < 9 && col_idx !== undefined;
            col_idx = col_decrease(col_idx)) {

            move = col_idx + idx;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;

            idx++;
        }

        idx = row - 1;
        col_idx = col_increase(col);
        for (;
            idx > 0 && col_idx !== undefined;
            col_idx = col_increase(col_idx)) {

            move = col_idx + idx;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;

            idx--;
        }

        idx = row + 1;
        col_idx = col_increase(col);
        for (;
            idx < 9 && col_idx !== undefined;
            col_idx = col_increase(col_idx)) {

            move = col_idx + idx;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;

            idx++;
        }

        return result;

    };

    /**
     * Returns array of possible moves for rook.
     */
    this.get_avail_area_rook = function(col, row) {
        var result = [];
        var move, move_check;

        for (var idx_down = row - 1; idx_down > 0; idx_down--) {
            move = col + idx_down;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;
        }

        for (var idx_up = row + 1; idx_up < 9; idx_up++) {
            move = col + idx_up;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;
        }

        for (var col_left = col_decrease(col); col_left !== undefined; col_left = col_decrease(col_left)) {
            move = col_left + row;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;
        }

        for (var col_right = col_increase(col); col_right !== undefined; col_right = col_increase(col_right)) {
            move = col_right + row;
            move_check = this.board_is_move_ok(move);

            if (move_check[1]) result.push(move);
            if (move_check[0]) break;
        }

        return result;
    };

    /**
     * @brief Returns array of possible castling moves for king.
     *
     * Overridden when castling is no longer possible.
     */
    this.get_avail_castling_king = function() {
        var result = [];

        if (this.king_moved) return result;
        if (this.h_rook_moved && this.a_rook_moved) return result;

        var num;
        if (PLAYER_TEAM === TEAM.black) num = "8";
        else num = "1";

        var h_pos = this["h" + num];
        var a_pos = this["a" + num];
        var set_enemy_moves = this.get_enemy_avail_area();
        function is_empty(pos) {
            return this[pos].team === TEAM.none;
        }

        function is_can_castle(pos) {
            return !(pos in set_enemy_moves);
        }

        if (!this.h_rook_moved && h_pos.team === PLAYER_TEAM && h_pos.piece === PIECES.rook) {
            var move_h = ["f" + num, "g" + num];
            if (move_h.every(is_empty, this) && move_h.every(is_can_castle, this)) {
                result.push("g" + num);
            }
        }

        if (!this.a_rook_moved && a_pos.team === PLAYER_TEAM && a_pos.piece === PIECES.rook) {
            var move_a = ["d" + num, "c" + num, "b" + num];
            if (move_a.every(is_empty, this) && move_a.slice(0, 2).every(is_can_castle, this)) {
                result.push("c" + num);
            }
        }

        return result;
    };

    /**
     * Returns array of possible moves for king.
     */
    this.get_avail_area_king = function(col, row) {
        var col_left = col_decrease(col);
        var col_right = col_increase(col);
        var row_up = row + 1;
        var row_down = row - 1;
        var possible_moves = [[col_left, row_up], [col, row_up], [col_right, row_up],
                              [col_left, row], [col_right, row],
                              [col_left, row_down], [col, row_down], [col_right, row_down]];

        return possible_moves.filter(function(val) {
            var col = val[0];
            var row = val[1];

            if (col === undefined || row < 1 || row > 8) return false;

            return this.board_is_move_ok(col+row)[1];
        }, this).map(function(val) {
            return val[0] + val[1];
        });
    };

    /**
     * Returns array of possible moves of currently selected piece.
     *
     * @param pos Piece location.
     * @param eat Flag for pawn to get eat-only moves.
     *
     * @return List of possible moves.
     */
    this.get_avail_area = function(pos, eat) {
        var result = [];
        if (!pos) {
            pos = this.selected;
        }
        var col = pos[0];
        var row = parseInt(pos[1]);
        var cur = this[pos];

        switch (cur.piece) {
            case PIECES.pawn:
                result = this.get_avail_area_pawn(col, row, cur, eat);
                break;
            case PIECES.knight:
                result = this.get_avail_area_knight(col, row);
                break;
            case PIECES.bishop:
                result = this.get_avail_area_bishop(col, row);
                break;
            case PIECES.rook:
                result = this.get_avail_area_rook(col, row);
                break;
            case PIECES.queen:
                result = this.get_avail_area_bishop(col, row, cur);
                result = result.concat(this.get_avail_area_rook(col, row, cur));
                break;
            case PIECES.king:
                result = this.get_avail_area_king(col, row);
                result = result.concat(this.get_avail_castling_king());
                break;
        }

        return result;
    };
}

/**
 * @brief Sets initial pieces at default positions.
 *
 * Must be called once.
 * To reset board use chess_reset function.
 */
function chess_init(part_name, side) {
    if (BOARD === undefined) {
        BOARD = new ChessBoard();
    }

    var figure_map = {
        a: ["rook", PIECES.rook],
        b: ["knight", PIECES.knight],
        c: ["bishop", PIECES.bishop],
        d: ["queen", PIECES.queen],
        e: ["king", PIECES.king],
        f: ["bishop", PIECES.bishop],
        g: ["knight", PIECES.knight],
        h: ["rook", PIECES.rook]
    };

    ["a", "b", "c", "d", "e", "f", "g", "h"].forEach(function(col) {
        //black
        var col8 = col + 8;
        var col7 = col + 7;
        BOARD[col8].div.className += " black_" + figure_map[col][0];
        BOARD[col8].team = TEAM.black;
        BOARD[col8].piece = figure_map[col][1];
        BOARD[col7].div.className += " black_pawn";
        BOARD[col7].team = TEAM.black;
        BOARD[col7].piece = PIECES.pawn;
        //white
        var col1 = col + 1;
        var col2 = col + 2;
        BOARD[col1].div.className += " white_" + figure_map[col][0];
        BOARD[col1].team = TEAM.white;
        BOARD[col1].piece = figure_map[col][1];
        BOARD[col2].div.className += " white_pawn";
        BOARD[col2].team = TEAM.white;
        BOARD[col2].piece = PIECES.pawn;
    });

    /* Joined someone's game */
    if (side) {
        BOARD.set_name(part_name);
        BOARD.side = side;
        SOCKET.emit("party_join", part_name, side);
        side_determ(side);
    }
}


function side_determ(side) {
    if (side === "black") {
        PLAYER_TEAM = TEAM.black;
        BOARD.king_pos = "e8";
    }
    else {
        PLAYER_TEAM = TEAM.white;
        BOARD.king_pos = "e1";
    }
    switch_side();
}

/**
 * Reverses rows nums for board wrapper.
 */
function reverse_board_wrapper() {
    //TODO: this is a way too awful code. Improve it!
    var board_wrap = document.getElementById("board_wrap").childNodes[0];
    var nodes = board_wrap.childNodes;
    var row_arr, col_arr;
    var idx;

    if (nodes[1].childNodes[0].innerHTML === "8") {
        nodes[1].childNodes[0].innerHTML = "1";
        nodes[1].childNodes[2].innerHTML = "1";
        row_arr = ["2", "3", "4", "5", "6", "7", "8"];
        col_arr = ["h", "g", "f", "e", "d", "c", "b", "a"];
    }
    else {
        nodes[1].childNodes[0].innerHTML = "8";
        nodes[1].childNodes[2].innerHTML = "8";
        row_arr = ["7", "6", "5", "4", "3", "2", "1"];
        col_arr = ["a", "b", "c", "d", "e", "f", "g", "h"];
    }

    for (idx = 2; idx < nodes.length - 1; idx++) {
        var row = row_arr[idx-2];
        nodes[idx].childNodes[0].innerHTML = row;
        nodes[idx].childNodes[1].innerHTML = row;
    }

    for (idx = 0; idx < col_arr.length; idx++) {
        nodes[0].childNodes[idx+1].innerHTML = col_arr[idx];
        nodes[nodes.length-1].childNodes[idx+1].innerHTML = col_arr[idx];
    }
}

/**
 * Reverse chess_board
 */
function reverse_board() {
    var chess_board = document.getElementById("chess_board");
    var nodes = chess_board.childNodes;
    var array_nodes = [];

    for (var idx = 0; idx < nodes.length; idx++) {
        array_nodes.unshift(nodes[idx]);
    }

    for (idx = 0; idx < nodes.length; idx++) {
        chess_board.appendChild(array_nodes[idx]);
    }

    reverse_board_wrapper();
}




/**
 * Reverse player side.
 */
function switch_side() {
    if (PLAYER_TEAM === TEAM.white) {
        document.getElementById("menu_side").value = "White";
        document.getElementById("menu_team").innerHTML = "WHITE";
    }
    else if (PLAYER_TEAM === TEAM.black) {
        document.getElementById("menu_side").value = "Black";
        document.getElementById("menu_team").innerHTML = "BLACK";
        reverse_board();
    }
}

/**
 * Cleans game and initialize board anew.
 */
function reset() {
    BOARD.reset();
    chess_init();
}

window.onbeforeunload = function() {
    SOCKET.close();
};

/**
 * Gets random int between min/max inclusively.
 */
function get_rand_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gets side to play by simply picking random between (1,10)
 */
function get_random_side() {
    if (get_rand_int(1, 10) > 5) return "white";
    else return "black";
}

window.onload = function() {
    var op_connected = true;
    var form = document.getElementById("party_form");

    if (form) {
        form.btn.disabled = false; //In case of history move back
        form.addEventListener("submit", function(evet) {
            evet.preventDefault();

            var party_name = encodeURIComponent(form.form_name.value);
            var side = form.form_side.value.toLowerCase();
            var type = form.form_party_type.value.toLowerCase();

            if (side === "random") side = get_random_side();

            PLAYER_TEAM = side;

            SOCKET.emit("party_create", party_name, side, type);

            form.btn.disabled = true; //disable until we'll get reply.

            return false;
        });

        SOCKET.on("create_ok", function(name_enc, side_enc) {
            BOARD.set_name(name_enc);
            BOARD.side = side_enc;
            //remove form.
            form = undefined;

            //Modify url to contain information for party restoration on reload.
            window.history.pushState("game", "Chess.js", "?game=" + name_enc + "&side=" + side_enc);
            document.body.removeChild(document.body.childNodes[2]);

            var enemy_side_enc;
            side_determ(side_enc);
            if (PLAYER_TEAM === TEAM.white) {
                enemy_side_enc = "black";
            }
            else {
                enemy_side_enc = "white";
            }

            //Pop-up waiting window
            document.getElementById('wait').style = "";
            document.getElementById('wait_ref').href = "/?game=" + name_enc + "&side=" + enemy_side_enc;
        });

        SOCKET.on("create_fail", function() {
            form.btn.disabled = false;
            PLAYER_TEAM = TEAM.none;
            window.alert("Failed to create party!\nParty with such name is already registered.");
        });
    }

    SOCKET.on("joined", function() {
        document.getElementById("overlay").style = "display: none";
        document.getElementById('wait').style = "display:none";

        if (!op_connected) {
            op_connected = true;
            BOARD.sync_game(SOCKET);
        }
    });

    SOCKET.on("join_ok", function() {
        document.getElementById("overlay").style = "display: none";
        document.getElementById('wait').style = "display:none";
    });

    SOCKET.on("join_fail", function() {
        var wait_pop = document.getElementById('wait');

        PLAYER_TEAM = TEAM.none;

        wait_pop.childNodes[0].innerHTML = "Sorry, but you cannot join this game!";
        wait_pop.childNodes[1].innerHTML = "Feel free to go back and create your own game.";
        wait_pop.childNodes[2].href = "/";
        wait_pop.childNodes[2].innerHTML = "Go back";

        document.getElementById("overlay").style = "";
        wait_pop.style = "";
    });

    SOCKET.on("move", function(move_data) {
        var from = move_data.old_pos;
        var to = move_data.new_pos;

        BOARD.enemy_move(from, to);

        if (move_data.finished) BOARD.turn_end();
    });

    SOCKET.on("check", function() {
        BOARD.me_checked();
    });

    SOCKET.on("uncheck", function(old_pos) {
        BOARD.me_uncheck(old_pos);
    });

    SOCKET.on("pawn_promo", function(piece, pos) {
        BOARD.pawn_promo(piece, pos);
    });

    SOCKET.on("sync_game", function(sync_data) {
        BOARD.read_sync(sync_data);
    });

    SOCKET.on("en_passant", function(poor_pawn) {
        BOARD.reset(poor_pawn);
    });

    SOCKET.on("opponent_disconnect", function() {
        var wait_pop = document.getElementById('wait');

        wait_pop.childNodes[0].innerHTML = "Your opponent has been disconnected...";
        wait_pop.childNodes[1].innerHTML = "Use your link below to invite your friend for a game";
        wait_pop.childNodes[2].innerHTML = "Link";
        if (PLAYER_TEAM === TEAM.white) {
            wait_pop.childNodes[2].href = "/?game=" + BOARD.name + "&side=black";
        }
        else {
            wait_pop.childNodes[2].href = "/?game=" + BOARD.name + "&side=white";
        }

        document.getElementById("overlay").style = "";
        wait_pop.style = "";
        op_connected = false;
    });

    SOCKET.on("connect", function() {
        if (BOARD.name) {
            SOCKET.emit("party_join", BOARD.name, BOARD.side);
        }
    });

    SOCKET.on("disconnect", function() {
        var wait_pop = document.getElementById('wait');
        wait_pop.childNodes[0].innerHTML = "Connection to server has been lost...";
        wait_pop.childNodes[1].innerHTML = "Please wait a bit or try to contact the one who messed it.";
        wait_pop.childNodes[2].innerHTML = "";
    });
};
