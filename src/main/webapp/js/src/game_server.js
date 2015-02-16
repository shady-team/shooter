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
        /**
         * @type {game.logic.Map}
         * @private
         */
        this._map = new game.logic.Map([
            new game.logic.Team('GreenTeam', 90, new geom.Rectangle(new geom.Vector(-1200, -300), new geom.Vector(1000, -100)), webgl.GREEN_COLOR),
            new game.logic.Team('BlueTeam', 90, new geom.Rectangle(new geom.Vector(1000, -300), new geom.Vector(1200, -100)), webgl.BLUE_COLOR)
        ], constructMap());
        initServerEvents.call(this);
        initGameLogic.call(this);
    };

    function constructMap() {
        var a = 100;
        var columnsCols = 6;
        var topLeftCorner = new geom.Vector(-(columnsCols - 0.5) * a - a * 0.5 - a * 3, -3.5 * a - 0.5 * a - 5 * a);
        var topRightCorner = new geom.Vector(-topLeftCorner.x, -3.5 * a - 0.5 * a - 5 * a);

        function rectangle(x0, y0, x1, y1) {
            return new game.data.GameObject(null, new phys.Body(new geom.Vector((x0 + x1) / 2, (y0 + y1) / 2),
                new phys.Rectangle(Math.abs(x1 - x0), Math.abs(y1 - y0)), Infinity), new visual.Rectangle(Math.abs(x1 - x0), Math.abs(y1 - y0), webgl.BLACK_COLOR));
        }

        function constructMainWalls() {
            var walls = [];
            // Two top walls
            walls.push(rectangle(topLeftCorner.x, topLeftCorner.y, -0.5 * a, topLeftCorner.y - a));
            walls.push(rectangle(0.5 * a, topLeftCorner.y - a, topRightCorner.x, topRightCorner.y));
            // Left and right upper walls
            var leftUpStart = new geom.Vector(topLeftCorner.x, -0.5 * a);
            var rightUpStart = new geom.Vector(topRightCorner.x, -0.5 * a);
            walls.push(rectangle(topLeftCorner.x - a, topLeftCorner.y - a, leftUpStart.x, leftUpStart.y));
            walls.push(rectangle(topRightCorner.x + a, topRightCorner.y - a, rightUpStart.x, rightUpStart.y));
            // Left and right lower walls
            var leftDownStart = new geom.Vector(topLeftCorner.x, 0.5 * a);
            var rightDownStart = new geom.Vector(topRightCorner.x, 0.5 * a);
            var downLeftCorner = new geom.Vector(topLeftCorner.x, 12 * a);
            var downRightCorner = new geom.Vector(topRightCorner.x, downLeftCorner.y);
            walls.push(rectangle(leftDownStart.x, leftDownStart.y, downLeftCorner.x - 4 * a, downLeftCorner.y + a));
            walls.push(rectangle(rightDownStart.x, rightDownStart.y, downRightCorner.x + 4 * a, downRightCorner.y + a));
            // Down wall
            walls.push(rectangle(downLeftCorner.x, downLeftCorner.y, downRightCorner.x, downRightCorner.y + a));
            // Green base left and upper walls
            walls.push(rectangle(leftDownStart.x - 3 * a, leftDownStart.y, leftDownStart.x - 4 * a, leftDownStart.y - 5 * a));
            walls.push(rectangle(leftDownStart.x - a, leftDownStart.y - 4 * a, leftDownStart.x - 4 * a, leftDownStart.y - 5 * a));
            // Blue base right and upper walls
            walls.push(rectangle(rightDownStart.x + 3 * a, rightDownStart.y, rightDownStart.x + 4 * a, rightDownStart.y - 5 * a));
            walls.push(rectangle(rightDownStart.x + a, rightDownStart.y - 4 * a, rightDownStart.x + 4 * a, rightDownStart.y - 5 * a));
            // Left, right, up wall of upper hide-out
            walls.push(rectangle(-2 * a, topLeftCorner.y - a, -3 * a, topLeftCorner.y - 3 * a));
            walls.push(rectangle(2 * a, topLeftCorner.y - a, 3 * a, topLeftCorner.y - 3 * a));
            walls.push(rectangle(-2 * a, topLeftCorner.y - 2 * a, 2 * a, topLeftCorner.y - 3 * a));

            // Intrinsic walls
            // Down wall
            walls.push(rectangle(downLeftCorner.x + a, downLeftCorner.y - a, downRightCorner.x - a, downRightCorner.y - 1.5 * a));
            // Four down vertical mini-walls-corners
            var downY = downLeftCorner.y - 1.5 * a;
            var upY = downY - 2 * a;
            var leftX = leftDownStart.x + 2.5 * a;
            walls.push(rectangle(leftX, downY, leftX + 0.5 * a, upY));
            walls.push(rectangle(-leftX, downY, -leftX - 0.5 * a, upY));
            walls.push(rectangle(leftX + 2.5 * a, downY, leftX + 3.0 * a, upY));
            walls.push(rectangle(-leftX - 2.5 * a, downY, -leftX - 3.0 * a, upY));
            // Next four down vertical mini-walls-corners
            downY = upY - a;
            upY = downY - 2 * a;
            walls.push(rectangle(leftX, downY, leftX + 0.5 * a, upY));
            walls.push(rectangle(-leftX, downY, -leftX - 0.5 * a, upY));
            walls.push(rectangle(leftX + 2.5 * a, downY, leftX + 3.0 * a, upY));
            walls.push(rectangle(-leftX - 2.5 * a, downY, -leftX - 3.0 * a, upY));
            // Two down horizontal walls separators
            walls.push(rectangle(leftDownStart.x + 1.5 * a, upY, -a, upY - 0.5 * a));
            walls.push(rectangle(rightDownStart.x - 1.5 * a, upY, +a, upY - 0.5 * a));
            // Left and right vertical big walls (down part)
            walls.push(rectangle(leftX + 1.0 * a, upY - 0.5 * a, leftX + 1.5 * a, 0.5 * a));
            walls.push(rectangle(-leftX - 1.0 * a, upY - 0.5 * a, -leftX - 1.5 * a, 0.5 * a));
            // Left and right vertical big walls (up part)
            walls.push(rectangle(topLeftCorner.x + 2.0 * a, topLeftCorner.y + 4 * a, topLeftCorner.x + 2.5 * a, 0.5 * a));
            walls.push(rectangle(topRightCorner.x - 2.0 * a, topLeftCorner.y + 4 * a, topRightCorner.x - 2.5 * a, 0.5 * a));
            // Upper left and right two walls
            walls.push(rectangle(topLeftCorner.x + 2.0 * a, topLeftCorner.y, topLeftCorner.x + 2.5 * a, topLeftCorner.y + 3 * a));
            walls.push(rectangle(topRightCorner.x - 2.0 * a, topLeftCorner.y, topRightCorner.x - 2.5 * a, topLeftCorner.y + 3 * a));
            // Two main upper horizontal walls
            walls.push(rectangle(leftDownStart.x + 1.0 * a, -3.5 * a, -0.5 * a, -4.0 * a));
            walls.push(rectangle(rightDownStart.x - 1.0 * a, -3.5 * a, 0.5 * a, -4.0 * a));

            return walls;
        }

        function constructColumns() {
            var columns = [];
            for (var i = 0; i < columnsCols; i++) {
                var x = (-columnsCols + 0.5) * a + i * 2 * a;
                columns.push(rectangle(x, topLeftCorner.y + a, x + a, topLeftCorner.y + 2 * a));
                columns.push(rectangle(x, topLeftCorner.y + 3 * a, x + a, topLeftCorner.y + 4 * a));
            }
            return columns;
        }

        return constructMainWalls().concat(constructColumns());
        //var glass = new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 360),
        //    new phys.Rectangle(20, 160), Infinity), new visual.Rectangle(20, 160, webgl.GLASS_COLOR));
        //glass.setHitPoints(2);
        //glass.setIsObstacle(false);
        //var woodenBlock = new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 120),
        //    new phys.Rectangle(20, 160), Infinity), new visual.Rectangle(20, 160, webgl.LIGHT_BROWN_COLOR));
        //woodenBlock.setHitPoints(5);
        //[
        //    new game.data.GameObject(null, new phys.Body(new geom.Vector(10, 240),
        //        new phys.Rectangle(20, 440), Infinity), new visual.Rectangle(20, 440, webgl.GREEN_COLOR)),
        //    new game.data.GameObject(null, new phys.Body(new geom.Vector(630, 240),
        //        new phys.Rectangle(20, 440), Infinity), new visual.Rectangle(20, 440, webgl.GREEN_COLOR)),
        //    new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 10),
        //        new phys.Rectangle(600, 20), Infinity), new visual.Rectangle(600, 20, webgl.GREEN_COLOR)),
        //    new game.data.GameObject(null, new phys.Body(new geom.Vector(320, 470),
        //        new phys.Rectangle(600, 20), Infinity), new visual.Rectangle(600, 20, webgl.GREEN_COLOR)),
        //    glass,
        //    woodenBlock
        //]
    }

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
        sendTo.call(this, id, new game.message.TeamsMessage(this._map.getTeamsSnapshot()));
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
            }
            sendAll.call(this, message);
        }
    );

    function sendPhysicsUpdate(batch) {
        sendAll.call(this, new game.message.ObjectsModificationsMessage(batch));
    }

    /**
     * @param {Array.<string>} batch
     */
    function sendDeletionsUpdate(batch) {
        for (var i = 0; i < batch.length; i++) {
            this._map.removeObject(batch[i]);//TODO: REVIEW THIS FIRSTLY! I think that the good solution is to remove object, when event is recieved by server from server (but is does not now, may be because of temporary WebRTC problems)
        }
        sendAll.call(this, new game.message.ObjectsDeletionsMessage(batch));
    }

    function initGameLogic() {
        this._map.on(game.logic.E_OBJECTS_MODIFIED, sendPhysicsUpdate.bind(this));
        this._map.on(game.logic.E_OBJECTS_DELETED, sendDeletionsUpdate.bind(this));
        this._map.startPhysics(20);
    }
})();