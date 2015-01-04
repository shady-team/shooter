package ru.zyulyaev.webrtc.shooter.websocket;

import org.springframework.web.socket.WebSocketSession;

/**
 * Created by nikita on 03.01.15.
 */
public interface WebSocketMessageHandler<T> {
    void handle(WebSocketSession session, T message) throws Exception;

    String acceptableType();

    Class<T> getMessageClass();
}
