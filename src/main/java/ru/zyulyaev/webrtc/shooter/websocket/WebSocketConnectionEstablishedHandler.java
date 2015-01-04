package ru.zyulyaev.webrtc.shooter.websocket;

import org.springframework.web.socket.WebSocketSession;

/**
 * Created by nikita on 03.01.15.
 */
public interface WebSocketConnectionEstablishedHandler {
    void onClientConnected(WebSocketSession session) throws Exception;
}
