/** @define {boolean} */
var DEBUG = true;

/** @const */
var util = {};
/** @const */
var events = {};
/** @const */
var net = {};
/** @const */
var geom = {};
/** @const */
var phys = {};
/** @const */
var visual = {};
/** @const */
var game = {
    data: {},
    net: {},
    message: {},
    logic: {},
    server: {},
    client: {}
};

/** @const {number} */
var EPS = 1e-4;
/** @const {number} */
var PIXEL_PER_METER = 20;
/** @const {number} */
var G = PIXEL_PER_METER * 9.807;
/** @const {number} */
var RIGIDNESS = 100;