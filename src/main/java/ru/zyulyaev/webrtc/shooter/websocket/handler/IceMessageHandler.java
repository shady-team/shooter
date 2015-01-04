package ru.zyulyaev.webrtc.shooter.websocket.handler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.message.IceCandidateMessage;

/**
 * Created by nikita on 03.01.15.
 */
@Component
public class IceMessageHandler extends AbstractMessageHandler<IceCandidateMessage> {
    public static final String ICE_TYPE = "ice";

    @Autowired
    private SessionManagerHandler sessionManager;

    public IceMessageHandler() {
        super(ICE_TYPE, IceCandidateMessage.class);
    }

    @Override
    public void handle(WebSocketSession session, IceCandidateMessage message) throws Exception {
        WebSocketSession recipient = sessionManager.getSessionById(message.getId());
        send(recipient, ICE_TYPE, new IceCandidateMessage(session.getId(), message.getCandidate()));
    }
}
