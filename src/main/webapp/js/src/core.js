var module = (function () {
    /**
     * @type {Object<string, *>}
     */
    var modules = Object.create(null);
    /**
     * @type {Object<string, Array<string>>}
     */
    var dependencies = Object.create(null);
    /**
     * @type {Object<string, Array<string>>}
     */
    var waiting = Object.create(null);
    /**
     * @type {Object<string, Array<string>>}
     */
    var waited = Object.create(null);

    /**
     * @param {string} name
     */
    function init(name) {
        modules[name] = modules[name].apply(null, dependencies[name].map(function (dep) {
            return modules[dep];
        }));
        delete waiting[name];
        delete dependencies[name];
        if (waited[name]) {
            waited[name].forEach(function (mod) {
                var idx = waiting[mod].indexOf(name);
                waiting[mod].splice(idx, 1);
                if (waiting[mod].length === 0) {
                    init(mod);
                }
            });
            delete waited[name];
        }
    }

    /**
     * @param {string} name
     * @param {Array<string>} deps
     * @param {function(Array<string>)} provider
     */
    function module(name, deps, provider) {
        var unresolved = deps.filter(function (dep) {
            return !modules[dep] || waiting[dep];
        });
        dependencies[name] = deps;
        modules[name] = provider;
        if (unresolved.length) {
            dependencies[name] = deps;
            waiting[name] = unresolved;
            unresolved.forEach(function (dep) {
                if (!waited[dep]) {
                    waited[dep] = [];
                }
                waited[dep].push(name);
            });
        } else {
            init(name);
        }
    }

    return module;
})();