package ru.zyulyaev.webrtc.shooter.websocket.message;

/**
 * Created by nikita on 04.01.15.
 */
public class RejectMessage {
    private String id;
    private String reason;

    RejectMessage() { /* for gson */ }

    public RejectMessage(String id, String reason) {
        this.id = id;
        this.reason = reason;
    }

    public String getId() {
        return id;
    }

    public String getReason() {
        return reason;
    }
}
