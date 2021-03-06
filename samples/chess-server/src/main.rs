use std::env;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;

use opcua_server::prelude::*;

mod game;

// These are squares on the board which will become variables with the same
// name
const BOARD_SQUARES: [&'static str; 64] = [
    "a8", "b8", "c8", "d8", "e8", "f8", "g8", "h8",
    "a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7",
    "a6", "b6", "c6", "d6", "e6", "f6", "g6", "h6",
    "a5", "b5", "c5", "d5", "e5", "f5", "g5", "h5",
    "a4", "b4", "c4", "d4", "e4", "f4", "g4", "h4",
    "a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3",
    "a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2",
    "a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1",
];

fn default_engine_path() -> String {
    // This is the default chess engine that will be launched absent of one being passed on the
    // command line.
    String::from(if cfg!(windows) { "stockfish_9_x32.exe" } else { "stockfish" })
}

fn main() {
    let engine_path = if env::args().len() > 1 {
        env::args().nth(1).unwrap()
    } else {
        default_engine_path()
    };
    println!("Launching chess engine \"{}\"", engine_path);
    let game = Arc::new(Mutex::new(game::Game::new(&engine_path)));

    // Create an OPC UA server with sample configuration and default node set
    let server = Server::new(ServerConfig::load(&PathBuf::from("../server.conf")).unwrap());

    let address_space = server.address_space();

    {
        let mut address_space = address_space.write().unwrap();
        let board_node_id = address_space
            .add_folder("Board", "Board", &AddressSpace::objects_folder_id())
            .unwrap();

        for &square in BOARD_SQUARES.iter() {
            let browse_name = square;
            let node_id = NodeId::new(2, square);
            let _ = address_space.add_variable(Variable::new(&node_id, browse_name, browse_name, "", 0u8), &board_node_id);
            let browse_name = format!("{}.highlight", square);
            let node_id = NodeId::new(2, browse_name.clone());
            let _ = address_space.add_variable(Variable::new(&node_id, browse_name, "", "", false), &board_node_id);
        }

        let game = game.lock().unwrap();
        update_board_state(&game, &mut address_space);
    }

    // Spawn a thread for the game which will update server state

    // Each variable will hold a value representing what's in the square. A client can subscribe to the content
    // of the variables and observe games being played.

    thread::spawn(move || {
        use std::time::Duration;

        let sleep_time = Duration::from_millis(1500);
        let mut game = game.lock().unwrap();
        loop {
            game.set_position();
            let bestmove = game.bestmove().unwrap();

            // uci is a wonderfully terrible specification as evidenced by the way various chess engines 
            // return no-bestmove answers
            let end_game = bestmove == "(none)" || bestmove == "a1a1" || bestmove == "NULL" || bestmove == "0000";
            if end_game || game.half_move_clock >= 50 {
                println!("Resetting the game - best move = {}, half move clock = {}", bestmove, game.half_move_clock);
                // Reset the board
                game.reset();
            } else {
                println!("best move = {}", bestmove);
                game.make_move(bestmove);
                game.print_board();

                {
                    let mut address_space = address_space.write().unwrap();
                    update_board_state(&game, &mut address_space);
                }
            }

            thread::sleep(sleep_time);
        }
    });

    // Run the server. This does not ordinarily exit so you must Ctrl+C to terminate
    server.run();
}

fn update_board_state(game: &game::Game, address_space: &mut AddressSpace) {
    for square in BOARD_SQUARES.iter() {
        // Piece on the square
        let square_value = game.square_from_str(square);
        let node_id = NodeId::new(2, *square);

        let now = DateTime::now();
        let _ = address_space.set_variable_value(node_id, square_value as u8, &now, &now);

        // Highlight the square
        let node_id = NodeId::new(2, format!("{}.highlight", square));
        let highlight_square = if let Some(ref last_move) = game.last_move {
            last_move.contains(square)
        } else {
            false
        };
        let _ = address_space.set_variable_value(node_id, highlight_square, &now, &now);
    }
}
