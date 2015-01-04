package ru.zyulyaev.webrtc.shooter.websocket.handler;

import com.google.gson.JsonElement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import ru.zyulyaev.webrtc.shooter.websocket.WebSocketConnectionClosedHandler;
import ru.zyulyaev.webrtc.shooter.websocket.WebSocketConnectionEstablishedHandler;

import java.io.IOException;
import java.util.stream.Collectors;

/**
 * Created by nikita on 03.01.15.
 */
@Component
public class ClientListSendingHandler extends AbstractMessageHandler<JsonElement>
        implements WebSocketConnectionEstablishedHandler,
        WebSocketConnectionClosedHandler {
    public static final String PEERS_TYPE = "peers";

    @Autowired
    private SessionManagerHandler sessionManager;

    public ClientListSendingHandler() {
        super(PEERS_TYPE, JsonElement.class);
    }

    @Override
    public void onClientConnected(WebSocketSession session) throws Exception {
        refreshLists();
    }

    @Override
    public void onClientDisconnected(WebSocketSession session, CloseStatus status) throws Exception {
        refreshLists();
    }

    private void refreshLists() throws IOException {
        for (WebSocketSession client : sessionManager.getSessions())
            sendList(client);
    }

    private void sendList(WebSocketSession client) throws IOException {
        send(
                client,
                PEERS_TYPE,
                sessionManager.getSessions().stream()
                        .filter(ws -> ws != client)
                        .map(ws -> new ClientData(ws.getId(), ws.getAttributes().get("nickname").toString()))
                        .collect(Collectors.toList())
        );
    }

    @Override
    public void handle(WebSocketSession session, JsonElement message) throws Exception {
        sendList(session);
    }

    private static class ClientData {
        String id;
        String nickname;

        public ClientData(String id, String nickname) {
            this.id = id;
            this.nickname = nickname;
        }
    }
}
