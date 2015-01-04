package ru.zyulyaev.webrtc.shooter.websocket.handler;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.WebSocketConnectionClosedHandler;
import ru.zyulyaev.webrtc.shooter.websocket.WebSocketConnectionEstablishedHandler;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by nikita on 03.01.15.
 */
@Component
@Order(0)
public class SessionManagerHandler implements WebSocketConnectionEstablishedHandler, WebSocketConnectionClosedHandler {
    private final Map<String, WebSocketSession> sessions = new HashMap<>();

    @Override
    public void onClientConnected(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }

    @Override
    public void onClientDisconnected(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId(), session);
    }

    public Collection<WebSocketSession> getSessions() {
        return sessions.values();
    }

    public WebSocketSession getSessionById(String id) {
        return sessions.get(id);
    }
}
