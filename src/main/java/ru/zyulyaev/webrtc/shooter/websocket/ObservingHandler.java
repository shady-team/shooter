package ru.zyulyaev.webrtc.shooter.websocket;

import com.google.gson.Gson;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.AnnotationAwareOrderComparator;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import javax.annotation.PostConstruct;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Created by nikita on 03.01.15.
 */
@Component
public class ObservingHandler extends TextWebSocketHandler {
    private static final Log logger = LogFactory.getLog(ObservingHandler.class);

    private final Gson gson = new Gson();
    private final Map<String, WebSocketMessageHandler<?>> handlers = new HashMap<>();

    @Autowired
    private List<WebSocketConnectionEstablishedHandler> connectedHandlers;
    @Autowired
    private List<WebSocketConnectionClosedHandler> disconnectedHandlers;

    @Autowired
    public ObservingHandler(List<WebSocketMessageHandler> handlers) {
        for (WebSocketMessageHandler handler : handlers) {
            this.handlers.put(handler.acceptableType(), handler);
        }
    }

    @PostConstruct
    protected void init() {
        Collections.sort(connectedHandlers, AnnotationAwareOrderComparator.INSTANCE);
        Collections.sort(disconnectedHandlers, AnnotationAwareOrderComparator.INSTANCE);
    }

    private <T> void handle(WebSocketSession session, WebSocketMessageHandler<T> handler, String content) throws Exception {
        handler.handle(session, gson.fromJson(content, handler.getMessageClass()));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String[] parts = message.getPayload().split("\n\n", 2);
        String type = parts[0];
        String content = parts[1];
        if (!handlers.containsKey(type)) {
            logger.debug("Unrecognized client message type '" + type + "' with content \n" + content);
        } else {
            handle(session, handlers.get(type), content);
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        for (WebSocketConnectionEstablishedHandler handler : connectedHandlers)
            handler.onClientConnected(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        for (WebSocketConnectionClosedHandler handler : disconnectedHandlers)
            handler.onClientDisconnected(session, status);
    }
}
