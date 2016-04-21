"use strict";
const assert = require('assert');
const io = require('socket.io-client');

describe('Server:', function() {
    var server = require("./../src/server.js");
    var PORT = 5000;
    var URL = 'http://localhost:5000';
    var client;

    var test_party = {
        name: "test_party",
        side: "white",
        type: "private"
    };

    var test_join = {
        name: "test_party",
        side: "black"
    };

    before(function() {
        server.listen(PORT);
    });

    after(function() {
        server.close();
    });

    beforeEach(function() {
    });

    afterEach(function() {
        var used_events = [
            "create_ok",
            "create_fail",
            "join_ok",
            "join_fail"
        ];

        used_events.forEach(function(unsub_event) {
            client.removeAllListeners(unsub_event);
        });

        client.disconnect();
    });

    it('Party create', function(done) {
        var expect = test_party;

        client = io.connect(URL);

        client.on('connect', function(data) {
            client.emit("party_create", expect.name, expect.side, expect.type);
        });

        client.on("create_ok", function(name, side) {
            try {
                assert.equal(name, expect.name);
                assert.equal(side, expect.side);
                done();
            }
            catch (error) {
                done(error);
            }
        });

        client.on("create_fail", function(name, side) {
            done(new Error("Create party failed"));
        });
    });

    it('Party join', function(done) {
        client = io.connect(URL);

        client.on('connect', function(data) {
            client.emit("party_create", test_party.name, test_party.side, test_party.type);
        });

        client.on("create_ok", function(name, side) {
            var client_join = io.connect(URL);

            client_join.on('connect', function(data) {
                client_join.emit("party_join", test_join.name, test_join.side);
            });

            client_join.on("join_ok", function() {
                client_join.disconnect();
                done();
            });

            client_join.on("join_fail", function() {
                client_join.disconnect();
                done(new Error("Join party failed"));
            });
        });

        client.on("create_fail", function() {
            done(new Error("Create party failed"));
        });

    });

    it('Party the same join Negative', function(done) {
        client = io.connect(URL);

        client.on('connect', function(data) {
            client.emit("party_create", test_party.name, test_party.side, test_party.type);
        });

        client.on("create_ok", function(name, side) {
            var client_join = io.connect(URL);

            client_join.on('connect', function(data) {
                client_join.emit("party_join", test_party.name, test_party.side);
            });

            client_join.on("join_ok", function() {
                client_join.disconnect();
                done(new Error("Join party for existing side MUST fail"));
            });

            client_join.on("join_fail", function() {
                client_join.disconnect();
                done();
            });
        });

        client.on("create_fail", function() {
            done(new Error("Create party failed"));
        });

    });

    /**
     * We create party and check that it is successfully done.
     * After that override callbacks for party creation to
     * check that the second will fail */
    it('Party double create Negative', function(done) {
        var expect = test_party;

        client = io.connect(URL);

        var create_ok_second = function(name, side) {
            done(new Error("Second create ok is not supposed to happen"));
        };

        var create_fail_second = function(name, side) {
            done();
        };

        var create_ok_first = function(name, side) {
            client.removeAllListeners("create_ok");
            client.removeAllListeners("create_fail");

            client.on("create_ok", create_ok_second);
            client.on("create_fail", create_fail_second);

            client.emit("party_create", expect.name, expect.side, expect.type);
        };

        var create_fail_first = function() {
            done(new Error("First create party failed"));
        };

        client.on('connect', function(data) {
            client.emit("party_create", expect.name, expect.side, expect.type);
        });

        client.on("create_ok", create_ok_first);
        client.on("create_fail", create_fail_first);

    });

    /**
     * The same logic as in above test for create.
     */
    it('Party join from two clients', function(done) {
        client = io.connect(URL);

        client.on('connect', function(data) {
            client.emit("party_create", test_party.name, test_party.side, test_party.type);
        });

        client.on("create_ok", function() {
            var client_join = io.connect(URL);

            client_join.on("join_fail", function() {
                done(new Error("First join fails"));
            });

            client_join.on("join_ok", function() {
                var client_join2 = io.connect(URL);

                client_join.removeAllListeners("join_ok");
                client_join.removeAllListeners("join_fail");

                client_join2.on("join_fail", function() {
                    client_join.disconnect();
                    client_join2.disconnect();
                    done();
                });

                client_join2.on("join_ok", function() {
                    client_join.disconnect();
                    client_join2.disconnect();
                    done(new Error("Join from different client MUST fail"));
                });

                client_join2.emit("party_join", test_join.name, test_join.side);

            });

            client_join.emit("party_join", test_join.name, test_join.side);

        });

        client.on("create_fail", function() {
            done(new Error("Create party failed"));
        });
    });


});

