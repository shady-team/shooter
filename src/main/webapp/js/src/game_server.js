goog.provide('game.server');

goog.require('util');
goog.require('game.data');
goog.require('game.net');
goog.require('game.message');
goog.require('game.logic');

(function () {
    /**
     * @param {game.net.Connector} connector
     * @constructor
     */
    game.server.GameServer = function GameServer(connector) {
        this._connector = connector;
        /**
         * @type {Array.<string>}
         * @private
         */
        this._clients = [];

        var glass = new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 360),
            new phys.Rectangle(20, 200), Infinity), new visual.Rectangle(20, 200, webgl.LIGHT_BLUE_COLOR));
        glass.setHitPoints(1);
        var woodenBlock = new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 120),
            new phys.Rectangle(20, 200), Infinity), new visual.Rectangle(20, 200, webgl.LIGHT_BROWN_COLOR));
        woodenBlock.setHitPoints(5);
        /**
         * @type {game.logic.Map}
         * @private
         */
        this._map = new game.logic.Map([
            new game.logic.Team('GreenTeam', new geom.Rectangle(new geom.Vector(100, 100), new geom.Vector(120, 120)), webgl.GREEN_COLOR),
            new game.logic.Team('BlueTeam', new geom.Rectangle(new geom.Vector(540, 300), new geom.Vector(560, 320)), webgl.BLUE_COLOR)
            ], [
            new game.data.GameObject(null, new phys.Body(new geom.Vector(10, 240),
                new phys.Rectangle(20, 440), Infinity), new visual.Rectangle(20, 440, webgl.GREEN_COLOR)),
            new game.data.GameObject(null, new phys.Body(new geom.Vector(630, 240),
                new phys.Rectangle(20, 440), Infinity), new visual.Rectangle(20, 440, webgl.GREEN_COLOR)),
            new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 10),
                new phys.Rectangle(600, 20), Infinity), new visual.Rectangle(600, 20, webgl.GREEN_COLOR)),
            new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 470),
                new phys.Rectangle(600, 20), Infinity), new visual.Rectangle(600, 20, webgl.GREEN_COLOR)),
            glass,
            woodenBlock
        ]);
        initServerEvents.call(this);
        initGameLogic.call(this);
    };

    /**
     * @this {game.server.GameServer}
     */
    function initServerEvents() {
        var connector = this._connector;
        connector.on(events.E_OPEN, onOpen.bind(this));
        connector.on(events.E_CLOSE, onClose.bind(this));
        connector.on(events.E_MESSAGE, onMessage.bind(this));
    }

    /**
     * @this {game.server.GameServer}
     * @param {string} id
     */
    function onOpen(id) {
        this._clients.push(id);
        sendInitialData.call(this, id);
        sendAll.call(this, new game.message.ConnectMessage(id), id);
    }

    /**
     * @this {game.server.GameServer}
     * @param {string} id
     */
    function onClose(id) {
        this._clients.splice(this._clients.indexOf(id), 1);
        sendAll.call(this, new game.message.DisconnectMessage(id));
    }

    var handlersHolder = new game.message.MessageHandlersHolder();

    /**
     * @this {game.server.GameServer}
     * @param {string} id
     * @param {Object} message
     */
    function onMessage(id, message) {
        handlersHolder.handle(this, message, id);
    }

    /**
     * @this {game.server.GameServer}
     * @param {game.message.Message} message
     * @param {function(string):boolean} filter
     * @param {string} client
     */
    function sendFiltering(message, filter, client) {
        if (filter.call(null, client)) {
            this._connector.send(client, message);
        }
    }

    /**
     * @this {game.server.GameServer}
     * @param {game.message.Message} message
     * @param {function(string):boolean|Array.<string>|string=} excludes
     */
    function sendAll(message, excludes) {
        /**
         * @type {function(string):boolean}
         */
        var filter;
        if (util.isFunction(excludes)) {
            var excludeFilter = /** @type {function(string):boolean} */ (excludes);
            filter = function (client) {
                return !excludeFilter.call(null, client);
            };
        } else if (util.isArray(excludes)) {
            var excludeArray = /** @type {Array.<string>} */ (excludes);
            filter = function (client) {
                return excludeArray.indexOf(client) === -1;
            };
        } else if (util.isString(excludes)) {
            var excludeClient = /** @type {string} */ (excludes);
            filter = function (client) {
                return excludeClient !== client;
            };
        } else {
            filter = function () {
                return true;
            };
        }
        this._clients.forEach(sendFiltering.bind(this, message, filter));
    }

    /**
     * @this {game.server.GameServer}
     * @param {function(string):boolean|Array.<string>|string} includes
     * @param {game.message.Message} message
     */
    function sendTo(includes, message) {
        if (util.isFunction(includes)) {
            var includeFilter = /** @type {function(string):boolean} */ (includes);
            this._clients.forEach(sendFiltering.bind(this, message, includeFilter));
        } else if (util.isArray(includes)) {
            var includeArray = /** @type {Array.<string>} */ (includes);
            includeArray.forEach(function (client) {
                this._connector.send(client, message);
            }, this);
        } else if (util.isString(includes)) {
            var includeClient = /** @type {string} */ (includes);
            this._connector.send(includeClient, message);
        } else {
            util.assert(false, "Unsupported type of includes");
        }
    }

    /**
     * @this {game.server.GameServer}
     * @param {string} id
     */
    function sendInitialData(id) {
        sendTo.call(this, id,
            new game.message.ClientListMessage(this._clients.filter(function (client) {
                return client !== id;
            }))
        );
        sendTo.call(this, id, new game.message.TeamsMessage(this._map.teams));
        sendTo.call(this, id, new game.message.ObjectsCreationMessage(this._map.getObjectsSnapshot()));
    }

    handlersHolder.registerHandler(game.message.ObjectsModificationsMessage.prototype.type,
        /**
         * @param {game.message.ObjectsModificationsMessage} message
         * @param {string} id
         */
        function (message, id) {
            //this.map.applyModificationsBatch(message.batch); TODO: Nikita, delete this line, if I correctly fixed the bug (double applying modification message on server)
            sendAll.call(this, message);
        }
    );

    handlersHolder.registerHandler(game.message.ObjectsCreationMessage.prototype.type,
        /**
         * @param {game.message.ObjectsCreationMessage} message
         * @param {string} id
         */
        function (message, id) {
            this._map.addObjects(message.objects);
            sendAll.call(this, message);
        }
    );

    handlersHolder.registerHandler(game.message.ObjectsDeletionsMessage.prototype.type,
        /**
         * @param {game.message.ObjectsDeletionsMessage} message
         * @param {string} id
         */
        function (message, id) {
            for (var i = 0; i < message.ids.length; i++) {
                this._map.removeObject(message.ids[i]);
            }//TODO: fix bug with deleting objects - bullets became invisible, but they are still material in physical calculations
            sendAll.call(this, message);
        }
    );

    function sendPhysicsUpdate(batch) {
        sendAll.call(this, new game.message.ObjectsModificationsMessage(batch));
    }

    function sendDeletionsUpdate(batch) {
        sendAll.call(this, new game.message.ObjectsDeletionsMessage(batch));
    }

    function initGameLogic() {
        this._map.on(game.logic.E_OBJECTS_MODIFIED, sendPhysicsUpdate.bind(this));
        this._map.on(game.logic.E_OBJECTS_DELETED, sendDeletionsUpdate.bind(this));
        this._map.startPhysics(20);
    }
})();