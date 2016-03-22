var CANVAS;

var WHITE = "#ffffff"
var BLACK = "#000000";

console.log("chess.js load");

function chess_init() {
    console.log("Chess board init");
    CANVAS = document.getElementById("chess_board");
    var context = CANVAS.getContext("2d");
    var block_size = CANVAS.width / 8;

    //draw board itself
    for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 8; col++) {

            if ((row + col) % 2) {
                context.fillStyle = BLACK;
            }
            else {
                context.fillStyle = WHITE;
            }

            context.fillRect(row * block_size, col * block_size, block_size, block_size);
        }
    }

    context.strokeStyle = "black";
    context.stroke();
}
