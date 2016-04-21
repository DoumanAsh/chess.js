'use strict';
const PORT = 8080;
const server = require("./src/server.js");

server.listen(PORT, function () {
    console.log('Start chess.js on port ' + PORT);
});
