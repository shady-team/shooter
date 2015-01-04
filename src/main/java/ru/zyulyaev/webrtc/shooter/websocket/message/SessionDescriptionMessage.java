package ru.zyulyaev.webrtc.shooter.websocket.message;

import com.google.gson.JsonObject;

/**
 * Created by nikita on 04.01.15.
 */
public class SessionDescriptionMessage {
    private String id;
    private JsonObject description;

    SessionDescriptionMessage() { /* for gson */ }

    public SessionDescriptionMessage(String id, JsonObject description) {
        this.id = id;
        this.description = description;
    }

    public String getId() {
        return id;
    }

    public JsonObject getDescription() {
        return description;
    }
}
