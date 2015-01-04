package ru.zyulyaev.webrtc.shooter.websocket.message;

import com.google.gson.JsonObject;

/**
 * Created by nikita on 04.01.15.
 */
public class IceCandidateMessage {
    private String id;
    private JsonObject candidate;

    IceCandidateMessage() { /* for gson */ }

    public IceCandidateMessage(String id, JsonObject candidate) {
        this.id = id;
        this.candidate = candidate;
    }

    public String getId() {
        return id;
    }

    public JsonObject getCandidate() {
        return candidate;
    }
}
