goog.provide('rtt');

goog.require('util');

(function() {
    /**
     * @interface
     */
    rtt.Typed = function () {
    };

    /**
     * @type {string}
     */
    rtt.Typed.prototype.type;

    /**
     * @param {rtt.Typed} typed
     * @return {string}
     */
    function extractType(typed) {
        return typed.type;
    }

    /**
     * @param {Array.<string>} types
     * @return {string}
     */
    function compoundKey(types) {
        return types.join("&");
    }

    /**
     * @param {function(?):?=} defMethod
     * @constructor
     */
    rtt.MutliMethod = function (defMethod) {
        /**
         * @const {?function(?):?}
         * @private
         */
        this._defMethod = defMethod || null;
        /**
         * @type {Object.<string,function(?):?>}
         * @private
         */
        this._overloads = util.emptyObject();
    };

    /**
     * @type {function(function(...[?]):?,...string)}
     */
    rtt.MutliMethod.prototype.overload = function (method) {
        var types = [].slice.call(arguments, 1),
            key = compoundKey(types);
        this._overloads[key] = method;
    };

    /**
     * @type {function(*,...rtt.Typed):?}
     */
    rtt.MutliMethod.prototype.call = function (thisObj) {
        return this.apply(thisObj, [].slice.call(arguments, 1));
    };

    /**
     * @param {*} thisObj
     * @param {Array.<rtt.Typed>} values
     * @return {?}
     */
    rtt.MutliMethod.prototype.apply = function (thisObj, values) {
        var types = values.map(extractType),
            key = compoundKey(types),
            overload = this._overloads[key],
            method = overload || this._defMethod;
        if (!util.isDefined(method))
            throw new Error("No such method");
        return method.apply(thisObj, values);
    };

    /**
     * @constructor
     */
    rtt.TypedContext = function () {
        /**
         * @type {Object.<string,Object>}
         * @private
         */
        this._prototypes = util.emptyObject();
        /**
         * @type {number}
         * @private
         */
        this._nextAutoType = 0;
    };

    /**
     * @param {string} name
     * @param {Object} prototype
     * @return {string}
     */
    rtt.TypedContext.prototype.registerType = function (name, prototype) {
        var type;
        if (DEBUG) {
            if (name in this._prototypes)
                throw new Error("type already registered");
            type = name;
        } else {
            type = "" + this._nextAutoType++;
        }
        this._prototypes[type] = prototype;
        return type;
    };

    /**
     * @param {*} obj
     * @returns {*}
     */
    rtt.TypedContext.prototype.serialize = function (obj) {
        if (obj === null)
            return null;
        var result, field;
        switch (typeof obj) {
            case 'undefined':
            case 'function':
                return undefined;
            case 'object':
                if (util.isArray(obj)) {
                    return obj.map(this.serialize, this);
                } else {
                    result = {};
                    for (field in obj)
                        if (obj.hasOwnProperty(field))
                            result[field] = this.serialize(obj[field]);
                    if (util.isDefined(obj.type))
                        result.type = obj.type;
                    return result;
                }
            default:
                return obj;
        }
    };

    /**
     * @this {rtt.TypedContext}
     * @param {*} value
     * @param {number} index
     * @param {Array.<*>} array
     */
    function deserializeEach(value, index, array) {
        array[index] = this.deserialize(value);
    }

    /**
     * @param {*} obj
     * @return {*}
     */
    rtt.TypedContext.prototype.deserialize = function (obj) {
        if (obj === null)
            return null;
        if (typeof obj === 'object') {
            if (util.isArray(obj)) {
                obj.forEach(deserializeEach, this);
                return obj;
            } else {
                var result = obj;
                if (util.isDefined(obj.type)) {
                    var proto = this._prototypes[obj.type];
                    util.assertDefined(proto, "Type not defined");
                    result = Object.create(proto);
                    delete obj.type;
                }
                for (var field in obj)
                    if (obj.hasOwnProperty(field))
                        result[field] = this.deserialize(obj[field]);
                return result;
            }
        } else {
            return obj;
        }
    };

    /**
     * @type {rtt.TypedContext}
     */
    rtt.global = new rtt.TypedContext;
})();