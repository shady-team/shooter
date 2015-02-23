<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
    <head>
        <title>Index</title>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://rawgit.com/webrtc/adapter/master/adapter.js"></script>
        <link rel="stylesheet" type="text/css" href="css/normalize.css">
        <link rel="stylesheet" type="text/css" href="/css/main.css"/>
    </head>
    <body>
        <div class="fullscreen" id="game-container">
        </div>
        <div id="login-popup" class="popup popup-small">
            <form id="login-form">
                <div class="popup--title">
                    <h4>Shadow shooter</h4>
                </div>
                <div class="popup--content">
                    <input id="nickname" type="text" placeholder="Enter nickname..."/>
                </div>
                <div class="popup--controls">
                    <button id="submit-button" class="button-apply" type="submit">Login</button>
                </div>
            </form>
        </div>
        <div id="post-login-popup" class="popup popup-big">
            <div class="popup--title">
                <h4>Shadow shooter: <span id="login-display"></span></h4>
            </div>
            <div class="popup--content">
                <button class="button-apply" id="host">Host a game</button>
                <i>You shouldn't move this tab to the background if you host a game</i>
                <h5>Hosts:</h5>
                <ul id="hosts">
                </ul>
                <h5>Peers:</h5>
                <ul id="peers">
                </ul>
            </div>
        </div>
        <div class="chat" id="chat">
            <div class="chat--messagesWrapper">
                <div class="chat--messages"></div>
            </div>
            <input class="chat--input" type="text" placeholder="Enter message..."/>
        </div>

        <% if ("dev".equals(request.getParameter("mod"))) { %>
        <script src="/js/goog.debug.js"></script>
        <script src="/js/script.js"></script>
        <script src="/js/webgl-debug.js"></script>
        <% } else { %>
        <script src="/js/script.min.js"></script>
        <% } %>
    </body>
</html>
