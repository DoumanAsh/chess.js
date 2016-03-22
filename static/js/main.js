///Sets initial pieces at default positions
function chess_init() {
    console.log("Chess init");
    var figure_map = {
        a: "rook",
        b: "knight",
        c: "bishop",
        d: "queen",
        e: "king",
        f: "bishop",
        g: "knight",
        h: "rook"
    }

    //black
    for (var col of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
        document.getElementById(col + 8).className += " black_" + figure_map[col];
        document.getElementById(col + 7).className += " black_pawn";
    }

    //white
    for (var col of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
        document.getElementById(col + 1).className += " white_" + figure_map[col];
        document.getElementById(col + 2).className += " white_pawn";
    }
}
