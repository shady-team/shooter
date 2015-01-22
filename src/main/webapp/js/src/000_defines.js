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
var input = {};
/** @const */
var phys = {};
/** @const */
var visual = {};
/** @const */
var webgl = {};
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
/** @const {boolean} */
var WEB_GL_DEBUG = false;
/** @const {number} */
var CIRCLE_EDGE_PIXEL_LENGTH = 5;