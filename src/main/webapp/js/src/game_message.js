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
        if (util.isDefined(handler)) {
            handler.apply(thisArg, args);
        } else {
            util.warn("No handler registered for message", message);
        }
    };
})();