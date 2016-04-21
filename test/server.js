"use strict";
const assert = require('assert');
const server = require("./../src/server.js");
const io = require('socket.io-client');

describe('Server:', function() {
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

    beforeEach(function() {
        server.listen(PORT);
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
        server.close();
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
                    done();
                });

                client_join2.on("join_ok", function() {
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