describe('Party play suite:', function() {
    var server = require("./../src/server.js");
    var PORT = 5000;
    var URL = 'http://localhost:5000';
    var client, client_op;

    var test_party = {
        name: "test_party",
        side: "white",
        type: "private"
    };

    var test_join = {
        name: "test_party",
        side: "black"
    };

    var side_to_enum = {
        "black": 7,
        "white": 2
    };

    before(function(done) {
        server.listen(PORT);
        client = io.connect(URL);

        client.on('connect', function() {
            client.on("create_ok", function(name, side) {
                client_op = io.connect(URL);

                client_op.on('connect', function(data) {
                    client_op.emit("party_join", test_join.name, test_join.side);
                });

                client_op.on("join_fail", function() {
                    done(new Error("Failed to join party"));
                });

                client_op.on("join_ok", function() {
                    done();
                });

            });

            client.on("create_fail", function() {
                done(new Error("Failed to create party"));
            });

            client.emit("party_create", test_party.name, test_party.side, test_party.type);
        });
    });

    after(function() {
        client.disconnect();
        client_op.disconnect();
        server.close();
    });

    it("Party move first", function(done) {
        var first_move_data = {
            name: test_party.name,
            side: side_to_enum[test_party.side],
            old_pos: "e1",
            new_pos: "e2",
            finished: false
        };

        var expect_data = {
            side: first_move_data.side,
            old_pos: first_move_data.old_pos,
            new_pos: first_move_data.new_pos,
            finished: first_move_data.finished
        };

        client_op.on("move", function(data) {
            try {
                assert.deepEqual(data, expect_data);
                done();
            }
            catch (error) {
                done(error);
            }
        });

        client.emit("move", first_move_data);
    });

    it("Party move second", function(done) {
        var second_move_data = {
            name: test_join.name,
            side: side_to_enum[test_join.side],
            old_pos: "e8",
            new_pos: "e7",
            finished: true
        };

        var expect_data = {
            side: second_move_data.side,
            old_pos: second_move_data.old_pos,
            new_pos: second_move_data.new_pos,
            finished: second_move_data.finished
        };

        client.on("move", function(data) {
            try {
                assert.deepEqual(data, expect_data);
                done();
            }
            catch (error) {
                done(error);
            }
        });

        client_op.emit("move", second_move_data);
    });

    it("Party check", function(done) {
        var data = {
            name: test_party.name,
            side: side_to_enum[test_party.side]
        };

        client_op.on("check", function() {
            done();
        });
        client.on("check", function() {
            done(new Error("Wrong receiver of check"));
        });

        client.emit("check", data);
    });

    it("Party uncheck", function(done) {
        var data = {
            name: test_party.name,
            side: side_to_enum[test_party.side],
            old_pos: "e5"
        };

        client_op.on("uncheck", function(old_pos) {
            try {
                assert(old_pos === data.old_pos);
                done();
            }
            catch(error) {
                done(error);
            }
        });

        client.on("uncheck", function() {
            done(new Error("Wrong receiver of uncheck"));
        });

        client.emit("uncheck", data);
    });

    it("Party pawn promo", function(done) {
        var data = {
            name: test_party.name,
            side: side_to_enum[test_party.side],
            new_piece: 666,
            pos: "e5"
        };

        client_op.on("pawn_promo", function(new_piece, pos) {
            try {
                assert(new_piece === data.new_piece);
                assert(pos === data.pos);
                done();
            }
            catch(error) {
                done(error);
            }
        });

        client.on("pawn_promo", function() {
            done(new Error("Wrong receiver of pawn_promo"));
        });

        client.emit("pawn_promo", data);
    });

    it("Party sync game", function(done) {
        var data = {
            name: test_party.name,
            side: side_to_enum[test_party.side],
            sync_data: {
                ololo: 666,
                powned: test_join.side
            }
        };

        client_op.on("sync_game", function(sync_data) {
            try {
                assert.deepEqual(sync_data, data.sync_data);
                done();
            }
            catch(error) {
                done(error);
            }
        });

        client.on("sync_game", function() {
            done(new Error("Wrong receiver of sync_game"));
        });

        client.emit("sync_game", data);
    });

    it("Party en passant", function(done) {
        var data = {
            name: test_party.name,
            side: side_to_enum[test_party.side],
            poor_pawn: {
                name: "Poor pawn",
                powned: test_join.side
            }
        };

        client_op.on("en_passant", function(poor_pawn) {
            try {
                assert.deepEqual(poor_pawn, data.poor_pawn);
                done();
            }
            catch(error) {
                done(error);
            }
        });

        client.on("en_passant", function() {
            done(new Error("Wrong receiver of en_passant"));
        });

        client.emit("en_passant", data);
    });
});
