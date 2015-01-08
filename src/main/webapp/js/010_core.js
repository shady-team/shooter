module = (function () {
    /**
     * @type {Object<string, *>}
     */
    var modules = Object.create(null);

    /**
     * @param {string} name
     * @param {Array<string>} deps
     * @param {function(Array<string>)} init
     */
    function module(name, deps, init) {
        modules[name] = init.apply(null, deps.map(function (dep) { return modules[dep]; }));
    }

    return module;
})();