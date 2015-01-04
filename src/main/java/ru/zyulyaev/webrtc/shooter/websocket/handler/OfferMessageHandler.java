package ru.zyulyaev.webrtc.shooter.websocket.handler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.message.SessionDescriptionMessage;

/**
 * Created by nikita on 03.01.15.
 */
@Component
public class OfferMessageHandler extends AbstractMessageHandler<SessionDescriptionMessage> {
    public static final String OFFER_TYPE = "offer";

    @Autowired
    private SessionManagerHandler sessionManager;

    public OfferMessageHandler() {
        super(OFFER_TYPE, SessionDescriptionMessage.class);
    }

    @Override
    public void handle(WebSocketSession session, SessionDescriptionMessage message) throws Exception {
        WebSocketSession recipient = sessionManager.getSessionById(message.getId());
        send(recipient, OFFER_TYPE, new SessionDescriptionMessage(session.getId(), message.getDescription()));
    }
}
