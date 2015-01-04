package ru.zyulyaev.webrtc.shooter.websocket.handler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.WebSocketConnectionClosedHandler;
import ru.zyulyaev.webrtc.shooter.websocket.WebSocketConnectionEstablishedHandler;
import ru.zyulyaev.webrtc.shooter.websocket.message.HostMessage;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Created by nikita on 04.01.15.
 */
@Component
@Order(1)
public class HostManagerHandler extends AbstractMessageHandler<HostMessage>
        implements WebSocketConnectionEstablishedHandler, WebSocketConnectionClosedHandler {
    public static final String HOST_TYPE = "host";
    public static final String HOSTS_TYPE = "hosts";

    @Autowired
    private SessionManagerHandler sessionManager;

    private final Map<WebSocketSession, HostData> hosts = new HashMap<>();

    public HostManagerHandler() {
        super(HOST_TYPE, HostMessage.class);
    }

    private void refreshLists() throws IOException {
        for (WebSocketSession session : sessionManager.getSessions())
            sendHosts(session);
    }

    public void sendHosts(WebSocketSession session) throws IOException {
        send(session, HOSTS_TYPE, hosts.values().stream()
                                                    .filter(data -> !data.id.equals(session.getId()))
                                                    .collect(Collectors.toList()));
    }

    @Override
    public void handle(WebSocketSession session, HostMessage message) throws Exception {
        hosts.put(session, new HostData(session.getId(), false));
        refreshLists();
    }

    @Override
    public void onClientConnected(WebSocketSession session) throws Exception {
        sendHosts(session);
    }

    @Override
    public void onClientDisconnected(WebSocketSession session, CloseStatus status) throws Exception {
        if (hosts.remove(session) != null)
            refreshLists();
    }

    private static class HostData {
        final String id;
        final boolean secured;

        HostData(String id, boolean secured) {
            this.id = id;
            this.secured = secured;
        }
    }
}
