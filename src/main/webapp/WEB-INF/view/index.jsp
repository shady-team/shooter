<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
    <head>
        <title>Index</title>
        <script src="https://apprtc.appspot.com/js/adapter.js"></script>
        <link rel="stylesheet" type="text/css" href="/css/main.css"/>
    </head>
    <body>
        <h1>Sample WebRTC web application</h1>
        <div class="column column-1">
            <form id="login-form">
                <label for="nickname">Nickname:</label> <input id="nickname" name="nickname" type="text"/>
                <br/>
                <button id="submit-button" type="submit">Login</button>
            </form>

            <div id="post-login" style="display: none">
                <div class="login">Login: <span id="login"></span></div>
                <button id="host">Host a game</button>

                <h3>Peers:</h3>
                <ul id="peers">
                </ul>

                <h3>Hosts:</h3>
                <ul id="hosts">
                </ul>
            </div>
        </div>
        <div class="column column-2">
            <canvas id="field" width="640" height="480"></canvas>
        </div>

        <% if ("dev".equals(request.getParameter("mod"))) { %>
        <script src="/js/script.js"></script>
        <script src="/js/webgl-debug.js"></script>
        <% } else { %>
        <script src="/js/script.min.js"></script>
        <% } %>
    </body>
</html>
