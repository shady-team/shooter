goog.provide('visual');

goog.require('util');
goog.require('rtt');
goog.require('geom');
goog.require('webgl');
goog.require('matrix');

/** @const {number} */
var CIRCLE_EDGE_PIXEL_LENGTH = 5;

(function () {
    /**
     * @constructor
     */
    visual.Scene = function () {
    };

    /**
     * @template T
     * @param {geom.Vector} sceneCenter
     * @param {geom.Vector} canvasSize
     * @param {number} sceneWidth
     * @param {Array.<T>} wrappers
     * @param {function(T):visual.TrianglesMesh} unwrapper
     * @param {function(T):boolean} isObstacleChecker
     * @param {function(T):geom.Vector} positionExtractor
     * @param {function(T):number} angleExtractor
     * @param {Array.<matrix.Matrix3>} lightsFrustums
     * @param {Array.<geom.Vector>} lightPositions
     * @param {Array.<number>} lightRanges
     */
    visual.Scene.prototype.drawScene = function (sceneCenter, canvasSize, sceneWidth,
                                                 wrappers, unwrapper, isObstacleChecker, positionExtractor, angleExtractor,
                                                 lightsFrustums, lightPositions, lightRanges) {
        var positionsArrays = [],
            indicesArrays = [],
            colorsArrays = [],
            isObstacleMask = [],
            pointsCount = 0,
            indicesCount = 0;
        wrappers.forEach(function (wrapper) {
            var unwrapped = unwrapper.call(null, wrapper),
                position = positionExtractor.call(null, wrapper),
                angle = angleExtractor.call(null, wrapper);
            var positions = unwrapped.getPositions(position, angle);
            var indices = unwrapped.indices;
            var colors = unwrapped.colors;
            positionsArrays.push(positions);
            indicesArrays.push(indices);
            colorsArrays.push(colors);
            isObstacleMask.push(isObstacleChecker(wrapper));
            pointsCount += positions.length / 2;
            indicesCount += indices.length;
        }, this);
        var allPositions = new Float32Array(pointsCount * 2),
            allIndices = new Uint16Array(indicesCount),
            allColors = new Float32Array(pointsCount * 4),
            pointOffset = 0,
            indicesOffset = 0;
        for (var i = 0; i < positionsArrays.length; i++) {
            var positions = positionsArrays[i];
            var indices = indicesArrays[i];
            var colors = colorsArrays[i];
            for (var j = 0; j < positions.length; j++) {
                allPositions[pointOffset * 2 + j] = positions[j];
            }
            for (j = 0; j < colors.length; j++) {
                allColors[pointOffset * 4 + j] = colors[j];
            }
            for (j = 0; j < indices.length; j++) {
                allIndices[indicesOffset + j] = pointOffset + indices[j];
            }
            pointOffset += positions.length / 2;
            indicesOffset += indices.length;
        }
        if (lightsFrustums.length == 0) {
            webgl.drawTriangles(sceneCenter, canvasSize, sceneWidth, allPositions, allIndices, allColors);
        } else {
            pointOffset = 0;
            for (i = 0; i < positionsArrays.length; i++) {
                positions = positionsArrays[i];
                var isObstacle = isObstacleMask[i];
                for (j = 0; j < positions.length; j++) {
                    if (isObstacle) {
                        allPositions[pointOffset * 2 + j] = 0;
                    }
                }
                pointOffset += positions.length / 2;
            }
            webgl.renderShadows(allPositions, allIndices, lightsFrustums);

            pointOffset = 0;
            for (i = 0; i < positionsArrays.length; i++) {
                positions = positionsArrays[i];
                isObstacle = isObstacleMask[i];
                for (j = 0; j < positions.length; j++) {
                    allPositions[pointOffset * 2 + j] = positions[j];
                }
                pointOffset += positions.length / 2;
            }
            webgl.drawShadowedTriangles(sceneCenter, canvasSize, sceneWidth, allPositions, allIndices, allColors,
                lightsFrustums, lightPositions, lightRanges);
        }
    };


    /**
     * @param {Float32Array} positions
     * @param {Uint16Array} indices
     * @param {Float32Array} colors
     * @constructor
     * @implements {rtt.Typed}
     */
    visual.TrianglesMesh = function (positions, indices, colors) {
        util.assert(indices.length % 3 == 0);
        util.assert((util.maxInArray(indices) + 1) * 4 == colors.length);
        util.assert(util.minInArray(indices) == 0);
        util.assert(positions.length * 4 == colors.length * 2);
        this.positions = positions;
        this.indices = indices;
        this.colors = colors;
    };

    /**
     * @type {string}
     */
    visual.TrianglesMesh.prototype.type;

    /**
     * @param {geom.Vector} offset
     * @param {number} angle - degree of mesh rotation (clockwise)
     *      So if angle = 0: mesh will be returned as is
     * @return {Float32Array}
     */
    visual.TrianglesMesh.prototype.getPositions = function (offset, angle) {
        var positions = new Float32Array(this.positions);
        var rotation = matrix.Matrix3.rotation(angle);
        for (var i = 0; i < positions.length; i++) {
            var xy = rotation.translate(new geom.Vector(positions[i * 2 + 0], positions[i * 2 + 1]));
            positions[i * 2 + 0] = xy.x;
            positions[i * 2 + 1] = xy.y;
        }
        for (var j = 0; j < positions.length; j++) {
            positions[j * 2 + 0] = positions[j * 2 + 0] + offset.x;
            positions[j * 2 + 1] = positions[j * 2 + 1] + offset.y;
        }
        return positions;
    };

    /**
     * @param {number} verticesCount
     * @param {webgl.Color} color
     * @return {Float32Array}
     */
    var _generateColors = function (verticesCount, color) {
        var colors = new Float32Array(verticesCount * 4);
        for (var i = 0; i < verticesCount; i++) {
            colors[i * 4 + 0] = color.r;
            colors[i * 4 + 1] = color.g;
            colors[i * 4 + 2] = color.b;
            colors[i * 4 + 3] = color.a;
        }
        return colors;
    };


    /**
     * @param {number} radius
     * @param {webgl.Color} color
     * @constructor
     * @extends {visual.TrianglesMesh}
     */
    visual.Circle = function (radius, color) {
        /**
         * @const {number}
         */
        this.radius = radius;
        /**
         * @const {webgl.Color}
         */
        this.color = color;

        var pixels_perimeter = 2 * Math.PI * radius;
        var segments_count = Math.max(5, Math.round(pixels_perimeter / CIRCLE_EDGE_PIXEL_LENGTH));
        var vertices_count = segments_count + 1;

        var positions = new Float32Array(vertices_count * 2);
        var indices = new Uint16Array(segments_count * 3);
        positions[0] = 0;
        positions[1] = 0;
        for (var i = 0; i < segments_count; i++) {
            positions[(i + 1) * 2 + 0] = this.radius * Math.cos(2 * Math.PI * i / segments_count);
            positions[(i + 1) * 2 + 1] = this.radius * Math.sin(2 * Math.PI * i / segments_count);
            indices[i * 3 + 0] = 0;
            indices[i * 3 + 1] = i + 1;
            indices[i * 3 + 2] = 1 + (i + 1) % segments_count;
        }
        var colors = _generateColors(vertices_count, color);
        visual.TrianglesMesh.call(this, positions, indices, colors);
    };

    rtt.extend(visual.Circle, visual.TrianglesMesh, 'visual.Circle');


    /**
     * @param {number} radius
     * @param {webgl.Color} color
     * @param {number} removedAngle - in degrees (segment of circle, that will be empty)
     * @constructor
     * @extends {visual.TrianglesMesh}
     */
    visual.OrientedCircle = function (radius, color, removedAngle) {
        /**
         * @const {number}
         */
        this.radius = radius;
        /**
         * @const {webgl.Color}
         */
        this.color = color;

        removedAngle *= Math.PI / 180;
        var pixels_perimeter = (2 * Math.PI - removedAngle) * radius;
        var segments_count = Math.max(6, Math.round(pixels_perimeter / CIRCLE_EDGE_PIXEL_LENGTH));
        if (segments_count % 2 == 1) {
            segments_count += 1;
        }
        var vertices_count = segments_count + 2;

        var positions = new Float32Array(vertices_count * 2);
        var indices = new Uint16Array(segments_count * 3);
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = this.radius * Math.cos(removedAngle / 2.0);
        positions[3] = this.radius * Math.sin(removedAngle / 2.0);
        for (var i = 0; i < segments_count; i++) {
            var angle = removedAngle / 2.0 + (2 * Math.PI - removedAngle) * (i + 1) / segments_count;
            positions[(i + 2) * 2 + 0] = this.radius * Math.cos(angle);
            positions[(i + 2) * 2 + 1] = this.radius * Math.sin(angle);
            indices[i * 3 + 0] = 0;
            indices[i * 3 + 1] = i + 1;
            indices[i * 3 + 2] = i + 2;
        }
        var colors = _generateColors(vertices_count, color);
        visual.TrianglesMesh.call(this, positions, indices, colors);
    };

    rtt.extend(visual.OrientedCircle, visual.TrianglesMesh, 'visual.OrientedCircle');

    /**
     * @param {number} width
     * @param {number} height
     * @param {webgl.Color} color
     * @constructor
     * @extends {visual.TrianglesMesh}
     */
    visual.Rectangle = function (width, height, color) {
        /**
         * @const {number}
         */
        this.width = width;
        /**
         * @const {number}
         */
        this.height = height;
        /**
         * @const {webgl.Color}
         */
        this.color = color;

        var positions = new Float32Array([
            -width / 2, -height / 2,
            -width / 2, height / 2,
            width / 2, height / 2,
            width / 2, -height / 2]);
        var indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]);
        var colors = _generateColors(4, color);
        visual.TrianglesMesh.call(this, positions, indices, colors);
    };

    rtt.extend(visual.Rectangle, visual.TrianglesMesh, 'visual.Rectangle');
})();