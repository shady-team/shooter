goog.provide('game.data');

goog.require('util');
goog.require('rtt');
goog.require('geom');
goog.require('phys');
goog.require('visual');

/** @typedef {Object.<string,game.data.GameObjectModification>} */
game.data.ModificationsBatch;

(function () {
    /**
     * @param {?string} id
     * @param {phys.Body.<?>} body
     * @param {visual.TrianglesMesh} mesh
     * @constructor
     * @implements {rtt.Typed}
     */
    game.data.GameObject = function (id, body, mesh) {
        this.id = id || util.genUUID();
        this.body = body;
        this.mesh = mesh;
    };

    game.data.GameObject.prototype.type = rtt.registerType(game.data.GameObject.prototype, 'game.data.GameObject');

    /**
     * @param {game.data.GameObjectModification} modification
     */
    game.data.GameObject.prototype.applyModification = function (modification) {
        if (modification.newPosition) {
            this.body.position = modification.newPosition;
        }
    };

    /**
     * @interface
     */
    game.data.GameObjectModification = function () {
    };

    /**
     * @type {?geom.Vector}
     */
    game.data.GameObjectModification.prototype.newPosition;

    /**
     * @constructor
     */
    game.data.ModificationBuilder = function () {
        /**
         * @type {game.data.GameObjectModification}
         * @private
         */
        this._modification = /** @type {game.data.GameObjectModification} */({});
    };

    /**
     * @param {geom.Vector} position
     */
    game.data.ModificationBuilder.prototype.setPosition = function (position) {
        this._modification.newPosition = position;
        return this;
    };

    /**
     * @return {game.data.GameObjectModification}
     */
    game.data.ModificationBuilder.prototype.build = function () {
        return this._modification;
    };

    /**
     * @return {game.data.ModificationBuilder}
     */
    game.data.buildModification = function () {
        return new game.data.ModificationBuilder();
    };

    /**
     * @constructor
     */
    game.data.ModificationsBatchBuilder = function () {
        /**
         * @type {game.data.ModificationsBatch}
         * @private
         */
        this._batch = {};
    };

    /**
     * @param {string} id
     * @param {game.data.GameObjectModification} modification
     */
    game.data.ModificationsBatchBuilder.prototype.add = function (id, modification) {
        this._batch[id] = modification;
        return this;
    };

    /**
     * @return {game.data.ModificationsBatch}
     */
    game.data.ModificationsBatchBuilder.prototype.build = function() {
        return this._batch;
    };

    /**
     * @return {game.data.ModificationsBatchBuilder}
     */
    game.data.buildModificationsBatch = function () {
        return new game.data.ModificationsBatchBuilder();
    };
})();