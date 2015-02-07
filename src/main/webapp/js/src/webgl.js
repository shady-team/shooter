goog.provide('webgl');

goog.require('util');
goog.require('rtt');

/** @const {boolean} */
var WEB_GL_DEBUG = false;

(function () {

    /** @type {WebGLRenderingContext} */
    var gl = null;

    function _initWebGLValues() {
        webgl.REPEAT_TEXTURE = [[gl.TEXTURE_WRAP_S, gl.REPEAT],
            [gl.TEXTURE_WRAP_T, gl.REPEAT]];
        webgl.CLAMP_TO_EDGE_TEXTURE = [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
            [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]];
        webgl.LINEAR_TEXTURE = [[gl.TEXTURE_MIN_FILTER, gl.LINEAR],
            [gl.TEXTURE_MAG_FILTER, gl.LINEAR]];
        webgl.NEAREST_TEXTURE = [[gl.TEXTURE_MIN_FILTER, gl.NEAREST],
            [gl.TEXTURE_MAG_FILTER, gl.NEAREST]];
    }

    var _coloredPolygonVShader = "" +
        "attribute vec2 position;" +
        "attribute vec4 color;" +
        "" +
        "varying vec4 v_color;" +
        "" +
        "void main()" +
        "{" +
        "    gl_Position = vec4(position, 0.0, 1.0);" +
        "    v_color = color;" +
        "}";

    var _coloredPolygonFShader = "" +
        "precision mediump float;" +
        "" +
        "varying vec4 v_color;" +
        "" +
        "void main()" +
        "{" +
        "    gl_FragColor = v_color;" +
        "}";

    function _initColoredPolygonProgram() {
        webgl.coloredPolygonProgram = webgl.build_program(_coloredPolygonVShader, _coloredPolygonFShader);
        var gl_program = webgl.coloredPolygonProgram;

        gl.useProgram(gl_program);
        gl_program.positionAttrib = gl.getAttribLocation(gl_program, 'position');
        gl_program.colorAttrib = gl.getAttribLocation(gl_program, 'color');
        gl.useProgram(null);

        gl_program.indexBuf = new webgl.VertexBufferObject(gl.ELEMENT_ARRAY_BUFFER);
        gl_program.positionBuf = new webgl.VertexBufferObject();
        gl_program.colorBuf = new webgl.VertexBufferObject();
    }

    webgl.setupWebGL = function (canvas) {
        var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
        var context = null;
        webgl.height = canvas.height;
        webgl.width = canvas.width;
        for (var ii = 0; ii < names.length; ++ii) {
            try {
                context = canvas.getContext(names[ii]);
            } catch (e) {
            }
            if (context != null) {
                gl = context;
                if (WEB_GL_DEBUG) {
                    var throwOnGLError = function (err, funcName, args) {
                        alert(WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName);
                        throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
                    };

                    gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError);
                }
                _initWebGLValues();
                _initColoredPolygonProgram();
                return true;
            }
        }
        return false;
    };

    function _build_shader(shader_code, shader_type) {
        var shader = gl.createShader(shader_type);
        gl.shaderSource(shader, shader_code);
        gl.compileShader(shader);

        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        } else {
            console.log('Shader compilation failed!');
            var compilationLog = gl.getShaderInfoLog(shader);
            console.log('Shader compiler log: ' + compilationLog);
            alert('Shader compiler log: ' + compilationLog);
            return null;
        }
    }

    /**
     * @param {string} vertex_code
     * @param {string} fragment_code
     */
    webgl.build_program = function (vertex_code, fragment_code) {
        var gl_program = gl.createProgram();

        var vertex = _build_shader(vertex_code, gl.VERTEX_SHADER);
        if (!vertex) {
            return null;
        }
        gl.attachShader(gl_program, vertex);

        if (fragment_code != null) {
            var fragment = _build_shader(fragment_code, gl.FRAGMENT_SHADER);
            if (!fragment) {
                return null;
            }
            gl.attachShader(gl_program, fragment);
        }

        gl.linkProgram(gl_program);

        var success = gl.getProgramParameter(gl_program, gl.LINK_STATUS);
        if (!success) {
            var error_log = gl.getProgramInfoLog(gl_program);
            console.log("Error in program linking: " + error_log);
            alert("Error in program linking: " + error_log);
            return null;
        }

        gl.detachShader(gl_program, vertex);
        if (fragment_code != null) {
            gl.detachShader(gl_program, fragment);
        }
        return gl_program;
    };

    /**
     * @param {number=} target
     * @constructor
     */
    webgl.VertexBufferObject = function (target) {
        this.target = target || gl.ARRAY_BUFFER;
        this.handle = gl.createBuffer();
    };

    webgl.VertexBufferObject.prototype.bind = function () {
        gl.bindBuffer(this.target, this.handle);
    };

    webgl.VertexBufferObject.prototype.unbind = function () {
        gl.bindBuffer(this.target, null);
    };

    /**
     * @constructor
     */
    webgl.Framebuffer = function () {
        this.handle = gl.createFramebuffer();
    };

    webgl.Framebuffer.prototype.bind = function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
    };

    webgl.Framebuffer.prototype.unbind = function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };


    var _next_texture_slot = 1;

    /**
     * @constructor
     */
    webgl.Texture = function (target) {
        this.target = target;
        this.slot = _next_texture_slot;
        _next_texture_slot += 1;
        this.handle = gl.createTexture();
        this.bind();
        gl.bindTexture(this.target, this.handle);
        this.unbind();
    };

    webgl.Texture.prototype.bind = function () {
        gl.activeTexture(gl.TEXTURE0 + this.slot);
    };

    webgl.Texture.prototype.unbind = function () {
        gl.activeTexture(gl.TEXTURE0);
    };

    webgl.Texture.prototype.set_params = function (params) {
        for (var i = 0; i < params.length; i++) {
            var key = params[i][0];
            var value = params[i][1];
            if (value === parseInt(value, 10)) {
                gl.texParameteri(this.target, key, value);
            } else if (value === parseFloat(value)) {
                gl.texParameterf(this.target, key, value);
            } else {
                console.log("No glTexParameter for key = " + key + " value = " + value);
            }
        }
    };

    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     * @constructor
     */
    webgl.Color = function (r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    };

    webgl.RED_COLOR = new webgl.Color(0.5, 0, 0, 1.0);
    webgl.WHITE_COLOR = new webgl.Color(1.0, 1.0, 1.0, 1.0);
    webgl.GREEN_COLOR = new webgl.Color(0, 0.5, 0, 1.0);
    webgl.BLUE_COLOR = new webgl.Color(0, 0, 0.5, 1.0);


    /**
     * @param {Float32Array} positions
     * @param {Uint16Array} indices
     * @param {Float32Array} colors
     */
    webgl.drawTriangles = function (positions, indices, colors) {
        util.assert(indices.length % 3 == 0);
        util.assert((util.maxInArray(indices) + 1) * 4 == colors.length);
        util.assert(util.minInArray(indices) == 0);
        util.assert(positions.length * 4 == colors.length * 2);

        var glProgram = webgl.coloredPolygonProgram;

        var indexBuf = glProgram.indexBuf;
        var positionBuf = glProgram.positionBuf;
        var colorBuf = glProgram.colorBuf;

        indexBuf.bind();
        gl.bufferData(indexBuf.target, indices, gl.DYNAMIC_DRAW);
        indexBuf.unbind();

        positionBuf.bind();
        gl.bufferData(positionBuf.target, positions, gl.DYNAMIC_DRAW);
        positionBuf.unbind();

        colorBuf.bind();
        gl.bufferData(colorBuf.target, colors, gl.DYNAMIC_DRAW);
        colorBuf.unbind();

        gl.useProgram(glProgram);

        positionBuf.bind();
        gl.enableVertexAttribArray(glProgram.positionAttrib);
        gl.vertexAttribPointer(glProgram.positionAttrib, 2, gl.FLOAT, false, 2 * 4, 0);
        positionBuf.unbind();

        colorBuf.bind();
        gl.enableVertexAttribArray(glProgram.colorAttrib);
        gl.vertexAttribPointer(glProgram.colorAttrib, 4, gl.FLOAT, false, 4 * 4, 0);
        colorBuf.unbind();

        gl.viewport(0, 0, webgl.width, webgl.height);
        gl.clearColor(0, 0, 0.1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        indexBuf.bind();
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        indexBuf.unbind();
        gl.useProgram(null);
    }

})();