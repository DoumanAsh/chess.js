var BOARD;
var PLAYER_TEAM = TEAM.white;

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

    if (block.team == PLAYER_TEAM) {
        BOARD.unselect();
        BOARD.select(id);
        return;
    }

    var move_to = BOARD.selected_move_area.indexOf(id);

    if (move_to != -1) {
        BOARD.move(BOARD.selected_move_area[move_to]);
    }
}

/**
 * Chess board click handler when figure has NOT been selected.
 */
function not_selected_click(id) {
    var block = BOARD[id];

    if ((block.piece === PIECES.none) || !block.team || (PLAYER_TEAM != block.team)) {
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
        for (var col of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
            for (var i = 1; i < 9; i++) {
                functor(this, col+i);
            }
        }
    };

    this.selected = undefined;
    this.selected_move_area = [];

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
     * @param moved_to Location where piece has been moved
     */
    this.is_check = function(moved_to) {
        var move_area = this.get_avail_area();
        for (var idx = 0; idx < move_area.length; idx++) {
            var block = BOARD[move_area[idx]];
            if (block.piece === PIECES.king && block.team !== PLAYER_TEAM) {
                block.div.className = block.div.className + " checked";
                //TODO event check
                break;
            }
        }
    };

    /**
     * @brief Moves piece to new location.
     *
     * Clear selection and checks for enemy king being checked
     * by this move.
     *
     * @param to New location.
     */
    this.move = function(to) {
        var old_pos = this[this.selected];
        var new_pos = this[to];

        new_pos.team = old_pos.team;
        new_pos.piece = old_pos.piece;
        new_pos.div.className = new_pos.div.className.replace(/((black)|(white))_[^ ]+/, "") + " " + old_pos.div.className.split(/\s+/)[1];
        this.reset(this.selected);
        this.selected = to;
        this.is_check();
        this.selected = undefined;
    };

    /**
     * Store available area for move of currently selected piece.
     */
    this.set_avail_area = function() {
        this.selected_move_area = this.get_avail_area();
    };

    /**
     * Returns array of possible moves of currently selected piece.
     *
     * @TODO Add parameter?
     */
    this.get_avail_area = function() {
        var result = [];
        var col = this.selected[0];
        var row = parseInt(this.selected[1]);
        var cur = this[this.selected];

        if (cur.piece === PIECES.pawn) {
            var new_row;
            var move;
            var eat_left;
            var eat_right;
            if (cur.team === TEAM.white) {
                new_row = row + 1;
            }
            else {
                new_row = row - 1;
            }

            move = col + new_row;
            eat_left = col_decrease(col) + new_row;
            eat_right = col_increase(col) + new_row;

            if (this[move].team === TEAM.none) {
                result.push(move);
                //First move can be for 2 cells
                //See def.js for logic
                if ((cur.team - row) === 0) {
                    if (cur.team === TEAM.white) {
                        move = col + (row + 2);
                    }
                    else {
                        move = col + (row - 2);
                    }
                    if (this[move].team === TEAM.none) {
                        result.push(move);
                    }
                }
            }

            //Check if can eat
            if (eat_left && (this[eat_left].team === TEAM.black)) {
                result.push(eat_left);
            }

            if (eat_right && (this[eat_right].team === TEAM.black)) {
                result.push(eat_right);
            }
        }
        else if (cur.piece === PIECES.knight) {
            var moves = [
                [col_decrease(col, 2), [row+1, row-1]],
                [col_decrease(col), [row+2, row-2]],
                [col_increase(col), [row+2, row-2]],
                [col_increase(col, 2), [row+1, row-1]]
            ];

            for (var idx = 0; idx < moves.length; idx++) {
                var new_col = moves[idx][0];
                var new_rows = moves[idx][1];

                if (new_col) {
                    for (var jdx = 0; jdx < new_rows.length; jdx++) {
                        if (new_rows[jdx] > 0 && new_rows[jdx] < 9) {
                            var new_move = new_col + new_rows[jdx];
                            if (this[new_move] !== PLAYER_TEAM) result.push(new_move);
                        }
                    }
                }
            }
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
function chess_init() {
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

    for (var col of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
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
    }
}

/**
 * Cleans game and initialize board anew.
 */
function reset() {
    BOARD.reset();
    chess_init();
}
