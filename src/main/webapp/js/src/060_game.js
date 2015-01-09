// requires util, net

/** @const */
var game = {};

(function () {
    var /** @const */ ID_SELF = "@self";

    /**
     * @constructor
     * @extends {events.WithEvents}
     */
    game.Server = function Server() {
    };
    /**
     * @param {Object} message
     */
    game.Server.prototype.send = function (message) {
    };

    /**
     * @constructor
     * @extends {events.WithEvents}
     */
    game.Connector = function Connector() {
    };
    /**
     * @param {string} id
     * @param {Object} message
     */
    game.Connector.prototype.send = function (id, message) {
    };
    /**
     * @param {game.LocalServer} localClient
     */
    game.Connector.prototype.connectLocal = function (localClient) {
    };

    /**
     * @param {game.Connector} connector
     * @constructor
     */
    game.GameServer = function GameServer(connector) {
        this._connector = connector;
        /**
         * @type {Array.<string>}
         * @private
         */
        this._clients = [];
        initServerEvents.call(this);
    };

    /**
     * @this {game.GameServer}
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
     * @this {game.GameServer}
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
     * @param {game.Server} server
     * @param {HTMLCanvasElement} canvas
     * @constructor
     */
    game.GameClient = function GameClient(server, canvas) {
        this._server = server;
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");

        initCanvas.call(this);
        initClientEvents.call(this);
        initCanvasEvents.call(this);
    };

    /**
     * @this {game.GameClient}
     */
    function initCanvas() {
        var canvas = this._canvas;
        canvas.width = 640;
        canvas.height = 480;
    }

    /**
     * @this {game.GameClient}
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
     * @this {game.GameClient}
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
     * @param {game.Connector} connector
     * @param {string} serverId
     * @constructor
     * @extends {game.Server}
     */
    game.RemoteServer = function RemoteServer(connector, serverId) {
        this._connector = connector;
        this._server = serverId;
        initRemoteServerEvents.call(this);
    };

    game.RemoteServer.prototype = new events.WithEvents();

    /**
     * @this {game.RemoteServer}
     * @param {string} type
     * @param {string} id
     * @param {Object} message
     */
    function fireServerEvent(type, id, message) {
        id === this._server && this.fire(type, message);
    }

    /**
     * @this {game.RemoteServer}
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
    game.RemoteServer.prototype.send = function (message) {
        this._connector.send(this._server, message);
    };

    /**
     * @param {game.Connector} connector
     * @constructor
     * @extends {game.Server}
     */
    game.LocalServer = function LocalServer(connector) {
        this._connector = connector;
        this._opened = false;
        connector.connectLocal(this);
    };

    game.LocalServer.prototype = new events.WithEvents();

    /**
     * @param {Object} message
     */
    game.LocalServer.prototype.send = function (message) {
        this._connector.fire(events.E_MESSAGE, ID_SELF, message);
    };

    /**
     * @param {string} type
     * @param {*} handler
     * @override
     */
    game.LocalServer.prototype.on = function (type, handler) {
        if (type === events.E_OPEN && !this._opened) {
            this._opened = true;
            handler.call(this);
        }
        events.WithEvents.prototype.on.call(this, type, handler);
    };

    /**
     * @param {net.WebRTC} webRtc
     * @constructor
     * @extends {game.Connector}
     */
    game.WebRTCConnectorAdapter = function WebRTCConnectorAdapter(webRtc) {
        this._rtc = webRtc;
        /**
         * @type {game.LocalServer}
         * @private
         */
        this._localClient = null;
        initAdapterEvents.call(this);
    };

    game.WebRTCConnectorAdapter.prototype = new events.WithEvents();

    /**
     * @this {game.WebRTCConnectorAdapter}
     * @param {string} type
     * @param {string} id
     * @param {string} message
     */
    function fireAdapterEventParsing(type, id, message) {
        this.fire(type, id, JSON.parse(message));
    }

    /**
     * @this {game.WebRTCConnectorAdapter}
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
    game.WebRTCConnectorAdapter.prototype.send = function (id, message) {
        if (id === ID_SELF) {
            this._localClient && this._localClient.fire(events.E_MESSAGE, message);
        } else {
            this._rtc.send(id, JSON.stringify(message));
        }
    };

    /**
     * @param {game.LocalServer} localClient
     */
    game.WebRTCConnectorAdapter.prototype.connectLocal = function (localClient) {
        this._localClient = localClient;
        this.fire(events.E_OPEN, ID_SELF);
    };
})();