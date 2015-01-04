(function (exports) {
    exports.GameServer = GameServer;
    exports.GameClient = GameClient;
    exports.RemoteServer = RemoteServer;
    exports.WebRTCConnectorAdapter = WebRTCConnectorAdapter;

    function GameServer(connector) {
        this._connector = connector;
        this._clients = [];
        initServerEvents.call(this);
    }

    function initServerEvents() {
        var connector = this._connector;
        var clients = this._clients;
        connector.onOpen = function (id) {
            clients.push(id);
        };
        connector.onClose = function (id) {
            clients.splice(clients.indexOf(id), 1);
        };
        connector.onMessage = retransmit.bind(this);
    }

    function retransmit(id, message) {
        var connector = this._connector;
        this._clients.forEach(function (clientId) {
            if (clientId != id) {
                connector.send(clientId, message);
            }
        });
    }

    function GameClient(server, canvas) {
        this._server = server;
        this._canvas = canvas;

        initCanvas.call(this);
        initClientEvents.call(this);
        initCanvasEvents.call(this);
    }

    function initCanvas() {
        var canvas = this._canvas;
        canvas.width = 640;
        canvas.height = 480;
        this._ctx = canvas.getContext("2d");
    }

    function initClientEvents() {
        var server = this._server;
        var ctx = this._ctx;
        server.onMessage = function (message) {
            ctx.strokeStyle = message.style;
            ctx.beginPath();
            ctx.moveTo(message.x1, message.y1);
            ctx.lineTo(message.x2, message.y2);
            ctx.stroke();
        };
    }

    function initCanvasEvents() {
        var canvas = this._canvas;
        var server = this._server;
        var x = null;
        var y = null;
        canvas.addEventListener("mousedown", function (evt) {
            x = evt.offsetX;
            y = evt.offsetY;
        });
        canvas.addEventListener("mouseup", function (evt) {
            var message = {x1: x, y1: y, x2: evt.offsetX, y2: evt.offsetY, style: 'black'};
            server.send(message);
            server.onMessage(message);
            x = null;
            y = null;
        });
    }

    function RemoteServer(connector, serverId) {
        this._connector = connector;
        this._server = serverId;
        initRemoteServerEvents.call(this);
    }

    function fireServerEvent(type, id, message) {
        id === this._server && type in this && this[type].call(this, message);
    }

    function initRemoteServerEvents() {
        var connector = this._connector;
        connector.onOpen = fireServerEvent.bind(this, 'onOpen');
        connector.onClose = fireServerEvent.bind(this, 'onClose');
        connector.onMessage = fireServerEvent.bind(this, 'onMessage');
    }

    RemoteServer.prototype.send = function (message) {
        this._connector.send(this._server, message);
    };

    function WebRTCConnectorAdapter(webRtc) {
        this._rtc = webRtc;
        initAdapterEvents.call(this);
    }

    function fireAdapterEvent(type, parseJson, id, message) {
        parseJson && (message = JSON.parse(message));
        type in this && this[type].call(this, id, message);
    }

    function initAdapterEvents() {
        var rtc = this._rtc;
        rtc.onOpen = fireAdapterEvent.bind(this, 'onOpen', false);
        rtc.onClose = fireAdapterEvent.bind(this, 'onClose', false);
        rtc.onMessage = fireAdapterEvent.bind(this, 'onMessage', true);
    }

    WebRTCConnectorAdapter.prototype.send = function (id, message) {
        this._rtc.send(id, JSON.stringify(message));
    }
})(window);