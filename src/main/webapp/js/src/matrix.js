goog.provide('matrix');

goog.require('geom');

(function () {
    /**
     * 3x3 matrix
     * @constructor
     */
    matrix.Matrix3 = function Matrix3(a00, a01, a02, a10, a11, a12, a20, a21, a22) {
        /** @const */
        this.data = new Float32Array([
            a00, a01, a02,
            a10, a11, a12,
            a20, a21, a22
        ]);
    };

    /**
     * @static
     * @param {number} value
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.fill = function (value) {
        return new matrix.Matrix3(value, value, value, value, value, value, value, value, value);
    };

    /**
    * @return {matrix.Matrix3}
    */
    matrix.Matrix3.frustum = function (left, right, near, far) {
        return new matrix.Matrix3(
            2 * far / (right - left), (right + left) / (left - right), 0,
            0, (near + far) / (far - near), 2 * far * near / (near - far),
            0, 1, 0);
    };

    /**
     * @param {geom.Vector} position
     * @param {number} course in degrees
     * @param {number} angleOfView in degrees
     * @param {number} near
     * @param {number} far
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.frustumDirected = function (position, course, angleOfView, near, far) {
        angleOfView = angleOfView * Math.PI / 180;
        var right = Math.tan(angleOfView / 2) * far;
        var left = -right;

        var rotation = matrix.Matrix3.rotation(-(course-90));
        var translation = matrix.Matrix3.translation(-position.x, -position.y);
        var res = matrix.Matrix3.frustum(left, right, near, far).dot(rotation);
        return res.dot(translation);
    };

    /**
     * @static
     * @const {matrix.Matrix3}
     */
    matrix.Matrix3.ZEROS = matrix.Matrix3.fill(0);

    /**
     * @static
     * @const {matrix.Matrix3}
     */
    matrix.Matrix3.ONES = new matrix.Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1);

    /**
     * @param {number} angle - in degrees (from x axis to y axis (clockwise, if y is going downwards))
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.rotation = function (angle) {
        angle *= Math.PI / 180;
        return new matrix.Matrix3(
            Math.cos(angle), -Math.sin(angle), 0,
            Math.sin(angle), Math.cos(angle), 0,
            0, 0, 1);
    };

    /**
     * @param {number} dx
     * @param {number} dy
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.translation = function (dx, dy) {
        return new matrix.Matrix3(
            1, 0, dx,
            0, 1, dy,
            0, 0, 1);
    };

    /**
     * @param {geom.Rectangle} rectSrc
     * @param {geom.Rectangle} rectDst
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.rectToRect = function (rectSrc, rectDst) {
        var scaleX = (rectDst.b.x - rectDst.a.x) / (rectSrc.b.x - rectSrc.a.x);
        var scaleY = (rectDst.b.y - rectDst.a.y) / (rectSrc.b.y - rectSrc.a.y);
        return new matrix.Matrix3(
            scaleX, 0, rectDst.a.x - rectSrc.a.x * scaleX,
            0, scaleY, rectDst.a.y - rectSrc.a.y * scaleY,
            0, 0, 1);
    };

    /**
     * @param {number} mx - multiplier for x
     * @param {number} my - multiplier for y
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.scaling = function (mx, my) {
        return new matrix.Matrix3(
            mx, 0, 0,
            0, my, 0,
            0, 0, 1);
    };

    /**
     * @param {matrix.Matrix3} that
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.prototype.dot = function (that) {
        var a00 = this.data[0], a01 = this.data[1], a02 = this.data[2],
            a10 = this.data[3], a11 = this.data[4], a12 = this.data[5],
            a20 = this.data[6], a21 = this.data[7], a22 = this.data[8];
        var b00 = that.data[0], b01 = that.data[1], b02 = that.data[2],
            b10 = that.data[3], b11 = that.data[4], b12 = that.data[5],
            b20 = that.data[6], b21 = that.data[7], b22 = that.data[8];

        var c00 = a00 * b00 + a01 * b10 + a02 * b20;
        var c01 = a00 * b01 + a01 * b11 + a02 * b21;
        var c02 = a00 * b02 + a01 * b12 + a02 * b22;

        var c10 = a10 * b00 + a11 * b10 + a12 * b20;
        var c11 = a10 * b01 + a11 * b11 + a12 * b21;
        var c12 = a10 * b02 + a11 * b12 + a12 * b22;

        var c20 = a20 * b00 + a21 * b10 + a22 * b20;
        var c21 = a20 * b01 + a21 * b11 + a22 * b21;
        var c22 = a20 * b02 + a21 * b12 + a22 * b22;
        return new matrix.Matrix3(c00, c01, c02, c10, c11, c12, c20, c21, c22);
    };

    /**
     * @return {matrix.Matrix3}
     */
    matrix.Matrix3.prototype.transpose = function () {
        var a00 = this.data[0], a01 = this.data[1], a02 = this.data[2],
            a10 = this.data[3], a11 = this.data[4], a12 = this.data[5],
            a20 = this.data[6], a21 = this.data[7], a22 = this.data[8];

        return new matrix.Matrix3(a00, a10, a20, a01, a11, a21, a02, a12, a22);
    };

    /**
     * @param {geom.Vector} point
     * @return {geom.Vector}
     */
    matrix.Matrix3.prototype.translate = function (point) {
        var a00 = this.data[0], a01 = this.data[1], a02 = this.data[2],
            a10 = this.data[3], a11 = this.data[4], a12 = this.data[5],
            a20 = this.data[6], a21 = this.data[7], a22 = this.data[8];
        var x = a00 * point.x + a01 * point.y + a02;
        var y = a10 * point.x + a11 * point.y + a12;
        var z = a20 * point.x + a21 * point.y + a22;
        return new geom.Vector(x/z, y/z);
    };

    matrix.Matrix3.prototype.type = rtt.registerType(matrix.Matrix3.prototype, 'matrix.Matrix3');
})();