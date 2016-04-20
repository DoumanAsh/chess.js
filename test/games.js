const assert = require('chai').assert;
const util = require("util");

describe('Games class:', function() {
    var GAMES;
    var games = require("./../src/games.js");

    before(function() {
        GAMES = new games();
    });

    after(function() {
    });

    describe('Check maps suite:', function () {
        it('Positive enum_side', function() {
            assert.equal(GAMES.enum_side["7"], "black");
            assert.equal(GAMES.enum_side["2"], "white");
        });

        it('Negative enum_side', function() {
            assert.equal(GAMES.enum_side["0"], undefined);
            assert.equal(GAMES.enum_side.white, undefined);
        });

        it('Verify op_side_map', function() {
            assert.equal(GAMES.op_side_map.white, "black");
            assert.equal(GAMES.op_side_map.black, "white");
        });

        it('Negative op_side_map', function() {
            assert.equal(GAMES.op_side_map["whit"], undefined);
        });
    });

    describe('Game management suite:', function () {
        var new_game_data, new_user_data;

        var new_game = function(expected) {
            if (expected === undefined) expected = true;
            assert(GAMES.create(new_game_data.name,
                                new_game_data.type,
                                new_game_data.side,
                                new_game_data.socket) === expected);
        };

        var new_user = function(expected) {
            if (expected === undefined) expected = true;
            assert(GAMES.add_user(new_user_data.name,
                                  new_user_data.side,
                                  new_user_data.socket) === expected);
        };

        beforeEach(function() {
            new_game_data = {
                name: "test",
                type: "type1",
                side: "white",
                socket: {
                    name: "socket1"
                }
            };

            new_user_data = {
                name: "test",
                side: "black",
                socket: {
                    name: "socket_user"
                }
            };

        });

        afterEach(function() {
            GAMES.inner = {};
        });

        it('Create game', function() {
            var expect = new_game_data;

            new_game();

            /* Check that game is added */
            assert(expect.name in GAMES.inner);
            assert(GAMES.is_game(expect.name));
            assert(GAMES.get_game(expect.name));

            /* Check that its attributes are correct */
            assert(GAMES.inner[expect.name].type === expect.type);
            assert(expect.side in GAMES.inner[expect.name]);
            assert(!GAMES.is_side_free(expect.name, expect.side));
            assert.equal(GAMES.inner[expect.name][expect.side].name, expect.socket.name);

            /* Check that socket is modified */
            assert.equal(expect.socket.chess_side, expect.side);
            assert.equal(expect.socket.chess_name, expect.name);

            /* Check opposite socket getter */
            assert(GAMES.get_another_socket(expect.name, expect.side) === undefined);

        });

        it('Add user to game', function() {
            var expect = new_user_data;

            new_game();
            new_user();

            /* Check that user is added */
            assert(expect.side in GAMES.inner[expect.name]);
            assert(GAMES.is_side_free(expect.name, expect.side) === false);
            assert.equal(GAMES.inner[expect.name][expect.side].name, expect.socket.name);

            /* Check that socket is modified */
            assert.equal(expect.socket.chess_side, expect.side);
            assert.equal(expect.socket.chess_name, expect.name);

            /* Check opposite socket getter */
            assert(GAMES.get_another_socket(expect.name, expect.side) === new_game_data.socket);
            assert(GAMES.get_another_socket(new_game_data.name, new_game_data.side) === expect.socket);

        });

        /*
        JFYI: it might fail in strict mode on older chai libraries
        it('Get another socket Negative', function() {
            var throw_fn = function() {
                GAMES.get_another_socket(new_game_data.name, new_game_data.side);
            };

            var expect_msg = util.format("get_another_socket(name=%s, cur_side=%s): No such game", new_game_data.name, new_game_data.side);

            assert.throws(throw_fn, expect_msg);
        });
        */

        it('Create game Negative', function() {
            new_game();
            new_game(false);
        });

        it('Add user to game Negative', function() {
            new_game();
            new_user();
            new_user(false);
        });

        it('Remove user/game', function() {
            new_game();
            new_user();

            GAMES.user_discon(new_user_data.name, new_user_data.side);

            /* Side remains as key, but returns undefined */
            assert(new_user_data.side in GAMES.inner[new_user_data.name]);
            assert(GAMES.inner[new_user_data.name][new_user_data.side] === undefined);
            assert(GAMES.is_side_free(new_user_data.name, new_user_data.side));

            GAMES.del_game(new_user_data.name);
            assert(!(new_user_data.name in GAMES.inner));
            assert(!GAMES.is_game(new_user_data.name));
            assert(GAMES.get_game(new_user_data.name) === undefined);
        });
    });
});

