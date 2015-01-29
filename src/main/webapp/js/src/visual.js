goog.provide('visual');

goog.require('util');
goog.require('rtt');
goog.require('geom');
goog.require('webgl');

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
     * @param {Array.<T>} wrappers
     * @param {function(T):visual.TrianglesMesh} unwrapper
     * @param {function(T):geom.Vector} positionExtractor
     */
    visual.Scene.prototype.drawScene = function (wrappers, unwrapper, positionExtractor) {
        var positionsArrays = [],
            indicesArrays = [],
            colorsArrays = [],
            pointsCount = 0,
            indicesCount = 0;
        wrappers.forEach(function (wrapper) {
            var unwrapped = unwrapper.call(null, wrapper),
                position = positionExtractor.call(null, wrapper);
            var positions = unwrapped.getPositionsWithOffset(position);
            var indices = unwrapped.indices;
            var colors = unwrapped.colors;
            positionsArrays.push(positions);
            indicesArrays.push(indices);
            colorsArrays.push(colors);
            pointsCount += positions.length / 2;
            indicesCount += indices.length;
        }, this);
        var allPositions = new Float32Array(pointsCount * 2),
            allIndices = new Uint16Array(indicesCount),
            allColors = new Float32Array(pointsCount * 4),
            pointOffset = 0,
            indicesOffset = 0;
        for (var i = 0; i < colorsArrays.length; i++) {
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
        webgl.drawTriangles(allPositions, allIndices, allColors);
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
        util.assert((indices.max() + 1) * 4 == colors.length);
        util.assert(indices.min() == 0);
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
     * @return {Float32Array}
     */
    visual.TrianglesMesh.prototype.getPositionsWithOffset = function (offset) {
        var positions = new Float32Array(this.positions);
        for (var i = 0; i < positions.length; i++) {
            //TODO: implement world coords to camera coords via matrix
            positions[i * 2 + 0] = (positions[i * 2 + 0] + offset.x) * 2 / webgl.width - 1;
            positions[i * 2 + 1] = (positions[i * 2 + 1] + offset.y) * 2 / webgl.height - 1;
            positions[i * 2 + 1] *= -1;
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

    visual.Circle.prototype = Object.create(visual.TrianglesMesh.prototype);

    /**
     * @const {string}
     */
    visual.Circle.prototype.type = rtt.registerType(visual.Circle.prototype, 'visual.Circle');

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

    visual.Rectangle.prototype = Object.create(visual.TrianglesMesh.prototype);

    /**
     * @static
     * @const {string}
     */
    visual.Rectangle.prototype.type = rtt.registerType(visual.Rectangle.prototype, 'visual.Rectangle');
})();