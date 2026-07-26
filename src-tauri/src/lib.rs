use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio, ChildStdin, ChildStdout};
use std::io::{Write, BufRead, BufReader};
use std::sync::Mutex;
use tauri::State;

// Simple state to hold the python worker process
struct PythonWorker {
    stdin: Mutex<Option<ChildStdin>>,
    stdout: Mutex<Option<BufReader<ChildStdout>>>,
}

#[derive(Serialize, Deserialize)]
struct AiRequest {
    image_path: String,
    classes: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct AiResponse {
    status: String,
    annotations: serde_json::Value,
    image_size: serde_json::Value,
    message: Option<String>,
}

#[tauri::command]
async fn run_ai_pipeline(
    payload: AiRequest,
    worker: State<'_, PythonWorker>,
) -> Result<AiResponse, String> {
    let mut stdin_guard = worker.stdin.lock().unwrap();
    let mut stdout_guard = worker.stdout.lock().unwrap();

    let stdin = stdin_guard.as_mut().ok_or("Python worker stdin not available")?;
    let stdout = stdout_guard.as_mut().ok_or("Python worker stdout not available")?;

    // Convert request to single-line JSON string
    let req_str = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    
    // Write to python worker stdin
    writeln!(stdin, "{}", req_str).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;

    // Read response line from stdout
    let mut response_line = String::new();
    stdout.read_line(&mut response_line).map_err(|e| e.to_string())?;

    if response_line.trim().is_empty() {
        return Err("Python worker crashed or returned empty response".to_string());
    }

    // Parse JSON
    let response: AiResponse = serde_json::from_str(&response_line)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(response)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start Python Worker
    // Note: In production, the path will need to be resolved correctly.
    // For local dev, we use CARGO_MANIFEST_DIR to locate the backend reliably.
    let backend_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("CARGO_MANIFEST_DIR should have a parent")
        .join("backend");

    let child_res = Command::new("uv")
        .arg("run")
        .arg("worker.py")
        .current_dir(backend_dir) // Run inside the backend directory to use its pyproject.toml
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn();

    let worker = match child_res {
        Ok(mut child) => {
            let stdin = child.stdin.take().expect("Failed to open stdin");
            let stdout = child.stdout.take().expect("Failed to open stdout");
            PythonWorker {
                stdin: Mutex::new(Some(stdin)),
                stdout: Mutex::new(Some(BufReader::new(stdout))),
            }
        },
        Err(e) => {
            println!("Failed to start python worker: {}", e);
            PythonWorker {
                stdin: Mutex::new(None),
                stdout: Mutex::new(None),
            }
        }
    };

    tauri::Builder::default()
        .manage(worker)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_ai_pipeline])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
