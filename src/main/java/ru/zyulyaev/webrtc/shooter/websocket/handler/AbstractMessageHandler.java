package ru.zyulyaev.webrtc.shooter.websocket.handler;

import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.MessageUtils;
import ru.zyulyaev.webrtc.shooter.websocket.WebSocketMessageHandler;

import java.io.IOException;

/**
 * Created by nikita on 04.01.15.
 */
public abstract class AbstractMessageHandler<T> implements WebSocketMessageHandler<T> {
    private final String type;
    private final Class<T> clazz;

    protected AbstractMessageHandler(String type, Class<T> clazz) {
        this.type = type;
        this.clazz = clazz;
    }

    protected void send(WebSocketSession session, String type, Object data) throws IOException {
        session.sendMessage(MessageUtils.toTextMessage(type, data));
    }

    @Override
    public String acceptableType() {
        return type;
    }

    @Override
    public Class<T> getMessageClass() {
        return clazz;
    }
}
