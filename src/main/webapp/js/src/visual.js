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
     * @param {function(T):boolean} isTransparentChecker
     * @param {function(T):boolean} isAlwaysVisibleChecker
     * @param {function(T):geom.Vector} positionExtractor
     * @param {function(T):number} angleExtractor
     * @param {Array.<matrix.Matrix3>} lightsFrustums
     * @param {Array.<geom.Vector>} lightPositions
     * @param {Array.<number>} lightRanges
     */
    visual.Scene.prototype.drawScene = function (sceneCenter, canvasSize, sceneWidth,
                                                 wrappers, unwrapper, isTransparentChecker, isAlwaysVisibleChecker, positionExtractor, angleExtractor,
                                                 lightsFrustums, lightPositions, lightRanges) {
        var positionsArrays = [],
            indicesArrays = [],
            colorsArrays = [],
            isTransparentMask = [],
            isAlwaysVisibleMask = [],
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
            isTransparentMask.push(isTransparentChecker(wrapper));
            isAlwaysVisibleMask.push(isAlwaysVisibleChecker(wrapper));
            pointsCount += positions.length / 3;
            indicesCount += indices.length;
        }, this);
        var allPositions = new Float32Array(pointsCount * 3),
            allIndices = new Uint16Array(indicesCount),
            allColors = new Float32Array(pointsCount * 4),
            positionOffset = 0,
            colorOffset = 0,
            indicesOffset = 0;
        for (var i = 0; i < positionsArrays.length; i++) {
            var positions = positionsArrays[i];
            var indices = indicesArrays[i];
            var colors = colorsArrays[i];
            for (var j = 0; j < positions.length; j++) {
                allPositions[positionOffset + j] = positions[j];
            }
            for (j = 0; j < colors.length; j++) {
                allColors[colorOffset + j] = colors[j];
            }
            for (j = 0; j < indices.length; j++) {
                allIndices[indicesOffset + j] = positionOffset / 3 + indices[j];
            }
            positionOffset += positions.length;
            colorOffset += colors.length;
            indicesOffset += indices.length;
        }
        if (lightsFrustums.length == 0) {
            webgl.drawShadowedTriangles(sceneCenter, canvasSize, sceneWidth, allPositions, allIndices, allColors,
                lightsFrustums, lightPositions, lightRanges, 0.5);
        } else {
            positionOffset = 0;
            for (i = 0; i < positionsArrays.length; i++) {
                positions = positionsArrays[i];
                var isTransparent = isTransparentMask[i];
                for (j = 0; j < positions.length; j++) {
                    if (isTransparent) {
                        allPositions[positionOffset + j] = 0;
                    }
                }
                positionOffset += positions.length;
            }
            webgl.renderShadows(allPositions, allIndices, lightsFrustums);

            positionOffset = 0;
            for (i = 0; i < positionsArrays.length; i++) {
                positions = positionsArrays[i];
                for (j = 0; j < positions.length; j++) {
                    allPositions[positionOffset + j] = positions[j];
                }
                positionOffset += positions.length;
            }
            webgl.drawShadowedTriangles(sceneCenter, canvasSize, sceneWidth, allPositions, allIndices, allColors,
                lightsFrustums, lightPositions, lightRanges, 0.0);

            positionOffset = 0;
            for (i = 0; i < positionsArrays.length; i++) {
                positions = positionsArrays[i];
                var isAlwaysVisible = isAlwaysVisibleMask[i];
                if (!isAlwaysVisible) {
                    for (j = 0; j < positions.length; j++) {
                        allPositions[positionOffset + j] = 0;
                    }
                }
                positionOffset += positions.length;
            }
            webgl.drawTriangles(sceneCenter, canvasSize, sceneWidth, allPositions, allIndices, allColors, false);
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
        util.assert(positions.length * 4 == colors.length * 3);
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
        var translating = matrix.Matrix3.translation(offset.x, offset.y);
        var transform = translating.dot(rotation);
        for (var i = 0; 3 * i < this.positions.length; i++) {
            var xy = transform.translate(new geom.Vector(this.positions[i * 3 + 0], this.positions[i * 3 + 1]));
            positions[i * 3 + 0] = xy.x;
            positions[i * 3 + 1] = xy.y;
            positions[i * 3 + 2] = this.positions[i * 3 + 2];
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
     * @param {number=} z
     * @constructor
     * @extends {visual.TrianglesMesh}
     */
    visual.Circle = function (radius, color, z) {
        /**
         * @const {number}
         */
        this.radius = radius;
        /**
         * @const {webgl.Color}
         */
        this.color = color;

        if (z == null) {
            z = 0.0;
        }

        var pixels_perimeter = 2 * Math.PI * radius;
        var segments_count = Math.max(5, Math.round(pixels_perimeter / CIRCLE_EDGE_PIXEL_LENGTH));
        var vertices_count = segments_count + 1;

        var positions = new Float32Array(vertices_count * 3);
        var indices = new Uint16Array(segments_count * 3);
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = z;
        for (var i = 0; i < segments_count; i++) {
            positions[(i + 1) * 3 + 0] = this.radius * Math.cos(2 * Math.PI * i / segments_count);
            positions[(i + 1) * 3 + 1] = this.radius * Math.sin(2 * Math.PI * i / segments_count);
            positions[(i + 1) * 3 + 2] = z;
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
     * @param {number=} z
     * @constructor
     * @extends {visual.TrianglesMesh}
     */
    visual.OrientedCircle = function (radius, color, removedAngle, z) {
        /**
         * @const {number}
         */
        this.radius = radius;
        /**
         * @const {webgl.Color}
         */
        this.color = color;

        if (z == null) {
            z = 0.0;
        }

        removedAngle *= Math.PI / 180;
        var pixels_perimeter = (2 * Math.PI - removedAngle) * radius;
        var segments_count = Math.max(6, Math.round(pixels_perimeter / CIRCLE_EDGE_PIXEL_LENGTH));
        if (segments_count % 2 == 1) {
            segments_count += 1;
        }
        var vertices_count = segments_count + 2;

        var positions = new Float32Array(vertices_count * 3);
        var indices = new Uint16Array(segments_count * 3);
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = z;
        positions[3] = this.radius * Math.cos(removedAngle / 2.0);
        positions[4] = this.radius * Math.sin(removedAngle / 2.0);
        positions[5] = z;
        for (var i = 0; i < segments_count; i++) {
            var angle = removedAngle / 2.0 + (2 * Math.PI - removedAngle) * (i + 1) / segments_count;
            positions[(i + 2) * 3 + 0] = this.radius * Math.cos(angle);
            positions[(i + 2) * 3 + 1] = this.radius * Math.sin(angle);
            positions[(i + 2) * 3 + 2] = z;
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
     * @param {number=} z
     * @constructor
     * @extends {visual.TrianglesMesh}
     */
    visual.Rectangle = function (width, height, color, z) {
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

        if (z == null) {
            z = 0.0;
        }

        var positions = new Float32Array([
            -width / 2, -height / 2, z,
            -width / 2, height / 2, z,
            width / 2, height / 2, z,
            width / 2, -height / 2, z]);
        var indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]);
        var colors = _generateColors(4, color);
        visual.TrianglesMesh.call(this, positions, indices, colors);
    };

    rtt.extend(visual.Rectangle, visual.TrianglesMesh, 'visual.Rectangle');
})();