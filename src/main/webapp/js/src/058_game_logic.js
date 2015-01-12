// requires util
(function () {
    /**
     * @param {Array.<game.data.GameObject>} objects
     * @constructor
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
        objects.forEach(putToMap, this);
    };

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

    /**
     * @return {game.data.ModificationsBatch}
     */
    game.logic.Map.prototype.validatePhysics = function () {
        var oldPositions = {},
            batchBuilder = game.data.buildModificationsBatch();
        this._objects.forEach(function (object) {
            oldPositions[object.id] = object.body.position;
        });
        phys.simulate(this._objects, unwrapGameObject);
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
        return batchBuilder.build();
    };

    /**
     * @return {Array.<game.data.GameObject>}
     */
    game.logic.Map.prototype.getObjectsSnapshot = function () {
        return this._objects.slice();
    }
})();