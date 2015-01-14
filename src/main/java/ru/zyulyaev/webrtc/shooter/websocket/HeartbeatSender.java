package ru.zyulyaev.webrtc.shooter.websocket;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.keygen.BytesKeyGenerator;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.handler.SessionManagerHandler;

import java.io.IOException;
import java.nio.ByteBuffer;

/**
 * Created by nikita on 14.01.15.
 */
@Component
public class HeartbeatSender {
    private static final Log logger = LogFactory.getLog(HeartbeatSender.class);

    @Autowired
    private SessionManagerHandler sessionManager;
    private final BytesKeyGenerator payloadGenerator = KeyGenerators.secureRandom();

    @Scheduled(fixedRate = 1000)
    public void sendHeartbeat() {
        for (WebSocketSession session : sessionManager.getSessions()) {
            try {
                session.sendMessage(new PingMessage(ByteBuffer.wrap(payloadGenerator.generateKey())));
            } catch (IOException e) {
                logger.warn("Error sending ping message", e);
            }
        }
    }
}
