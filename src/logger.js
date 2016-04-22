'use strict';
var trace;

if (process.env.LOG === "true") {
    var util = require('util');
    trace = function() {
        console.log("[%s]: %s", (new Date()).toLocaleTimeString(), util.format.apply(this, arguments));
    };
}
else {
    trace = function() {};
}

module.exports = trace;
