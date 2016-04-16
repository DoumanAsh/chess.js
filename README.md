# Chess.js

My second learning attempt of bundle Node.js/express.js/socket.io

This time around we have simple multiplayer chess game.

## How-to

1. Start server.
2. Connect to the server over port 8080.
3. Register a game and invite your friend over.

## TODO

- [x] Chess rules implementation
    - [x] Basic moves.
    - [x] Castling.
    - [x] Pawn promotion.
    - [x] En passant.
    - [x] Marking checked king.
    - [ ] Check for check-mate.
- [x] Implement shared games
    - [x] Invite-based multiplayer.
    - [x] Synchronization upon reconnect(if both are disconnected then game is lost).
    - [ ] Public games with random enemies in FIFO.
    - [ ] Hotseat.

