var BOARD;
var PLAYER_TEAM = TEAM.white;

function col_decrease(col) {
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

    return map[col];
}

function col_increase(col) {
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

    return map[col];
}
function click() {
    if (BOARD.selected) {
        selected_click(this.id);
    }
    else {
        not_selected_click(this.id);
    }

}

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

function not_selected_click(id) {
    var block = BOARD[id];

    if ((block.piece === PIECES.none) || !block.team || (PLAYER_TEAM != block.team)) {
        return;
    }

    BOARD.select(id);
}

function ChessBoard() {
    this.iterate = function(functor) {
        for (var col of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
            for (var i = 1; i < 9; i++) {
                functor(this, col+i);
            }
        }
    };

    this.selected = undefined;
    this.selected_move_area = [];

    this.iterate(function(me, id) {
        me[id] = {
            div: document.getElementById(id),
            team: TEAM.none,
            piece: PIECES.none
        };
        me[id].div.onclick=click;
    });

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

    this.select = function(id) {
        var block = BOARD[id];
        block.div.className += " selected";
        this.selected = id;
        this.get_avail_area();
    };

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

    this.move = function(to) {
        console.log(to);
        var old_pos = this[this.selected];
        var new_pos = this[to];

        new_pos.team = old_pos.team;
        new_pos.piece = old_pos.piece;
        new_pos.div.className = new_pos.div.className.replace(/((black)|(white))_[^ ]+/, "")
                                + " "
                                + old_pos.div.className.split(/\s+/)[1];
        this.reset(this.selected);
        this.selected = undefined;
    };

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

        this.selected_move_area = result;
    };
}

///Sets initial pieces at default positions
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

///Cleans game and initiate anew.
function reset() {
    BOARD.reset();
    chess_init();
}
