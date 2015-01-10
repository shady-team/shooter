// requires util, game.net

(function () {
    /**
     * @param {game.net.Connector} connector
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
})();