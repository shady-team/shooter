// requires util, phys
(function () {
    /**
     * @param {Array.<game.data.GameObject>} objects
     * @constructor
     * @extends {events.WithEvents}
     */
    game.logic.Map = function (objects) {
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

    game.logic.Map.prototype = new events.WithEvents();

    game.logic.E_OBJECTS_MODIFIED = 'objects_modified';

    function putToMap(object) {
        this._idToObject[object.id] = object;
    }

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
     * @param {game.data.GameObject} object
     */
    game.logic.Map.prototype.removeObject = function (object) {
        this._objects.splice(this._objects.indexOf(object), 1);
        removeFromMap.call(this, object);
    };

    /**
     * @param {game.data.ModificationsBatch} batch
     */
    game.logic.Map.prototype.applyModificationsBatch = function (batch) {
        var id, modification, target;
        for (id in batch) {
            modification = batch[id];
            target = this._idToObject[id];
            util.assertDefined(target, "Modification has no target");
            target.applyModification(modification);
        }
    };

    /**
     * @param {game.data.GameObject} object
     * @return {phys.Body.<?>}
     */
    function unwrapGameObject(object) {
        return object.body;
    }

    game.logic.Map.prototype.validatePhysics = function () {
        var now = Date.now();
        if (util.isDefined(this._lastUpdate)) {
            var oldPositions = {},
                batchBuilder = game.data.buildModificationsBatch(),
                batch;
            this._objects.forEach(function (object) {
                oldPositions[object.id] = object.body.position;
            });
            this._world.simulate(this._objects, unwrapGameObject, (now - this._lastUpdate) / 1000);
            this._objects.forEach(function (object) {
                var id = object.id,
                    oldPosition = oldPositions[id],
                    newPosition = object.body.position;
                if (!oldPosition.approximatelyEqual(newPosition)) {
                    batchBuilder.add(
                        id,
                        game.data.buildModification()
                            .setPosition(newPosition)
                            .build()
                    );
                }
            });
            batch = batchBuilder.build();
            if (!util.isObjectEmpty(batch)) {
                this.fire(game.logic.E_OBJECTS_MODIFIED, batch);
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