module('game', ['util', 'events'], function (util, events) {
    var /** @const */ ID_SELF = "@self";

    /**
     * @constructor
     * @extends {WithEvents}
     */
    function Connector() {}
    /**
     * @param {string} id
     * @param {Object} message
     */
    Connector.prototype.send = function (id, message) {};

    /**
     * @constructor
     * @extends {WithEvents}
     */
    function Server() {}
    /**
     * @param {Object} message
     */
    Server.prototype.send = function (message) {};

    /**
     * @param {Connector} connector
     * @constructor
     */
    function GameServer(connector) {
        this._connector = connector;
        /**
         * @type {Array<string>}
         * @private
         */
        this._clients = [];
        initServerEvents.call(this);
    }

    /**
     * @this {GameServer}
     */
    function initServerEvents() {
        var connector = this._connector,
            clients = this._clients;
        connector.on(events.E_OPEN, function (id) {
            clients.push(id);
        });
        connector.on(events.E_CLOSE, function (id) {
            clients.splice(clients.indexOf(id), 1);
        });
        connector.on(events.E_MESSAGE, retransmit.bind(this));
    }

    /**
     * @this {GameServer}
     * @param {string} id
     * @param {Object} message
     */
    function retransmit(id, message) {
        var connector = this._connector;
        this._clients.forEach(function (clientId) {
            if (clientId != id) {
                connector.send(clientId, message);
            }
        });
    }

    /**
     * @param {Server} server
     * @param {HTMLCanvasElement} canvas
     * @constructor
     */
    function GameClient(server, canvas) {
        this._server = server;
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");

        initCanvas.call(this);
        initClientEvents.call(this);
        initCanvasEvents.call(this);
    }

    /**
     * @this {GameClient}
     */
    function initCanvas() {
        var canvas = this._canvas;
        canvas.width = 640;
        canvas.height = 480;
    }

    /**
     * @this {GameClient}
     */
    function initClientEvents() {
        var server = this._server,
            ctx = this._ctx;
        server.on(events.E_MESSAGE, function (message) {
            ctx.strokeStyle = message.style;
            ctx.beginPath();
            ctx.moveTo(message.x1, message.y1);
            ctx.lineTo(message.x2, message.y2);
            ctx.stroke();
        });
    }

    /**
     * @this {GameClient}
     */
    function initCanvasEvents() {
        var canvas = this._canvas,
            server = this._server,
            /**
             * @type {?number}
             */
            x = null,
            /**
             * @type {?number}
             */
            y = null;
        canvas.addEventListener("mousedown", function (evt) {
            x = evt.offsetX;
            y = evt.offsetY;
        });
        canvas.addEventListener("mouseup", function (evt) {
            var message = {x1: x, y1: y, x2: evt.offsetX, y2: evt.offsetY, style: 'black'};
            server.send(message);
            server.fire(events.E_MESSAGE, message);
            x = null;
            y = null;
        });
    }

    /**
     * @param {Connector} connector
     * @param {string} serverId
     * @constructor
     * @extends {Server}
     */
    function RemoteServer(connector, serverId) {
        this._connector = connector;
        this._server = serverId;
        initRemoteServerEvents.call(this);
    }

    RemoteServer.prototype = new events.WithEvents();

    /**
     * @this {RemoteServer}
     * @param {string} type
     * @param {string} id
     * @param {Object} message
     */
    function fireServerEvent(type, id, message) {
        id === this._server && this.fire(type, message);
    }

    /**
     * @this {RemoteServer}
     */
    function initRemoteServerEvents() {
        var connector = this._connector;
        connector.on(events.E_OPEN, fireServerEvent.bind(this, events.E_OPEN));
        connector.on(events.E_CLOSE, fireServerEvent.bind(this, events.E_CLOSE));
        connector.on(events.E_MESSAGE, fireServerEvent.bind(this, events.E_MESSAGE));
    }

    /**
     * @param {Object} message
     */
    RemoteServer.prototype.send = function (message) {
        this._connector.send(this._server, message);
    };

    /**
     * @param {Connector} connector
     * @constructor
     * @extends {Server}
     */
    function LocalServer(connector) {
        this._connector = connector;
        this._opened = false;
        connectLocal.call(connector, this);
    }

    LocalServer.prototype = new events.WithEvents();

    /**
     * @param {Object} message
     */
    LocalServer.prototype.send = function (message) {
        this._connector.fire(events.E_MESSAGE, ID_SELF, message);
    };

    /**
     * @param {string} type
     * @param {function(...*)} handler
     * @override
     */
    LocalServer.prototype.on = function (type, handler) {
        if (type === events.E_OPEN && !this._opened) {
            this._opened = true;
            handler.call(this);
        }
        events.WithEvents.prototype.on.call(this, type, handler);
    };

    /**
     * @param {WebRTC} webRtc
     * @constructor
     * @extends {Connector}
     */
    function WebRTCConnectorAdapter(webRtc) {
        this._rtc = webRtc;
        /**
         * @type {LocalServer}
         * @private
         */
        this._localClient = null;
        initAdapterEvents.call(this);
    }

    WebRTCConnectorAdapter.prototype = new events.WithEvents();

    /**
     * @this {WebRTCConnectorAdapter}
     * @param {string} type
     * @param {string} id
     * @param {string} message
     */
    function fireAdapterEventParsing(type, id, message) {
        this.fire(type, id, JSON.parse(message));
    }

    /**
     * @this {WebRTCConnectorAdapter}
     */
    function initAdapterEvents() {
        var rtc = this._rtc;
        rtc.on(events.E_OPEN, this.fire.bind(this, events.E_OPEN));
        rtc.on(events.E_CLOSE, this.fire.bind(this, events.E_CLOSE));
        rtc.on(events.E_MESSAGE, fireAdapterEventParsing.bind(this, events.E_MESSAGE));
    }

    /**
     * @param {string} id
     * @param {Object} message
     */
    WebRTCConnectorAdapter.prototype.send = function (id, message) {
        if (id === ID_SELF) {
            this._localClient && this._localClient.fire(events.E_MESSAGE, message);
        } else {
            this._rtc.send(id, JSON.stringify(message));
        }
    };

    /**
     * @this {WebRTCConnectorAdapter}
     * @param {LocalServer} localClient
     */
    function connectLocal(localClient) {
        this._localClient = localClient;
        this.fire(events.E_OPEN, ID_SELF);
    }

    return {
        GameServer: GameServer,
        GameClient: GameClient,
        RemoteServer: RemoteServer,
        LocalServer: LocalServer,
        WebRTCConnectorAdapter: WebRTCConnectorAdapter
    };
});