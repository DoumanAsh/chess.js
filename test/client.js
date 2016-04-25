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

    it('not_selected click event', function() {
        //empty
        var pos = "e5";
        window.not_selected_click(pos);
        assert.equal(window.BOARD.selected, undefined);

        //enemy
        pos = "e7";
        window.not_selected_click(pos);
        assert.equal(window.BOARD.selected, undefined);

        //own
        pos = "e2";
        window.not_selected_click(pos);
        assert.equal(window.BOARD.selected, "e2");
        assert(window.BOARD[pos].div.className.search("selected") > 0);

        window.BOARD.unselect();
    });

    it('selected click event', function() {
        //Select king
        var pos = "e1";
        var old_pos = pos;
        window.not_selected_click(pos);
        assert.equal(window.BOARD.selected, pos);
        assert(window.BOARD[pos].div.className.search("selected") > 0);

        //Clicked on own piece
        pos = "e2";
        window.selected_click(pos);
        assert.equal(window.BOARD.selected, pos);
        assert(window.BOARD[pos].div.className.search("selected") > 0);
        assert.equal(window.BOARD[old_pos].div.className.search("selected"), -1);

        //Click on impossible move
        old_pos = pos;
        pos = "d3";
        window.BOARD.selected_move_area = ["e3", "e4"];
        window.selected_click(pos);
        assert.equal(window.BOARD.selected, old_pos);
        assert(window.BOARD[old_pos].div.className.search("selected") > 0);

        //Click on possible move
        pos = "e3";
        window.selected_click(pos);
        assert.equal(window.BOARD.selected, undefined);
        assert.equal(window.BOARD[pos].piece, PIECES.pawn);
        assert.equal(window.BOARD[pos].team, TEAM.white);

        assert.equal(window.BOARD[old_pos].div.className.search("selected"), -1);
        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);

        //Move back to restore things
        old_pos = pos;
        window.BOARD.selected = old_pos;
        pos = "e2";
        window.BOARD.selected_move_area = ["e2"];
        window.selected_click(pos);
        assert.equal(window.BOARD[pos].team, TEAM.white);
        assert.equal(window.BOARD[pos].piece, PIECES.pawn);
        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);

        window.BOARD.selected_move_area = [];
    });

    it('Movement', function() {
        var is_socket_called = false;
        var is_finished = false;
        var old_pos = "e2";
        var pos = "e4";

        dummy_socket(function(emit_event, data) {
            is_socket_called = true;
            assert.equal(emit_event, "move");
            assert.equal(data.name, "test");
            assert.equal(data.side, window.PLAYER_TEAM);
            assert.equal(data.old_pos, old_pos);
            assert.equal(data.new_pos, pos);
            assert.equal(data.finished, is_finished);
        });

        //Move own pawn without finished
        window.BOARD.selected = old_pos;
        window.BOARD.move(pos, is_finished);
        assert(is_socket_called, "Move event hasn't been sent");
        assert.equal(window.BOARD.selected, undefined);

        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("white_pawn"), -1);

        assert.equal(window.BOARD[pos].team, TEAM.white);
        assert.equal(window.BOARD[pos].piece, PIECES.pawn);
        assert(window.BOARD[pos].div.className.search("white_pawn") > 0);

        //Move enemy pawn
        is_socket_called = false;
        old_pos = "d7";
        pos = "d5";

        window.BOARD.enemy_move(old_pos, pos);
        assert(!is_socket_called, "Move event MUST not be sent");

        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("black_pawn"), -1);

        assert.equal(window.BOARD[pos].team, TEAM.black);
        assert.equal(window.BOARD[pos].piece, PIECES.pawn);
        assert(window.BOARD[pos].div.className.search("black_pawn") > 0);

        //Move own pawn with finished
        old_pos = "e4";
        pos = "e5";
        is_finished = true;

        //Move own pawn without finished
        window.BOARD.selected = old_pos;
        window.BOARD.move(pos, is_finished);
        assert(is_socket_called, "Move event hasn't been sent");
        assert.equal(window.BOARD.selected, undefined);

        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("white_pawn"), -1);

        assert.equal(window.BOARD[pos].team, TEAM.white);
        assert.equal(window.BOARD[pos].piece, PIECES.pawn);
        assert(window.BOARD[pos].div.className.search("white_pawn") > 0);

        assert.equal(window.BOARD.turn, TEAM.black);

        //Move enemy pawn for en passant
        is_socket_called = false;
        old_pos = "f7";
        pos = "f5";

        window.BOARD.enemy_move(old_pos, pos);
        assert(!is_socket_called, "Move event MUST not be sent");

        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("black_pawn"), -1);

        assert.equal(window.BOARD[pos].team, TEAM.black);
        assert.equal(window.BOARD[pos].piece, PIECES.pawn);
        assert(window.BOARD[pos].div.className.search("black_pawn") > 0);

        assert.equal(window.BOARD.en_passant_to, "f6");

        //Move enemy pawn closer to king by ignoring rules
        is_socket_called = false;
        old_pos = "f5";
        pos = "f3";

        window.BOARD.enemy_move(old_pos, pos);
        assert(!is_socket_called, "Move event MUST not be sent");

        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("black_pawn"), -1);

        assert.equal(window.BOARD[pos].team, TEAM.black);
        assert.equal(window.BOARD[pos].piece, PIECES.pawn);
        assert(window.BOARD[pos].div.className.search("black_pawn") > 0);

        window.BOARD.turn_end();

        //Check that king cannot move under threat
        is_socket_called = false;
        old_pos = "e1";
        pos = "e2";
        window.BOARD.selected = old_pos;
        window.BOARD.move(pos, is_finished);
        assert(!is_socket_called, "Move event MUST not be sent");
        assert.equal(window.BOARD.selected, old_pos);
        assert.equal(window.BOARD.king_pos, old_pos);

        assert.equal(window.BOARD[old_pos].piece, PIECES.king);
        assert.equal(window.BOARD[old_pos].team, TEAM.white);
        assert(window.BOARD[old_pos].div.className.search("white_king") > 0);

        assert.equal(window.BOARD[pos].team, TEAM.none);
        assert.equal(window.BOARD[pos].piece, PIECES.none);
        assert.equal(window.BOARD[pos].div.className.search("white_king"), -1);

        window.BOARD.king_pos = "e1";

        //Eat enemy pawn by queen
        is_socket_called = false;
        old_pos = "d1";
        pos = "f3";
        window.BOARD.selected = old_pos;
        window.BOARD.move(pos, is_finished);
        assert(is_socket_called, "Move event MUST be sent");

        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("white_queen"), -1);

        assert.equal(window.BOARD[pos].piece, PIECES.queen);
        assert.equal(window.BOARD[pos].team, TEAM.white);
        assert(window.BOARD[pos].div.className.search("white_queen") > 0);

        //Eat enemy pawn by enemy queen Just for lulz.
        is_socket_called = false;
        old_pos = "d8";
        pos = "e7";

        window.BOARD.enemy_move(old_pos, pos);
        assert(!is_socket_called, "Move event MUST not be sent");

        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("black_queen"), -1);

        assert.equal(window.BOARD[pos].team, TEAM.black);
        assert.equal(window.BOARD[pos].piece, PIECES.queen);
        assert(window.BOARD[pos].div.className.search("black_queen") > 0);

        //also white king is supposed to be checked(sent by event).
        window.BOARD.king_checked = true;

        window.BOARD.turn_end();

        //Cover white king by queen
        var move_time = false;
        is_socket_called = false;
        old_pos = "f3";
        pos = "e3";
        dummy_socket(function(emit_event, data) {
            if (move_time)
            {
                is_socket_called = true;
                assert.equal(emit_event, "move");
                assert.equal(data.name, "test");
                assert.equal(data.side, window.PLAYER_TEAM);
                assert.equal(data.old_pos, old_pos);
                assert.equal(data.new_pos, pos);
                assert.equal(data.finished, is_finished);
            }
            else {
                move_time = true;
                assert.equal(emit_event, "uncheck");
                assert.equal(data.name, "test");
                assert.equal(data.side, window.PLAYER_TEAM);
                assert.equal(data.old_pos, old_pos);
            }
        });

        window.BOARD.selected = old_pos;
        window.BOARD.move(pos, is_finished);
        assert(is_socket_called, "Move event MUST be sent");

        assert(!window.BOARD.king_checked);
        assert.equal(window.BOARD[old_pos].piece, PIECES.none);
        assert.equal(window.BOARD[old_pos].team, TEAM.none);
        assert.equal(window.BOARD[old_pos].div.className.search("white_queen"), -1);

        assert.equal(window.BOARD[pos].piece, PIECES.queen);
        assert.equal(window.BOARD[pos].team, TEAM.white);
        assert(window.BOARD[pos].div.className.search("white_queen") > 0);

    });

    it('Read sync game', function() {
        var is_socket_called = false;
        var sync_data;
        dummy_socket(function(emit_event, data) {
            is_socket_called = true;
            assert.equal(emit_event, "sync_game");
            assert.equal(data.name, "test");
            assert.equal(data.side, TEAM.white);
            sync_data = data.sync_data;
        });

        window.BOARD.sync_game(window.SOCKET);
        assert(is_socket_called, "sync_game event hasn't been sent");

        window.BOARD.reset();

        window.BOARD.read_sync(sync_data);

        var pos = "e7";
        assert.equal(window.BOARD[pos].team, TEAM.black);
        assert.equal(window.BOARD[pos].piece, PIECES.queen);
        assert(window.BOARD[pos].div.className.search("black_queen") > 0);

        pos = "e3";
        assert.equal(window.BOARD[pos].piece, PIECES.queen);
        assert.equal(window.BOARD[pos].team, TEAM.white);
        assert(window.BOARD[pos].div.className.search("white_queen") > 0);
    });

    /**
     * @brief Sets element to position and checks that available move area is correct.
     *
     * Correct is not of own team.
     * Resets backs element in position.
     *
     * @return avail_area Array of possible movements under check.
     */
    var check_avail_area = function(position, data, expected_array, is_eat) {
        var old_data = {
            piece: window.BOARD[position].piece,
            team: window.BOARD[position].team
        };
        var old_king_pos = window.BOARD.king_pos;
        window.BOARD.reset(position);
        window.BOARD.set_board_elem(position, data);

        var avail_area = window.BOARD.get_avail_area(position, is_eat);

        avail_area.forEach(function(pos) {
            assert.notEqual(window.BOARD[pos].team, data.team);
        });

        if (expected_array) {
            assert.equal(avail_area.length, expected_array.length);
            if (expected_array.length === 0) {
                assert.deepEqual(avail_area.sort(), expected_array.sort());
            }
        }

        window.BOARD.reset(position);
        window.BOARD.set_board_elem(position, old_data);
        window.BOARD.king_pos = old_king_pos;

        return avail_area;
    };

    /* Depends on board state after previous tests intentionally */
    it('get_avail_area pawn', function() {
        var pos = "e5";
        var data = {
            piece: PIECES.pawn,
            team: TEAM.white
        };

        /* check normal pawn move */
        check_avail_area(pos, data, ["e6"]);

        /* check move area with special flag eat
         * i.e. expect threat moves only */
        check_avail_area(pos, data, ["d6", "f6"], true);

        /* Check that no moves are available if own piece is standing on e3
         * i.e. including no special move to e4 */
        pos = "e2";
        check_avail_area(pos, data, []);

        /* Remove figure from e3 to check that special move is available */
        var old_team = window.BOARD["e3"].team;
        window.BOARD["e3"].team = TEAM.none;

        check_avail_area(pos, data, ["e3", "e4"]);

        /* Set figure on e4 and check that only e3 move is available */
        window.BOARD["e4"].team = old_team;

        check_avail_area(pos, data, ["e3"]);

        /* reset changes */
        window.BOARD["e4"].team = TEAM.none;
        window.BOARD["e3"].team = old_team;
    });

    it('get_avail_area knight', function() {
        var pos = "e5";
        var data = {
            piece: PIECES.knight,
            team: TEAM.white
        };

        /* check normal move */
        check_avail_area(pos, data, ["d7", "d3", "c4", "c6", "g4", "g6", "f7", "f3"]);

        /* Add own pieces to c4 and f7 */
        var old_team_c4 = window.BOARD["c4"].team;
        var old_team_f7 = window.BOARD["f7"].team;
        window.BOARD["c4"].team = TEAM.white;
        window.BOARD["f7"].team = TEAM.white;

        check_avail_area(pos, data, ["d7", "d3", "c6", "g4", "g6", "f3"]);

        window.BOARD["c4"].team = old_team_c4;
        window.BOARD["f7"].team = old_team_f7;

        /* Check move area at the edges of board with own pieces*/
        pos = "a1";

        check_avail_area(pos, data, ["b3"]);

        /* Check move area at the edges of board with enemy pieces*/
        pos = "a8";

        check_avail_area(pos, data, ["b6", "c7"]);
    });

    it('get_avail_area bishop', function() {
        var pos = "e5";
        var data = {
            piece: PIECES.bishop,
            team: TEAM.white
        };

        /* check normal move */
        check_avail_area(pos, data, ["d4", "c3", "d6", "c7", "f6", "g7", "f4", "g3"]);

        /* check at the edge of own side */
        pos = "a1";
        check_avail_area(pos, data, []);

        /* check at the edge of own side */
        pos = "a8";
        check_avail_area(pos, data, ["b7"]);

        /* check at the edge in the middle */
        pos = "a5";
        check_avail_area(pos, data, ["b6", "c7", "b4", "c3"]);
    });

    it('get_avail_area rook', function() {
        var pos = "e5";
        var data = {
            piece: PIECES.rook,
            team: TEAM.white
        };

        /* check normal move */
        check_avail_area(pos, data, ["d5", "f5", "g5", "h5", "e4", "e6", "e7"]);

        /* check at the enemy edge */
        pos = "h8";
        check_avail_area(pos, data, ["h7", "g8"]);

        /* check at the own edge */
        pos = "h1";
        check_avail_area(pos, data, []);

        /* check at the middle edge */
        pos = "h5";
        check_avail_area(pos, data, ["g5", "f5", "h4", "h3", "h6", "h7"]);
    });

    it('get_avail_area queen', function() {
        var pos = "e5";
        var data = {
            piece: PIECES.queen,
            team: TEAM.white
        };

        /* check normal move */
        check_avail_area(pos, data, ["d4", "c3", "d6", "c7", "f6", "g7", "f4", "g3", "d5", "f5", "g5", "h5", "e4", "e6", "e7"]);

        /* check at the edge of own team */
        pos = "a1";
        check_avail_area(pos, data, []);

        /* check at the edge of enemy team */
        pos = "a8";
        check_avail_area(pos, data, ["b8", "a7", "b7"]);

        /* check at the middle edge */
        pos = "h5";
        check_avail_area(pos, data, ["g5", "f5", "h4", "h3", "g4", "f3", "e2", "d1", "h6", "h7", "g6", "f7", "e8"]);
    });

    it('get_avail_area king', function() {
        var pos = "b5";
        var data = {
            piece: PIECES.king,
            team: TEAM.white
        };

        /* check normal move */
        check_avail_area(pos, data, ["a5", "b4", "a4", "c4", "c5", "c6", "b6", "a6"]);

        /* check at the edge of own team */
        pos = "a1";
        check_avail_area(pos, data, []);

        /* check at the edge of enemy team */
        pos = "a8";
        check_avail_area(pos, data, ["b8", "b7", "a7"]);

        /* check at the middle edge */
        pos = "h5";
        check_avail_area(pos, data, ["h4", "h6", "h4", "g4", "g5"]);

    });

    /* Should be last test
     * TODO: find a better way as window is not available in after() */
    it('Collect coverage', function() {
        if (!fs.existsSync("coverage")) fs.mkdirSync("coverage");
        var report_fd = fs.openSync("coverage/coverage1.json", "w");
        fs.writeFileSync(report_fd, JSON.stringify(window.__coverage__));
    });
});
