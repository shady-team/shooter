package ru.zyulyaev.webrtc.shooter.websocket.handler;

import com.google.gson.JsonElement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

/**
 * Created by nikita on 04.01.15.
 */
@Component
public class HostsSendingHandler extends AbstractMessageHandler<JsonElement> {
    @Autowired
    private HostManagerHandler hostManager;

    public HostsSendingHandler() {
        super(HostManagerHandler.HOSTS_TYPE, JsonElement.class);
    }

    @Override
    public void handle(WebSocketSession session, JsonElement message) throws Exception {
        hostManager.sendHosts(session);
    }
}
