(function () {
    /** @const */
    var ID_SELF = "@self";

    /**
     * @constructor
     * @extends {events.WithEvents}
     */
    game.net.Server = function Server() {
    };
    /**
     * @param {Object} message
     */
    game.net.Server.prototype.send = function (message) {
    };

    /**
     * @constructor
     * @extends {events.WithEvents}
     */
    game.net.Connector = function Connector() {
    };
    /**
     * @param {string} id
     * @param {Object} message
     */
    game.net.Connector.prototype.send = function (id, message) {
    };
    /**
     * @param {game.net.LocalServer} localClient
     */
    game.net.Connector.prototype.connectLocal = function (localClient) {
    };
    
    /**
     * @param {game.net.Connector} connector
     * @param {string} serverId
     * @constructor
     * @extends {game.net.Server}
     */
    game.net.RemoteServer = function RemoteServer(connector, serverId) {
        events.WithEvents.call(this);
        this._connector = connector;
        this._server = serverId;
        initRemoteServerEvents.call(this);
    };

    game.net.RemoteServer.prototype = Object.create(events.WithEvents.prototype);

    /**
     * @this {game.net.RemoteServer}
     * @param {string} type
     * @param {string} id
     * @param {Object} message
     */
    function fireServerEvent(type, id, message) {
        id === this._server && this.fire(type, message);
    }

    /**
     * @this {game.net.RemoteServer}
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
    game.net.RemoteServer.prototype.send = function (message) {
        this._connector.send(this._server, message);
    };

    /**
     * @param {game.net.Connector} connector
     * @constructor
     * @extends {game.net.Server}
     */
    game.net.LocalServer = function LocalServer(connector) {
        events.WithEvents.call(this);
        this._connector = connector;
        this._opened = false;
    };

    game.net.LocalServer.prototype = Object.create(events.WithEvents.prototype);

    /**
     * @param {Object} message
     */
    game.net.LocalServer.prototype.send = function (message) {
        this._connector.fire(events.E_MESSAGE, ID_SELF, message);
    };

    /**
     * @param {string} type
     * @param {*} handler
     * @override
     */
    game.net.LocalServer.prototype.on = function (type, handler) {
        if (type === events.E_OPEN && !this._opened) {
            this._opened = true;
            handler.call(this);
            this._connector.connectLocal(this);
        }
        events.WithEvents.prototype.on.call(this, type, handler);
    };

    /**
     * @param {net.WebRTC} webRtc
     * @constructor
     * @extends {game.net.Connector}
     */
    game.net.WebRTCConnectorAdapter = function WebRTCConnectorAdapter(webRtc) {
        events.WithEvents.call(this);
        this._rtc = webRtc;
        /**
         * @type {game.net.LocalServer}
         * @private
         */
        this._localClient = null;
        initAdapterEvents.call(this);
    };

    game.net.WebRTCConnectorAdapter.prototype = Object.create(events.WithEvents.prototype);

    /**
     * @this {game.net.WebRTCConnectorAdapter}
     * @param {string} type
     * @param {string} id
     * @param {string} message
     */
    function fireAdapterEventParsing(type, id, message) {
        this.fire(type, id, JSON.parse(message));
    }

    /**
     * @this {game.net.WebRTCConnectorAdapter}
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
    game.net.WebRTCConnectorAdapter.prototype.send = function (id, message) {
        if (id === ID_SELF) {
            this._localClient && this._localClient.fire(events.E_MESSAGE, message);
        } else {
            this._rtc.send(id, JSON.stringify(message));
        }
    };

    /**
     * @param {game.net.LocalServer} localClient
     */
    game.net.WebRTCConnectorAdapter.prototype.connectLocal = function (localClient) {
        this._localClient = localClient;
        this.fire(events.E_OPEN, ID_SELF);
    };
})();