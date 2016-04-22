'use strict';
const PORT = 8080;
//process.env.LOG = "true";
const server = require("./src/server.js");

server.listen(PORT, function () {
    console.log('Start chess.js on port ' + PORT);
});
