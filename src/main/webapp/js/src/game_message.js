goog.provide('game.message');

goog.require('util');
goog.require('game.data');

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
     * @static
     * @param {game.message.ConnectMessage} obj
     * @return {game.message.ConnectMessage}
     */
    game.message.ConnectMessage.revive = util.identity;

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
     * @static
     * @param {game.message.ConnectMessage} obj
     * @return {game.message.ConnectMessage}
     */
    game.message.ConnectMessage.revive = util.identity;

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
     * @static
     * @param {game.message.ClientListMessage} obj
     * @return {game.message.ClientListMessage}
     */
    game.message.ClientListMessage.revive = util.identity;

    /**
     * @param {game.data.ModificationsBatch} batch
     * @constructor
     * @extends {game.message.Message}
     */
    game.message.ObjectsModificationsMessage = function (batch) {
        game.message.Message.call(this);
        this.batch = batch;
    };

    /**
     * @static
     * @const {string}
     */
    game.message.ObjectsModificationsMessage.TYPE = 'obj_modified';

    /**
     * @static
     * @param {game.message.ObjectsModificationsMessage} obj
     * @return {game.message.ObjectsModificationsMessage}
     */
    game.message.ObjectsModificationsMessage.revive = function (obj) {
        obj.batch = game.data.reviveModificationsBatch(obj.batch);
        return obj;
    };

    /**
     * @param {Array.<game.data.GameObject>} objects
     * @constructor
     * @extends {game.message.Message}
     */
    game.message.ObjectsCreationMessage = function (objects) {
        game.message.Message.call(this);
        this.objects = objects;
    };

    /**
     * @static
     * @const {string}
     */
    game.message.ObjectsCreationMessage.TYPE = 'objects_creation';

    /**
     * @static
     * @param {game.message.ObjectsCreationMessage} obj
     * @return {game.message.ObjectsCreationMessage}
     */
    game.message.ObjectsCreationMessage.revive = function (obj) {
        obj.objects = obj.objects.map(function (object) {
            return game.data.reviveGameObject(object);
        });
        return obj;
    };

    var reviversHolder = new util.ReviversHolder(
        /**
         * @param {game.message.Message} obj
         * @return {string}
         */
        function (obj) {
            return obj.type;
        }
    );

    reviversHolder.registerReviver(game.message.ConnectMessage.TYPE, game.message.ConnectMessage.revive);
    reviversHolder.registerReviver(game.message.DisconnectMessage.TYPE, game.message.DisconnectMessage.revive);
    reviversHolder.registerReviver(game.message.ClientListMessage.TYPE, game.message.ClientListMessage.revive);
    reviversHolder.registerReviver(game.message.ObjectsModificationsMessage.TYPE, game.message.ObjectsModificationsMessage.revive);
    reviversHolder.registerReviver(game.message.ObjectsCreationMessage.TYPE, game.message.ObjectsCreationMessage.revive);

    /**
     * @constructor
     */
    game.message.MessageHandlersHolder = function () {
        /**
         * @type {Object.<string,function(...[?])>}
         * @private
         */
        this._handlers = util.emptyObject();
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
            revived = reviversHolder.revive(message),
            handler = this._handlers[revived.type];
        args[0] = revived;
        if (util.isDefined(handler)) {
            handler.apply(thisArg, args);
        } else {
            util.warn("No handler registered for message", revived);
        }
    };
})();