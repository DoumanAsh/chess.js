const assert = require('assert');
const server = require("./../src/server.js");
const io = require('socket.io-client');
const request = require('supertest');

describe('Server:', function() {
    var PORT = 5000;
    var URL = 'http://localhost:5000';
    var client;

    beforeEach(function() {
        server.listen(PORT);
    });

    afterEach(function(done) {
        client.disconnect();
        server.close(done);
    });

    it('Party create', function(done) {
        var expect = {
            name: "test_party",
            side: "white",
            type: "private"
        };

        request(URL).get('/')
                    .expect(200)
                    .end(function(err, res) { if (err) return done(err);});

        request(URL).get('/?game=test_party&side=white')
                    .expect(404)
                    .end(function(err, res) { if (err) return done(err);});

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
            done(assert.fail("Create party failed"));
        });
    });

    it('Party create', function(done) {
        var expect = {
            name: "test_party",
            side: "white",
            type: "private"
        };

        client = io.connect(URL);

        client.on('connect', function(data) {
            client.emit("party_create", expect.name, expect.side, expect.type);
        });

        client.on("create_ok", function(name, side) {
            done();
        });

        client.on("create_fail", function(name, side) {
            done();
        });

    });
})
