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
     * @type {Object.<string,?Object>}
     */
    var types = util.emptyObject();
    var nextAutoType = 0;

    /**
     * @param {?Object} prototype
     * @param {string=} name
     * @return {string}
     */
    rtt.registerType = function (prototype, name) {
        /** @type {string} **/
        var type;
        if (DEBUG) {
            if (!util.isDefined(name)) {
                do {
                    type = (nextAutoType++).toString(36);
                } while (type in types);
            } else {
                type = /** @type {string} **/(name);
            }
            if (type in types)
                throw new Error("type already registered");
        } else {
            type = (nextAutoType++).toString(36);
        }
        types[type] = prototype;
        return type;
    };

    var numberType = rtt.registerType(null, 'number'),
        /** @type {Array.<Object>} **/
        primitiveTypePrototypes = [],
        /** @type {Array.<{type: string, serializer: function(?):*}>} **/
        primitiveTypeInfo = [],
        /** @type {Object.<string, function(?):*>} **/
        primitiveTypeDeserializers = util.emptyObject();

    var nativeArrays = [
        Int8Array,
        Int16Array,
        Int32Array,
        Uint8Array,
        Uint16Array,
        Uint32Array,
        Float32Array,
        Float64Array
    ];

    /**
     * @param {{length: number}} value
     * @return {Array.<*>}
     */
    function nativeArraySerializer(value) {
        return [].slice.call(value);
    }

    /**
     * @template T, A
     * @param {function(new:T, Array.<A>)} constructor
     * @param {Array.<A>} value
     * @return {T}
     */
    function nativeArrayDeserializer(constructor, value) {
        return new constructor(value);
    }

    nativeArrays.forEach(function (na) {
        var type = rtt.registerType(null);
        primitiveTypePrototypes.push(na.prototype);
        primitiveTypeInfo.push({
            type: type,
            serializer: nativeArraySerializer
        });
        primitiveTypeDeserializers[type] = nativeArrayDeserializer.bind(null, na);
    });

    /**
     * @param {{type: string, serializer: function(*):*}} primitiveInfo
     * @param {*} value
     * @return {{type: string, value: *}}
     */
    function wrapPrimitive(primitiveInfo, value) {
        return {
            type: primitiveInfo.type,
            value: primitiveInfo.serializer(value)
        };
    }

    /**
     * @param {number} number
     * @return {{type: string, value: string}}
     */
    function wrapNumber(number) {
        return {
            type: numberType,
            value: '' + number
        };
    }

    /**
     * @param {*} obj
     * @returns {*}
     */
    rtt.serialize = function (obj) {
        if (obj === null)
            return null;
        var result, field;
        switch (typeof obj) {
            case 'undefined':
            case 'function':
                return undefined;
            case 'object':
                var idx = primitiveTypePrototypes.indexOf(Object.getPrototypeOf(/** @type {!Object} **/(obj)));
                if (idx !== -1) {
                    return wrapPrimitive(primitiveTypeInfo[idx], obj);
                } else if (util.isArray(obj)) {
                    return obj.map(rtt.serialize);
                } else {
                    result = {};
                    for (field in obj)
                        if (obj.hasOwnProperty(field))
                            result[field] = rtt.serialize(obj[field]);
                    if (util.isDefined(obj.type))
                        result.type = obj.type;
                    return result;
                }
            case 'number':
                if (!isFinite(obj))
                    return wrapNumber(obj);
            default:
                return obj;
        }
    };

    /**
     * @param {*} value
     * @param {number} index
     * @param {Array.<*>} array
     */
    function deserializeEach(value, index, array) {
        array[index] = rtt.deserialize(value);
    }

    /**
     * @param {*} obj
     * @return {*}
     */
    rtt.deserialize = function (obj) {
        if (obj === null)
            return null;
        if (typeof obj === 'object') {
            if (util.isArray(obj)) {
                obj.forEach(deserializeEach, this);
                return obj;
            } else {
                var result = obj;
                if (util.isDefined(obj.type)) {
                    if (obj.type === numberType) {
                        return +obj.value;
                    }
                    if (obj.type in primitiveTypeDeserializers) {
                        return primitiveTypeDeserializers[obj.type].call(null, obj.value);
                    }
                    var proto = types[obj.type];
                    util.assertDefined(proto, "Type not defined");
                    result = Object.create(proto);
                    delete obj.type;
                }
                for (var field in obj)
                    if (obj.hasOwnProperty(field))
                        result[field] = rtt.deserialize(obj[field]);
                return result;
            }
        } else {
            return obj;
        }
    };
})();