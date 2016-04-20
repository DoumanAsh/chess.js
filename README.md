# Chess.js

[![Build Status](https://secure.travis-ci.org/DoumanAsh/chess.js.png)](http://travis-ci.org/DoumanAsh/chess.js)
[![Coverage Status](https://coveralls.io/repos/github/DoumanAsh/chess.js/badge.svg?branch=master)](https://coveralls.io/github/DoumanAsh/chess.js?branch=master)

My second learning attempt of bundle Node.js/express.js/socket.io

This time around we have simple multiplayer chess game.

## How-to

1. Start server.
2. Connect to the server over port 8080.
3. Register a game and invite your friend over.

## TODO

- [ ] Chess rules implementation
    - [x] Basic moves.
    - [x] Castling.
    - [x] Pawn promotion.
    - [x] En passant.
    - [x] Marking checked king.
    - [ ] Check for check-mate.
- [ ] Implement shared games
    - [x] Invite-based multiplayer.
    - [x] Synchronization upon reconnect(if both are disconnected then game is lost).
    - [ ] Public games with random enemies in FIFO.
    - [ ] Hotseat.
- [ ] UI
    - [x] General
    - [x] Game title
    - [ ] Counter of eaten figures.
    - [ ] Timer.
    - [x] Add row\column names
- [ ] Tests
    - [ ] Server side
        - [ ] Server itself
        - [x] Games Class
    - [ ] Client side

