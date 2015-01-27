var goog = {
    provide: function (pack) {
        var context = window;
        pack.split('.').forEach(function (part) {
            if (context[part] === void 0) {
                context[part] = {};
            }
            context = context[part];
        });
    },
    require: function (pack) {}
};