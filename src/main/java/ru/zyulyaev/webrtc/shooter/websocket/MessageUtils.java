package ru.zyulyaev.webrtc.shooter.websocket;

import com.google.gson.Gson;
import org.springframework.web.socket.TextMessage;

/**
 * Created by nikita on 03.01.15.
 */
public class MessageUtils {
    private static final Gson GSON = new Gson();

    public static TextMessage toTextMessage(String type, Object data) {
        return new TextMessage(type + "\n\n" + GSON.toJson(data));
    }

    private MessageUtils() {}
}
