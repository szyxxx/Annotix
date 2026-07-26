use crate::db::new_id;
use crate::App;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, Query, State};
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

#[derive(Clone, Serialize, Deserialize)]
pub struct PeerUser {
    pub id: String,
    pub name: String,
    pub color: String,
}

struct Peer {
    user: PeerUser,
    tx: mpsc::UnboundedSender<String>,
}

#[derive(Default)]
pub struct Hub {
    rooms: Mutex<HashMap<String, HashMap<String, Peer>>>,
}

impl Hub {
    pub fn broadcast(&self, project_id: &str, msg: &Value) {
        let text = msg.to_string();
        let rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get(project_id) {
            for peer in room.values() {
                let _ = peer.tx.send(text.clone());
            }
        }
    }

    fn roster(&self, project_id: &str) -> Vec<PeerUser> {
        let rooms = self.rooms.lock().unwrap();
        rooms
            .get(project_id)
            .map(|room| room.values().map(|p| p.user.clone()).collect())
            .unwrap_or_default()
    }
}

#[derive(Deserialize)]
pub struct WsParams {
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub color: String,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
    Query(params): Query<WsParams>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, app, project_id, params))
}

async fn handle_socket(socket: WebSocket, app: Arc<App>, project_id: String, params: WsParams) {
    let conn_id = new_id();
    let user = PeerUser {
        id: if params.user_id.is_empty() { conn_id.clone() } else { params.user_id },
        name: if params.name.is_empty() { "Anonymous".into() } else { params.name },
        color: if params.color.is_empty() { "#635bff".into() } else { params.color },
    };

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    {
        let mut rooms = app.hub.rooms.lock().unwrap();
        rooms
            .entry(project_id.clone())
            .or_default()
            .insert(conn_id.clone(), Peer { user: user.clone(), tx });
    }
    app.hub
        .broadcast(&project_id, &json!({ "type": "presence", "users": app.hub.roster(&project_id) }));

    let (mut sink, mut stream) = socket.split();
    let send_task = tokio::spawn(async move {
        while let Some(text) = rx.recv().await {
            if sink.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
    });

    // Relay client events (e.g. {"type":"editing","image_id":...}) to the room, stamped with the sender.
    while let Some(Ok(msg)) = stream.next().await {
        if let Message::Text(text) = msg {
            if let Ok(mut value) = serde_json::from_str::<Value>(&text) {
                if let Some(obj) = value.as_object_mut() {
                    obj.insert("user".into(), serde_json::to_value(&user).unwrap());
                    app.hub.broadcast(&project_id, &value);
                }
            }
        }
    }

    {
        let mut rooms = app.hub.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(&project_id) {
            room.remove(&conn_id);
            if room.is_empty() {
                rooms.remove(&project_id);
            }
        }
    }
    app.hub
        .broadcast(&project_id, &json!({ "type": "presence", "users": app.hub.roster(&project_id) }));
    send_task.abort();
}
