// requires geom
(function () {
    /**
     * @param {CanvasRenderingContext2D} context
     * @constructor
     */
    visual.Scene = function (context) {
        this._ctx = context;
    };

    /**
     * @template T
     * @param {T} wrappers
     * @param {function(T):visual.Mesh} unwrapper
     * @param {function(T):geom.Vector} positionExtractor
     */
    visual.Scene.prototype.drawScene = function (wrappers, unwrapper, positionExtractor) {
        var canvas = this._ctx.canvas,
            width = canvas.width,
            height = canvas.height;
        this._ctx.clearRect(0, 0, width, height);
        wrappers.forEach(function (wrapper) {
            var unwrapped = unwrapper.call(null, wrapper),
                position = positionExtractor.call(null, wrapper);
            unwrapped.draw(this._ctx, position);
        }, this);
    };

    /**
     * @constructor
     */
    visual.Mesh = function () {
        /**
         * @const {string}
         */
        this.type = this.constructor.TYPE;
    };

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {geom.Vector} position
     */
    visual.Mesh.prototype.draw = function (context, position) {
    };

    /**
     * @param {number} radius
     * @constructor
     * @extends {visual.Mesh}
     */
    visual.Circle = function (radius) {
        visual.Mesh.call(this);
        /**
         * @const {number}
         */
        this.radius = radius;
    };

    /**
     * @static
     * @const {string}
     */
    visual.Circle.TYPE = 'circle';

    /**
     * @static
     * @param {visual.Circle} obj
     * @return {visual.Circle}
     */
    visual.Circle.revive = function (obj) {
        return new visual.Circle(obj.radius);
    };

    /**
     * @inheritDoc
     */
    visual.Circle.prototype.draw = function (context, position) {
        context.beginPath();
        context.arc(position.x, position.y, this.radius, 0, 2 * Math.PI);
        context.stroke();
    };

    /**
     * @param {number} width
     * @param {number} height
     * @constructor
     * @extends {visual.Mesh}
     */
    visual.Rectangle = function (width, height) {
        visual.Mesh.call(this);
        /**
         * @const {number}
         */
        this.width = width;
        /**
         * @const {number}
         */
        this.height = height;
    };

    /**
     * @static
     * @const {string}
     */
    visual.Rectangle.TYPE = 'rect';

    /**
     * @static
     * @param {visual.Rectangle} obj
     * @return {visual.Rectangle}
     */
    visual.Rectangle.revive = function (obj) {
        return new visual.Rectangle(obj.width, obj.height);
    };

    /**
     * @inheritDoc
     */
    visual.Rectangle.prototype.draw = function (context, position) {
        context.beginPath();
        context.moveTo(position.x - this.width / 2, position.y - this.height / 2);
        context.lineTo(position.x + this.width / 2, position.y - this.height / 2);
        context.lineTo(position.x + this.width / 2, position.y + this.height / 2);
        context.lineTo(position.x - this.width / 2, position.y + this.height / 2);
        context.closePath();
        context.stroke();
    };

    var reviversHolder = new util.ReviversHolder(
        /**
         * @param {visual.Mesh} mesh
         * @return {string}
         */
        function (mesh) {
            return mesh.type;
        }
    );

    reviversHolder.registerReviver(visual.Circle.TYPE, visual.Circle.revive);
    reviversHolder.registerReviver(visual.Rectangle.TYPE, visual.Rectangle.revive);

    /**
     * @template T
     * @param {T} mesh
     * @return {T}
     */
    visual.reviveMesh = function (mesh) {
        return reviversHolder.revive(mesh);
    }
})();