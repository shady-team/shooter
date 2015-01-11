// requires util
(function () {
    /**
     * @constructor
     */
    game.message.Message = function () {
        /**
         * @const {string}
         */
        this.type = this.constructor.TYPE;
    };

    /**
     * @param {string} id
     * @constructor
     * @extends {game.message.Message}
     */
    game.message.ConnectMessage = function (id) {
        game.message.Message.call(this);
        this.id = id;
    };

    /**
     * @static
     * @const {string}
     */
    game.message.ConnectMessage.TYPE = 'connect';

    /**
     * @param {string} id
     * @constructor
     * @extends {game.message.Message}
     */
    game.message.DisconnectMessage = function (id) {
        game.message.Message.call(this);
        this.id = id;
    };

    /**
     * @static
     * @const {string}
     */
    game.message.DisconnectMessage.TYPE = 'disconnect';

    /**
     * @param {Array.<string>} clients
     * @constructor
     * @extends {game.message.Message}
     */
    game.message.ClientListMessage = function (clients) {
        game.message.Message.call(this);
        this.clients = clients;
    };

    /**
     * @static
     * @const {string}
     */
    game.message.ClientListMessage.TYPE = 'client_list';

    /**
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @constructor
     * @extends {game.message.Message}
     */
    game.message.DrawMessage = function (x1, y1, x2, y2) {
        game.message.Message.call(this);
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    };

    /**
     * @static
     * @const {string}
     */
    game.message.DrawMessage.TYPE = 'draw';

    /**
     * @type {Object.<string,function(Object):game.message.Message>}
     */
    var messageRevivers = Object.create(null);

    /**
     * @param {string} messageType
     * @param {function(Object):game.message.Message} reviver
     */
    function registerMessageReviver(messageType, reviver) {
        messageRevivers[messageType] = reviver;
    }

    registerMessageReviver(game.message.ConnectMessage.TYPE, function (obj) {
        return new game.message.ConnectMessage(obj.id)
    });
    registerMessageReviver(game.message.DisconnectMessage.TYPE, function (obj) {
        return new game.message.DisconnectMessage(obj.id)
    });
    registerMessageReviver(game.message.ClientListMessage.TYPE, function (obj) {
        return new game.message.ClientListMessage(obj.clients)
    });
    registerMessageReviver(game.message.DrawMessage.TYPE, function (obj) {
        return new game.message.DrawMessage(obj.x1, obj.y1, obj.x2, obj.y2);
    });

    /**
     * @param {Object} message
     * @return {game.message.Message}
     */
    function reviveMessage(message) {
        util.assert(util.isDefined(message.type), "Bad message, type is not defined");
        util.assert(util.isDefined(messageRevivers[message.type]), "Message has no registered reviver");
        return messageRevivers[message.type].call(null, message);
    }

    /**
     * @constructor
     */
    game.message.MessageHandlersHolder = function () {
        /**
         * @type {Object.<string,function(...[?])>}
         * @private
         */
        this._handlers = Object.create(null);
    };

    /**
     * @param {string} type
     * @param {function(...[?])} handler
     */
    game.message.MessageHandlersHolder.prototype.registerHandler = function (type, handler) {
        this._handlers[type] = handler;
    };

    /**
     * @type {function(*,Object,...[?])}
     */
    game.message.MessageHandlersHolder.prototype.handle = function (thisArg, message) {
        var args = [].splice.call(arguments, 1),
            revived = reviveMessage(message),
            handler = this._handlers[revived.type];
        args[0] = revived;
        if (util.isDefined(handler)) {
            handler.apply(thisArg, args);
        } else {
            util.logger.log("No handler registered for message", revived);
        }
    };
})();