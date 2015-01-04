package ru.zyulyaev.webrtc.shooter.websocket.handler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.message.RejectMessage;

/**
 * Created by nikita on 04.01.15.
 */
@Component
public class RejectMessageHandler extends AbstractMessageHandler<RejectMessage> {
    public static final String REJECT_TYPE = "reject";

    @Autowired
    private SessionManagerHandler sessionManager;

    protected RejectMessageHandler() {
        super(REJECT_TYPE, RejectMessage.class);
    }

    @Override
    public void handle(WebSocketSession session, RejectMessage message) throws Exception {
        WebSocketSession recipient = sessionManager.getSessionById(message.getId());
        send(recipient, REJECT_TYPE, new RejectMessage(session.getId(), message.getReason()));
    }
}
