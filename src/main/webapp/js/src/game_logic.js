goog.provide('game.logic');

goog.require('util');
goog.require('phys');
goog.require('game.data');
goog.require('game.logic');

/** @const {number} */
var PIXEL_PER_METER = 20;
/** @const {number} */
var G = PIXEL_PER_METER * 9.807;

(function () {
    /**
     * @param {Array.<game.data.GameObject>} objects
     * @constructor
     * @extends {events.WithEvents}
     */
    game.logic.Map = function (objects) {
        events.WithEvents.call(this);
        /**
         * @type {Array.<game.data.GameObject>}
         * @private
         */
        this._objects = objects;
        /**
         * @type {Object.<string,game.data.GameObject>}
         * @private
         */
        this._idToObject = util.emptyObject();
        /**
         * @type {?number}
         * @private
         */
        this._timer = null;
        /**
         * @type {?number}
         * @private
         */
        this._lastUpdate = null;
        /**
         * @type {phys.World}
         * @private
         */
        this._world = new phys.World(G, 0.5);
        objects.forEach(putToMap, this);
    };

    game.logic.Map.prototype = Object.create(events.WithEvents.prototype);

    /**
     * @const {string}
     */
    game.logic.E_OBJECTS_MODIFIED = 'objects_modified';

    /**
     * @const {string}
     */
    game.logic.E_OBJECTS_DELETED = 'objects_deleted';

    /**
     * @this {game.logic.Map}
     * @param {game.data.GameObject} object
     */
    function putToMap(object) {
        this._idToObject[object.id] = object;
    }

    /**
     * @this {game.logic.Map}
     * @param {game.data.GameObject} object
     */
    function removeFromMap(object) {
        delete this._idToObject[object.id];
    }

    /**
     * @param {Array.<game.data.GameObject>} objects
     */
    game.logic.Map.prototype.addObjects = function (objects) {
        [].push.apply(this._objects, objects);
        objects.forEach(putToMap, this);
    };

    /**
     * @param {string} id
     */
    game.logic.Map.prototype.removeObject = function (id) {
        console.log('Deleting id=' + id);
        var object = this._idToObject[id];
        if (util.isDefined(object)) {
            this._objects.splice(this._objects.indexOf(object), 1);
            removeFromMap.call(this, object);
        }
    };

    /**
     * @param {game.data.ModificationsBatch} batch
     */
    game.logic.Map.prototype.applyModificationsBatch = function (batch) {
        var id, modification, target;
        for (id in batch) {
            modification = batch[id];
            target = this._idToObject[id];
            if (util.isDefined(target)) {
                target.applyModification(modification);
            }
        }
    };

    /**
     * @param {game.data.GameObject} object
     * @return {phys.Body.<?>}
     */
    function unwrapGameObject(object) {
        return object.body;
    }

    /**
     * @param {game.data.GameObject} object
     * @param {game.data.GameObject} target
     */
    function collisionHandler(object, target) {
        object.collideWith(target);
    }

    game.logic.Map.prototype.validatePhysics = function () {
        var now = Date.now();
        if (util.isDefined(this._lastUpdate)) {
            var oldPositions = {},
                oldHitPoints = {},
                batchBuilder = game.data.buildModificationsBatch(),
                modificationBatch,
                deletedIds = [];
            this._objects.forEach(function (object) {
                oldPositions[object.id] = object.body.position;
                oldHitPoints[object.id] = object.hitPoints;
            });
            this._world.simulate(this._objects, unwrapGameObject, (now - this._lastUpdate) / 1000, collisionHandler);

            this._objects.forEach(function (object) {
                var id = object.id,
                    oldPosition = oldPositions[id],
                    newPosition = object.body.position;
                if (!oldPosition.approximatelyEqual(newPosition) || oldHitPoints[id] != object.hitPoints) {
                    var modification = game.data.buildModification();
                    if (!oldPosition.approximatelyEqual(newPosition)) {
                        modification.setPosition(newPosition);
                    }
                    if (oldHitPoints[id] != object.hitPoints) {
                        modification.setDeltaHitPoints(object.hitPoints - oldHitPoints[id]);
                    }
                    batchBuilder.add(id, modification.build());
                }
                if (object.isDestroyed()) {
                    deletedIds.push(id);
                }
            });
            modificationBatch = batchBuilder.build();
            if (!util.isObjectEmpty(modificationBatch)) {
                this.fire(game.logic.E_OBJECTS_MODIFIED, modificationBatch);
            }
            if (deletedIds.length > 0) {
                this.fire(game.logic.E_OBJECTS_DELETED, deletedIds);
            }
        }
        this._lastUpdate = now;
    };

    /**
     * @return {Array.<game.data.GameObject>}
     */
    game.logic.Map.prototype.getObjectsSnapshot = function () {
        return this._objects.slice();
    };

    /**
     * @param {number} delay
     */
    game.logic.Map.prototype.startPhysics = function (delay) {
        if (!this._timer) {
            this._timer = setInterval(this.validatePhysics.bind(this), delay)
        }
    };

    game.logic.Map.prototype.stopPhysics = function () {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }
})();