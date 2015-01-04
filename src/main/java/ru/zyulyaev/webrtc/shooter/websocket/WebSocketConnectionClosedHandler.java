package ru.zyulyaev.webrtc.shooter.websocket;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

/**
 * Created by nikita on 03.01.15.
 */
public interface WebSocketConnectionClosedHandler {
    void onClientDisconnected(WebSocketSession session, CloseStatus status) throws Exception;
}
