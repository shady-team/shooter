goog.provide('game.message');

goog.require('util');
goog.require('rtt');
goog.require('game.data');

(function () {
    /**
     * @interface
     * @extends {rtt.Typed}
     */
    game.message.Message = function () {
    };

    /**
     * @param {string} id
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.ConnectMessage = function (id) {
        this.id = id;
    };

    /**
     * @const {string}
     */
    game.message.ConnectMessage.prototype.type = rtt.registerType(game.message.ConnectMessage.prototype, 'game.message.ConnectMessage');

    /**
     * @param {string} id
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.DisconnectMessage = function (id) {
        this.id = id;
    };

    /**
     * @const {string}
     */
    game.message.DisconnectMessage.prototype.type = rtt.registerType(game.message.DisconnectMessage.prototype, 'game.message.DisconnectMessage');

    /**
     * @param {Array.<string>} clients
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.ClientListMessage = function (clients) {
        this.clients = clients;
    };

    /**
     * @const {string}
     */
    game.message.ClientListMessage.prototype.type = rtt.registerType(game.message.ClientListMessage.prototype, 'game.message.ClientListMessage');

    /**
     * @param {game.data.ModificationsBatch} batch
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.ObjectsModificationsMessage = function (batch) {
        this.batch = batch;
    };

    /**
     * @const {string}
     */
    game.message.ObjectsModificationsMessage.prototype.type
        = rtt.registerType(game.message.ObjectsModificationsMessage.prototype, "game.message.ObjectsModificationsMessage");

    /**
     * @param {Array.<game.data.GameObject>} objects
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.ObjectsCreationMessage = function (objects) {
        this.objects = objects;
    };

    /**
     * @const {string}
     */
    game.message.ObjectsCreationMessage.prototype.type
        = rtt.registerType(game.message.ObjectsCreationMessage.prototype, "game.message.ObjectsCreationMessage");

    /**
     * @param {string} playerObjectId
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.FireBulletMessage = function (playerObjectId) {
        /**
         * @type {string}
         * @const
         */
        this.playerObjectId = playerObjectId;
    };

    game.message.FireBulletMessage.prototype.type
        = rtt.registerType(game.message.FireBulletMessage.prototype, "game.message.FireBulletMessage");

    /**
     * @param {Array.<string>} ids
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.ObjectsDeletionsMessage = function (ids) {
        this.ids = ids;
    };

    /**
     * @const {string}
     */
    game.message.ObjectsDeletionsMessage.prototype.type
        = rtt.registerType(game.message.ObjectsDeletionsMessage.prototype, "game.message.ObjectsDeletionsMessage");

    /**
     * @param {Array.<game.logic.Team>} teams
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.TeamsMessage = function (teams) {
        this.teams = teams;
    };

    /**
     * @const {string}
     */
    game.message.TeamsMessage.prototype.type
        = rtt.registerType(game.message.TeamsMessage.prototype, "game.message.TeamsMessage");

    /**
     * @param {?string} author
     * @param {string} message
     * @constructor
     * @implements {game.message.Message}
     */
    game.message.ChatMessage = function (author, message) {
        this.author = author;
        this.message = message;
    };

    /**
     * @const {string}
     */
    game.message.ChatMessage.prototype.type
        = rtt.registerType(game.message.ChatMessage.prototype, "game.message.ChatMessage");

    /**
     * @constructor
     */
    game.message.MessageHandlersHolder = function () {
        /**
         * @type {Object.<string, Function>}
         * @private
         */
        this._handlers = util.emptyObject();
    };

    /**
     * @param {string} type
     * @param {Function} handler
     */
    game.message.MessageHandlersHolder.prototype.registerHandler = function (type, handler) {
        this._handlers[type] = handler;
    };

    /**
     * @type {function(*,Object,...[*])}
     */
    game.message.MessageHandlersHolder.prototype.handle = function (thisArg, message) {
        var args = [].slice.call(arguments, 1),
            handler = this._handlers[message.type];
        args[0] = message;
        if (handler != null) {
            handler.apply(thisArg, args);
            util.info("Message came", message);
        } else {
            util.warn("No handler registered for message", message);
        }
    };
})();