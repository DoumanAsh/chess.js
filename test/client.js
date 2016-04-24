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

    it('Board class initialize', function() {
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
    });

    it('King select unmoved', function() {
        window.BOARD.select(window.BOARD.king_pos);
        assert(window.BOARD[window.BOARD.king_pos].div.className.search(/selected/) > 0);
        assert.equal(window.BOARD.selected, window.BOARD.king_pos);
        assert.deepEqual(window.BOARD.selected_move_area, []);
    });

    it('King unselect', function() {
        window.BOARD.unselect();
        assert.equal(window.BOARD[window.BOARD.king_pos].div.className.search(/selected/), -1);
        assert.equal(window.BOARD.selected, undefined);
    });

    it('Check own king', function() {
        window.BOARD.me_checked();
        assert(window.BOARD.king_checked);
        assert(window.BOARD[window.BOARD.king_pos].div.className.search(/checked/) > 0);
    });

    it('Uncheck own king', function() {
        var pos = "e5";
        dummy_socket(function(emit_event, emit_data) {
            assert.equal(emit_event, "uncheck");
            assert.equal(emit_data.name, "test");
            assert.equal(emit_data.side, TEAM.white);
            assert.equal(emit_data.old_pos, pos);
        });

        window.BOARD[pos].div.className += " checked";
        window.BOARD.me_uncheck(pos);
        assert(!window.BOARD.king_checked);
        assert.equal(window.BOARD[pos].div.className.search(/checked/), -1);
        assert.equal(window.BOARD[window.BOARD.king_pos].div.className.search(/checked/), -1);

    });

    it('Set board element with data', function() {
        var pos = "e5";
        var old_king_pos = window.BOARD.king_pos;
        [TEAM.black, TEAM.white].forEach(function(team) {
            var team_str;
            if (team === TEAM.black) team_str = "black";
            else team_str = "white";

            [PIECES.pawn, PIECES.rook, PIECES.bishop, PIECES.knight, PIECES.queen, PIECES.king].forEach(function(piece) {
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
                    case PIECES.king:
                        expected_name += "_king";
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

        window.BOARD.king_pos = old_king_pos;
    });

    it('Enemy team checker', function() {
        assert(!window.BOARD.is_enemy_team(window.BOARD.king_pos));
        assert(window.BOARD.is_enemy_team("e7"));
    });

    it('Select and unselect pawn', function() {
        var pos = "e2";
        window.BOARD.select(pos);
        assert(window.BOARD[pos].div.className.search(/selected/) > 0);
        assert.equal(window.BOARD.selected, pos);
        assert.deepEqual(window.BOARD.selected_move_area, ["e3", "e4"]);

        window.BOARD.unselect();
        assert.equal(window.BOARD[pos].div.className.search(/selected/), -1);
        assert.equal(window.BOARD.selected, undefined);
    });

    it('Select and unselect knight', function() {
        var pos = "b1";
        window.BOARD.select(pos);
        assert(window.BOARD[pos].div.className.search(/selected/) > 0);
        assert.equal(window.BOARD.selected, pos);
        assert.deepEqual(window.BOARD.selected_move_area, ["a3", "c3"]);

        /* Unselect */
        window.BOARD.unselect();
        assert.equal(window.BOARD[pos].div.className.search(/selected/), -1);
        assert.equal(window.BOARD.selected, undefined);
    });

    it('Is own king checked', function() {
        assert(!window.BOARD.is_me_check());
        /* Replace own queen to be checked */
        var pos = "d1";
        window.BOARD[pos].team = TEAM.black;
        assert(window.BOARD.is_me_check());

        window.BOARD[pos].team = TEAM.white;
    });

    it('Is enemy king checked', function() {
        var pos = "d2";
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
    });

    it('Pawn promo', function() {
        var pos = "d2";
        var new_piece = PIECES.rook;
        window.BOARD.pawn_promo(new_piece, pos);
        assert.equal(window.BOARD[pos].piece, PIECES.rook);
        assert(window.BOARD[pos].div.className.search(/white_rook/) > 0);

        window.BOARD[pos].piece = PIECES.pawn;
        window.BOARD[pos].div.className.replace(/white_rook/, "white_pawn");
    });

    it('Turn end', function() {
        window.BOARD.turn_end();
        assert.equal(window.BOARD.turn, TEAM.black);
        assert.equal(document.getElementById("menu_turn").innerHTML, "BLACK");
        window.BOARD.turn_end();
        assert.equal(window.BOARD.turn, TEAM.white);
        assert.equal(document.getElementById("menu_turn").innerHTML, "WHITE");
    });

    it('Sync game', function() {
        var is_socket_called = false;
        dummy_socket(function(emit_event, data) {
            is_socket_called = true;
            assert.equal(emit_event, "sync_game");
            assert.equal(data.name, "test");
            assert.equal(data.side, TEAM.white);
            assert.equal(data.sync_data.turn, window.BOARD.turn);

            var figure_map = {
                a: PIECES.rook,
                b: PIECES.knight,
                c: PIECES.bishop,
                d: PIECES.queen,
                e: PIECES.king,
                f: PIECES.bishop,
                g: PIECES.knight,
                h: PIECES.rook
            };

            ["a", "b", "c", "d", "e", "f", "g", "h"].forEach(function(col) {
                //black
                var col8 = col + 8;
                var col7 = col + 7;
                assert.equal(data.sync_data.board[col8].team, TEAM.black);
                assert.equal(data.sync_data.board[col8].piece, figure_map[col]);
                assert.equal(data.sync_data.board[col7].team, TEAM.black);
                assert.equal(data.sync_data.board[col7].piece, PIECES.pawn);

                //white
                var col1 = col + 1;
                var col2 = col + 2;
                assert.equal(data.sync_data.board[col1].team, TEAM.white);
                assert.equal(data.sync_data.board[col1].piece, figure_map[col]);
                assert.equal(data.sync_data.board[col2].team, TEAM.white);
                assert.equal(data.sync_data.board[col2].piece, PIECES.pawn);

                //none
                for (var idx = 3; idx < 6; idx++) {
                    var elem = data.sync_data.board[col+idx];
                    assert.equal(elem.team, TEAM.none);
                    assert.equal(elem.piece, PIECES.none);
                }
            });
        });

        window.BOARD.sync_game(window.SOCKET);
        assert(is_socket_called, "sync_game event hasn't been sent");
    });

    it('Pawn promo white', function() {
        var pos = "h8";
        var is_socket_called = false;
        dummy_socket(function(emit_event, data) {
            is_socket_called = true;
            assert.equal(emit_event, "pawn_promo");
            assert.equal(data.name, "test");
            assert.equal(data.side, TEAM.white);
            assert.equal(data.new_piece, PIECES.queen); //default
            assert.equal(data.pos, pos);
        });

        window.BOARD[pos].team = TEAM.white;
        window.BOARD.is_pawn_promo(window.BOARD[pos]);
        assert(is_socket_called, "pawn_promo event hasn't been sent");
        assert(window.BOARD[pos].div.className.search(/queen/) > 0);

        window.BOARD[pos].team = TEAM.black;
        window.BOARD[pos].piece = PIECES.rook;
    });

    it('Pawn promo black', function() {
        var pos = "h1";
        var is_socket_called = false;
        dummy_socket(function(emit_event, data) {
            is_socket_called = true;
            assert.equal(emit_event, "pawn_promo");
            assert.equal(data.name, "test");
            assert.equal(data.side, TEAM.white);
            assert.equal(data.new_piece, PIECES.queen); //default
            assert.equal(data.pos, pos);
        });

        window.BOARD[pos].team = TEAM.black;
        window.BOARD.is_pawn_promo(window.BOARD[pos]);
        assert(is_socket_called, "pawn_promo event hasn't been sent");
        assert(window.BOARD[pos].div.className.search(/queen/) > 0);

        window.BOARD[pos].team = TEAM.white;
        window.BOARD[pos].piece = PIECES.rook;
    });

    it('is_move_en_passant() check', function() {
        var pos = "c6";
        var is_socket_called = false;
        window.BOARD.en_passant_to = pos;

        dummy_socket(function(emit_event, data) {
            is_socket_called = true;
            assert.equal(emit_event, "en_passant");
            assert.equal(data.name, "test");
            assert.equal(data.side, TEAM.white);
            assert.equal(data.poor_pawn, "c5");
        });

        window.BOARD["c5"].team = TEAM.black;
        window.BOARD["c5"].piece = TEAM.pawn;
        window.BOARD["c5"].div.className += " black_pawn";

        assert(window.BOARD.is_en_passant(pos));
        window.BOARD.is_move_en_passant(pos);
        assert.equal(window.BOARD.en_passant_to, undefined);
        assert.equal(window.BOARD["c5"].team, TEAM.none);
        assert.equal(window.BOARD["c5"].piece, PIECES.none);
        assert.equal(window.BOARD["c5"].div.className.search("black_pawn"), -1);
        assert(is_socket_called, "en_passant event hasn't been sent");

        is_socket_called = false;

        dummy_socket(function() {
            is_socket_called = true;
        });

        window.BOARD.is_move_en_passant(pos);
        assert(!is_socket_called, "en_passant event MUST not be sent");
    });

    it('en_passant() check', function() {
        window.PLAYER_TEAM = TEAM.black;
        window.BOARD.en_passant("c2", "c4");
        assert.equal(window.BOARD.en_passant_to, "c3");
        window.BOARD.en_passant_to = undefined;

        window.PLAYER_TEAM = TEAM.white;
        window.BOARD.en_passant("c7", "c5");
        assert.equal(window.BOARD.en_passant_to, "c6");
        window.BOARD.en_passant_to = undefined;
    });

    /* Should be last test
     * TODO: find a better way as window is not available in after() */
    it('Collect coverage', function() {
        if (!fs.existsSync("coverage")) fs.mkdirSync("coverage");
        var report_fd = fs.openSync("coverage/coverage1.json", "w");
        fs.writeFileSync(report_fd, JSON.stringify(window.__coverage__));
    });
});
