package ru.zyulyaev.webrtc.shooter.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.WebSocketConfigurationSupport;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.stream.Stream;

/**
 * Created by nikita on 03.01.15.
 */
@Configuration
@ComponentScan("ru.zyulyaev.webrtc.shooter.websocket")
public class WebSocketConfig extends WebSocketConfigurationSupport {
    @Autowired
    private WebSocketHandler webSocketHandler;

    @Override
    protected void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/observer")
                .addInterceptors(new RequestParametersInterceptor());
    }

    private static class RequestParametersInterceptor implements HandshakeInterceptor {
        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
            Stream.of(request.getURI().getQuery().split("&"))
                    .forEach(eq -> {
                        String[] parts = eq.split("=");
                        if (parts.length == 2)
                            attributes.put(parts[0], parts[1]);
                    });
            return true;
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
        }
    }
}
