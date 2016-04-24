"use strict";
const assert = require('assert');
const fs = require('fs');
const io = require('socket.io-client');
const io_server = require('socket.io');
const jsdom = require("mocha-jsdom");
const path = require('path');

describe('Client tests:', function() {
    /*
    var server = io_server();

    server.on('connect', function(socket) {
    });

    server.listen(80);
    */
    var istanbul = require('istanbul');
    var instrumenter = new istanbul.Instrumenter();

    jsdom({
        url: 'http://localhost',
        src: [
            fs.readFileSync('node_modules/socket.io-client/socket.io.js', 'utf-8'),
            instrumenter.instrumentSync(fs.readFileSync('static/js/main.js', 'utf-8'), path.normalize(__dirname + '/../static/js/main.js'))
        ],
        html: fs.readFileSync('test/client.html', 'utf-8'),
        features: {
            ProcessExternalResources: false,
            MutationEvents: '2.0'
        }
    });

    var get_coverage = function() {
        if (!fs.existsSync("coverage")) fs.mkdirSync("coverage");
        var report_fd = fs.openSync("coverage/coverage1.json", "w");
        fs.writeFileSync(report_fd, JSON.stringify(window.__coverage__));
    };

    /* Initialize dummy socket object in document */
    var dummy_socket = function(func) {
        if (window.SOCKET === undefined) window.SOCKET = {};

        if (func) window.SOCKET.emit = func;
        else window.SOCKET.emit = function() {};
    };

    var get_rand_int_checker = function(min, max, times) {
        if (times === undefined) times = 10;

        for (var time = 0; time < times; time++) {
            var rand_val = get_rand_int(min, max);
            assert(rand_val >= min);
            assert(rand_val <= max);
        }
    };

    var reverse_board_checker = function() {
        var chess_board = document.getElementById("chess_board");
        var nodes = chess_board.childNodes;
        var orig_first = nodes[0].id;

        reverse_board();
        nodes = chess_board.childNodes;
        var new_first = nodes[0].id;

        if (orig_first === "a8") assert.equal(new_first, "h1");
        else if (orig_first === "h1") assert.equal(new_first, "a8");
    };

    afterEach(function() {
        dummy_socket();
    });

    it('Utils check', function() {
        /* col_decrease */
        assert.deepEqual(col_decrease('h'), 'g');
        assert.deepEqual(col_decrease('a'), undefined);
        assert.deepEqual(col_decrease('h', 8), undefined);

        /* col_increase */
        assert.deepEqual(col_increase('a'), 'b');
        assert.deepEqual(col_increase('h'), undefined);
        assert.deepEqual(col_increase('a', 8), undefined);

        get_rand_int_checker(1, 10);

        reverse_board_checker();
        reverse_board_checker();
    });

    it('Board class basic', function() {
        dummy_socket();

        chess_init("test", "white");
        assert(window.BOARD);
        assert.equal(window.BOARD.name, "test");
        assert.equal(document.getElementById("party_name").innerHTML, "test");
        assert.equal(window.BOARD.side, "white");
        assert.equal(window.BOARD.turn, TEAM.white);
        assert.equal(window.BOARD.king_pos, "e1");
        assert.equal(window.BOARD[window.BOARD.king_pos].team, TEAM.white);
        assert.equal(window.BOARD[window.BOARD.king_pos].piece, PIECES.king);
        assert.equal(document.getElementById("menu_side").value, "White");
        assert.equal(document.getElementById("menu_team").innerHTML, "WHITE");

        ["a", "b", "c", "d", "e", "f", "g", "h"].forEach(function(col) {
            for (var idx = 3; idx < 6; idx++) {
                var elem = window.BOARD[col+idx];
                assert.equal(elem.team, TEAM.none);
                assert.equal(elem.piece, PIECES.none);
                assert.equal(elem.div.className.search(/((black)|(white))_[^ ]+/), -1);
                assert.equal(elem.div.className.search(/selected/), -1);
            }
        });

        /* Select king that cannot move at the start */
        window.BOARD.select(window.BOARD.king_pos);
        assert(window.BOARD[window.BOARD.king_pos].div.className.search(/selected/) > 0);
        assert.equal(window.BOARD.selected, window.BOARD.king_pos);
        assert.deepEqual(window.BOARD.selected_move_area, []);

        /* Unselect */
        window.BOARD.unselect();
        assert.equal(window.BOARD[window.BOARD.king_pos].div.className.search(/selected/), -1);
        assert.equal(window.BOARD.selected, undefined);

        /* Check own king */
        window.BOARD.me_checked();
        assert(window.BOARD.king_checked);
        assert(window.BOARD[window.BOARD.king_pos].div.className.search(/checked/) > 0);

        /* Uncheck own king */
        dummy_socket(function(emit_event, emit_data) {
            assert.equal(emit_event, "uncheck");
            assert.equal(emit_data.name, "test");
            assert.equal(emit_data.side, TEAM.white);
            assert.equal(emit_data.old_pos, undefined);
        });

        window.BOARD.me_uncheck();
        assert(!window.BOARD.king_checked);
        assert.equal(window.BOARD[window.BOARD.king_pos].div.className.search(/checked/), -1);

        dummy_socket();

        /* Set board element with data */
        var pos = "e5";
        [TEAM.black, TEAM.white].forEach(function(team) {
            var team_str;
            if (team === TEAM.black) team_str = "black";
            else team_str = "white";

            [PIECES.pawn, PIECES.rook, PIECES.bishop, PIECES.knight, PIECES.queen].forEach(function(piece) {
                var expected_name = team_str;
                switch (piece) {
                    case PIECES.pawn:
                        expected_name += "_pawn";
                        break;
                    case PIECES.rook:
                        expected_name += "_rook";
                        break;
                    case PIECES.knight:
                        expected_name += "_knight";
                        break;
                    case PIECES.bishop:
                        expected_name += "_bishop";
                        break;
                    case PIECES.queen:
                        expected_name += "_queen";
                        break;
                }

                var data = {
                    team: team,
                    piece: piece
                };

                window.BOARD.set_board_elem(pos, data);
                assert(window.BOARD[pos].div.className.search(expected_name) > 0);
                assert.equal(window.BOARD[pos].team, data.team);
                assert.equal(window.BOARD[pos].piece, data.piece);

                /* Reset board element */
                window.BOARD.reset(pos);
                assert.equal(window.BOARD[pos].div.className.search(expected_name), -1);
                assert.equal(window.BOARD[pos].team, TEAM.none);
                assert.equal(window.BOARD[pos].piece, PIECES.none);
            });
        });

        /* Is enemy team checker */
        assert(!window.BOARD.is_enemy_team(window.BOARD.king_pos));
        assert(window.BOARD.is_enemy_team("e7"));

        /* Select pawn */
        pos = "e2";
        window.BOARD.select(pos);
        assert(window.BOARD[pos].div.className.search(/selected/) > 0);
        assert.equal(window.BOARD.selected, pos);
        assert.deepEqual(window.BOARD.selected_move_area, ["e3", "e4"]);

        /* Unselect */
        window.BOARD.unselect();
        assert.equal(window.BOARD[pos].div.className.search(/selected/), -1);
        assert.equal(window.BOARD.selected, undefined);

        /* Select knight */
        pos = "b1";
        window.BOARD.select(pos);
        assert(window.BOARD[pos].div.className.search(/selected/) > 0);
        assert.equal(window.BOARD.selected, pos);
        assert.deepEqual(window.BOARD.selected_move_area, ["a3", "c3"]);

        /* Unselect */
        window.BOARD.unselect();
        assert.equal(window.BOARD[pos].div.className.search(/selected/), -1);
        assert.equal(window.BOARD.selected, undefined);

        /* Is own king checked */
        assert(!window.BOARD.is_me_check());
        /* Replace own queen to be checked */
        pos = "d1";
        window.BOARD[pos].team = TEAM.black;
        assert(window.BOARD.is_me_check());

        window.BOARD[pos].team = TEAM.white;

        /* Is enemy king checked */
        pos = "d2";
        dummy_socket(function() {
            assert(false, "Enemy king is not supposed to be checked");
        });

        window.BOARD.is_enemy_check(pos);
        /* Replace enemy queen with yours */
        var is_socket_called = false;
        pos = "d8";
        window.BOARD[pos].team = TEAM.white;
        dummy_socket(function(emit_event, data) {
            is_socket_called = true;
            assert.equal(emit_event, "check");
            assert.equal(data.name, "test");
            assert.equal(data.side, TEAM.white);
        });

        window.BOARD.is_enemy_check(pos);
        assert(is_socket_called, "Event check is not sent");

        window.BOARD[pos].team = TEAM.black;

        /* Check pawn promo */
        pos = "d2";
        var new_piece = PIECES.rook;
        window.BOARD.pawn_promo(new_piece, pos);
        assert.equal(window.BOARD[pos].piece, PIECES.rook);
        assert(window.BOARD[pos].div.className.search(/white_rook/) > 0);

        window.BOARD[pos].piece = PIECES.pawn;
        window.BOARD[pos].div.className.replace(/white_rook/, "white_pawn");

        get_coverage();
    });
});
