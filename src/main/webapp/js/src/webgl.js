goog.provide('webgl');

goog.require('util');
goog.require('rtt');
goog.require('matrix');

/** @const {boolean} */
var WEB_GL_DEBUG = false;

(function () {

    /** @type {WebGLRenderingContext} */
    var gl = null;

    webgl.LIGHTS_MAX = 64;
    webgl.SHADOW_RESOLUTION = 512;

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

    var _coloredPolygonVShader = '' +
        'attribute vec2 position;' +
        'attribute vec4 color;' +
        '' +
        'uniform mat3 iFrustum;' +
        '' +
        'varying vec4 vColor;' +
        '' +
        'void main()' +
        '{' +
        '    vec3 cameraPosition = iFrustum * vec3(position, 1.0);' +
        '    gl_Position = vec4(cameraPosition.xy/cameraPosition.z, 0.0, 1.0);' +
        '    vColor = color;' +
        '}';

    var _coloredPolygonFShader = '' +
        'precision mediump float;' +
        '' +
        'varying vec4 vColor;' +
        '' +
        'void main()' +
        '{' +
        '    gl_FragColor = vColor;' +
        '}';

    var _shadowCasterVShader = '' +
        'precision mediump float;' +
        '' +
        'uniform mat3 iFrustums[LIGHTS_MAX];' +
        '' +
        'attribute vec2 position;' +
        'attribute float lightIndexF;' +
        '' +
        'varying float vDepth;' +
        'varying float zDepth;' +
        '' +
        'void main()' +
        '{' +
        '    vec3 cameraPosition = iFrustums[int(lightIndexF+0.5)] * vec3(position, 1.0);' +
        '    float x = cameraPosition.x;' +
        '    float y = cameraPosition.y;' +
        '    float z = cameraPosition.z;' +
        '    vDepth = y;' +
        '    zDepth = z;' +
        '    gl_Position = vec4(x, z * (-1.0 + (1.0 + 2.0*lightIndexF)/float(LIGHTS_MAX)), y, z);' +
        '}';

    var _shadowCasterFShader = '' +
        'precision mediump float;' +
        '' +
        'varying float vDepth;' +
        'varying float zDepth;' +
        '' +
        'vec4 pack(float depth){' +
        '    const vec4 bitSh = vec4(256 * 256 * 256,' +
        '        256 * 256,' +
        '        256,' +
        '        1.0);' +
        '    const vec4 bitMsk = vec4(0,' +
        '        1.0 / 256.0,' +
        '        1.0 / 256.0,' +
        '        1.0 / 256.0);' +
        '    vec4 comp = fract(depth * bitSh);' +
        '    comp -= comp.xxyz * bitMsk;' +
        '    return comp;' +
        '}' +
        '' +
        'void main()' +
        '{' +
        '    gl_FragColor = pack(vDepth/zDepth);' +
        '}';

    var _shadowedPolygonVShader = '' +
        'attribute vec3 position;' +
        'attribute vec4 color;' +
        '' +
        'uniform mat3 iFrustum;' +
        '' +
        'varying vec2 vPosition;' +
        'varying vec4 vColor;' +
        '' +
        'void main()' +
        '{' +
        '    vec3 cameraPosition = iFrustum * vec3(position.xy, 1.0);' +
        '    vPosition = position.xy;' +
        '    vColor = color;' +
        '    gl_Position = vec4(cameraPosition.xy, position.z, cameraPosition.z);' +
        '}';

    var _shadowedPolygonFShader = '' +
        'precision mediump float;' +
        '' +
        'uniform sampler2D depthTextures;' +
        '' +
        'uniform int lightsCount;' +
        'uniform float minLight;' +
        '' +
        'uniform mat3 worldToLightDepthTex[LIGHTS_MAX];' +
        'uniform vec2 lightPos[LIGHTS_MAX];' +
        'uniform float lightRange[LIGHTS_MAX];' +
        '' +
        'varying vec2 vPosition;' +
        'varying vec4 vColor;' +
        '' +
        'float unpack(vec4 color) {' +
        '    const vec4 bitShifts = vec4(1.0 / (256.0 * 256.0 * 256.0),' +
        '                                1.0 / (256.0 * 256.0),' +
        '                                1.0 / 256.0,' +
        '                                1);' +
        '    return dot(color, bitShifts);' +
        '}' +
        '' +
        'void main()' +
        '{' +
        '    float maxLight = minLight;' +
        '    for (int i = 0; i < LIGHTS_MAX; i++) {' +
        '        if (i >= lightsCount) {' +
        '            break;' +
        '        }' +
        '        vec3 depthTexPos = worldToLightDepthTex[i] * vec3(vPosition, 1.0);' +
        '        float x = depthTexPos.x;' +
        '        float y = depthTexPos.y;' +
        '        float z = depthTexPos.z;' +
        '        if (x >= 0.0 && x <= 1.0*z && y >= -1.0*z && y <= 1.0*z) {' +
        '            float distFromLight = length(vPosition - lightPos[i]);' +
        '            vec4 rgba = texture2D(depthTextures, vec2(x/z, (1.0 + 2.0*float(i))/(2.0*float(LIGHTS_MAX))));' +
        '            float lightDepth = unpack(rgba);' +
        '            if (distFromLight <= lightRange[i] && y/z <= lightDepth) {' +
        '                float linearLight = 1.0 + distFromLight * (minLight - 1.0) / lightRange[i];' +
        '                maxLight = max(linearLight, maxLight);' +
        '            }' +
        '        }' +
        '    }' +
        '    gl_FragColor = vColor;' +
        '    gl_FragColor.rgb *= maxLight;' +
        '}';

    function _initColoredPolygonProgram() {
        webgl.coloredPolygonProgram = webgl.buildProgram(_coloredPolygonVShader, _coloredPolygonFShader);
        var glProgram = webgl.coloredPolygonProgram;

        gl.useProgram(glProgram);
        glProgram.positionAttrib = gl.getAttribLocation(glProgram, 'position');
        glProgram.colorAttrib = gl.getAttribLocation(glProgram, 'color');

        glProgram.frustumUniform = gl.getUniformLocation(glProgram, 'iFrustum');
        gl.useProgram(null);

        glProgram.indexBuf = new webgl.VertexBufferObject(gl.ELEMENT_ARRAY_BUFFER);
        glProgram.positionBuf = new webgl.VertexBufferObject();
        glProgram.colorBuf = new webgl.VertexBufferObject();
    }

    function _initShadowCasterProgram() {
        webgl.shadowCasterProgram = webgl.buildProgram(_shadowCasterVShader.split("LIGHTS_MAX").join(webgl.LIGHTS_MAX.toString()),
                                                        _shadowCasterFShader.split("LIGHTS_MAX").join(webgl.LIGHTS_MAX.toString()));
        var glProgram = webgl.shadowCasterProgram;

        gl.useProgram(glProgram);
        glProgram.positionAttrib = gl.getAttribLocation(glProgram, 'position');
        glProgram.lightIndexAttrib = gl.getAttribLocation(glProgram, 'lightIndexF');

        glProgram.frustumUniforms = [];
        for (var i = 0; i < webgl.LIGHTS_MAX; i++) {
            glProgram.frustumUniforms.push(gl.getUniformLocation(glProgram,
                "iFrustums[LAYER_INDEX]".replace('LAYER_INDEX', i.toString())));
        }
        gl.useProgram(null);

        glProgram.indexBuf = new webgl.VertexBufferObject(gl.ELEMENT_ARRAY_BUFFER);
        glProgram.positionBuf = new webgl.VertexBufferObject();
        glProgram.lightIndexBuf = new webgl.VertexBufferObject();


        // Initiating 'Render-To-Texture' for shadows
        webgl.shadowCasterProgram.shadowFramebuffer = new webgl.Framebuffer();
        webgl.shadowCasterProgram.depthTex = new webgl.Texture(gl.TEXTURE_2D);
        webgl.shadowCasterProgram.depthTex.bind();
        webgl.shadowCasterProgram.depthTex.setParams(webgl.CLAMP_TO_EDGE_TEXTURE.concat(webgl.NEAREST_TEXTURE));
        gl.texImage2D(webgl.shadowCasterProgram.depthTex.target, 0, gl.RGBA, webgl.SHADOW_RESOLUTION, webgl.LIGHTS_MAX, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        webgl.shadowCasterProgram.depthTex.unbind();

        var renderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, webgl.SHADOW_RESOLUTION, webgl.LIGHTS_MAX);

        webgl.shadowCasterProgram.shadowFramebuffer.bind();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, webgl.shadowCasterProgram.depthTex.handle, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
        webgl.shadowCasterProgram.shadowFramebuffer.unbind();

        gl.useProgram(glProgram);
        gl.uniform1i(glProgram.uniform_depthTextures, webgl.shadowCasterProgram.depthTex.slot);
        gl.useProgram(null);
    }

    function _initShadowedPolygonProgram() {
        webgl.shadowedPolygonProgram = webgl.buildProgram(_shadowedPolygonVShader.split("LIGHTS_MAX").join(webgl.LIGHTS_MAX.toString()),
                                                           _shadowedPolygonFShader.split("LIGHTS_MAX").join(webgl.LIGHTS_MAX.toString()));
        webgl.shadowedPolygonProgram.depthTex = webgl.shadowCasterProgram.depthTex;
        var glProgram = webgl.shadowedPolygonProgram;

        gl.useProgram(glProgram);
        glProgram.positionAttrib = gl.getAttribLocation(glProgram, "position");
        glProgram.colorAttrib = gl.getAttribLocation(glProgram, "color");

        glProgram.frustumUniform = gl.getUniformLocation(glProgram, "iFrustum");
        glProgram.depthTexturesUniform = gl.getUniformLocation(glProgram, "depthTextures");
        glProgram.lightsCountUniform = gl.getUniformLocation(glProgram, "lightsCount");
        glProgram.minLightUniform = gl.getUniformLocation(glProgram, "minLight");

        gl.uniform1i(glProgram.depthTexturesUniform, glProgram.depthTex.slot);

        glProgram.worldToLightDepthUniform = [];
        glProgram.lightPosUniform = [];
        glProgram.lightRangeUniform = [];
        for (var i = 0; i < webgl.LIGHTS_MAX; i++) {
            glProgram.worldToLightDepthUniform.push(gl.getUniformLocation(glProgram,
                "worldToLightDepthTex[LAYER_INDEX]".replace('LAYER_INDEX', i.toString())));
            glProgram.lightPosUniform.push(gl.getUniformLocation(glProgram,
                "lightPos[LAYER_INDEX]".replace('LAYER_INDEX', i.toString())));
            glProgram.lightRangeUniform.push(gl.getUniformLocation(glProgram,
                "lightRange[LAYER_INDEX]".replace('LAYER_INDEX', i.toString())));
        }
        gl.useProgram(null);

        glProgram.indexBuf = new webgl.VertexBufferObject(gl.ELEMENT_ARRAY_BUFFER);
        glProgram.positionBuf = new webgl.VertexBufferObject();
        glProgram.colorBuf = new webgl.VertexBufferObject();
    }

    function _initPrograms() {
        _initColoredPolygonProgram();
        _initShadowCasterProgram();
        _initShadowedPolygonProgram();
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
                _initPrograms();
                return true;
            }
        }
        return false;
    };

    function _buildShader(shaderCode, shaderType) {
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderCode);
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
     * @param {string} vertexCode
     * @param {string} fragmentCode
     */
    webgl.buildProgram = function (vertexCode, fragmentCode) {
        var glProgram = gl.createProgram();

        var vertex = _buildShader(vertexCode, gl.VERTEX_SHADER);
        if (!vertex) {
            return null;
        }
        gl.attachShader(glProgram, vertex);

        if (fragmentCode != null) {
            var fragment = _buildShader(fragmentCode, gl.FRAGMENT_SHADER);
            if (!fragment) {
                return null;
            }
            gl.attachShader(glProgram, fragment);
        }

        gl.linkProgram(glProgram);

        var success = gl.getProgramParameter(glProgram, gl.LINK_STATUS);
        if (!success) {
            var errorLog = gl.getProgramInfoLog(glProgram);
            console.log("Error in program linking: " + errorLog);
            alert("Error in program linking: " + errorLog);
            return null;
        }

        gl.detachShader(glProgram, vertex);
        if (fragmentCode != null) {
            gl.detachShader(glProgram, fragment);
        }
        return glProgram;
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


    var _nextTextureSlot = 1;

    /**
     * @constructor
     */
    webgl.Texture = function (target) {
        this.target = target;
        this.slot = _nextTextureSlot;
        _nextTextureSlot += 1;
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

    webgl.Texture.prototype.setParams = function (params) {
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
    webgl.GREEN_BLUE_COLOR = new webgl.Color(0, 0.5, 0.5, 1.0);
    webgl.BLUE_COLOR = new webgl.Color(0, 0, 0.5, 1.0);
    webgl.BLACK_COLOR = new webgl.Color(0, 0, 0, 1.0);
    webgl.YELLOW_COLOR = new webgl.Color(0.5, 0.5, 0, 1.0);
    webgl.LIGHT_BLUE_COLOR = new webgl.Color(0.53, 0.81, 0.94, 1.0);
    webgl.LIGHT_BROWN_COLOR = new webgl.Color(0.50, 0.28, 0.10, 1.0);

    webgl.GLASS_COLOR = new webgl.Color(0.2, 0.2, 1.0, 0.5);


    /**
     * @param {geom.Vector} sceneCenter
     * @param {geom.Vector} canvasSize
     * @param {number} sceneWidth
     * @param {Float32Array} positions
     * @param {Uint16Array} indices
     * @param {Float32Array} colors
     * @param {boolean} clearFrame
     */
    webgl.drawTriangles = function (sceneCenter, canvasSize, sceneWidth, positions, indices, colors, clearFrame) {
        util.assert(indices.length % 3 == 0);
        util.assert((util.maxInArray(indices) + 1) * 4 == colors.length);
        util.assert(util.minInArray(indices) == 0);
        util.assert(positions.length * 4 == colors.length * 3);

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

        var translate = matrix.Matrix3.translation(-sceneCenter.x, -sceneCenter.y);
        var scale = matrix.Matrix3.scaling(2.0 / sceneWidth, -(canvasSize.x / canvasSize.y) * (2.0 / sceneWidth));
        gl.uniformMatrix3fv(glProgram.frustumUniform, false, scale.dot(translate).transpose().data);

        positionBuf.bind();
        gl.enableVertexAttribArray(glProgram.positionAttrib);
        gl.vertexAttribPointer(glProgram.positionAttrib, 2, gl.FLOAT, false, 3 * 4, 0);
        positionBuf.unbind();

        colorBuf.bind();
        gl.enableVertexAttribArray(glProgram.colorAttrib);
        gl.vertexAttribPointer(glProgram.colorAttrib, 4, gl.FLOAT, false, 4 * 4, 0);
        colorBuf.unbind();

        if (clearFrame) {
            gl.viewport(0, 0, webgl.width, webgl.height);

            gl.clearColor(0, 0, 0.1, 1);
            gl.clearDepth(1.0);

            gl.enable(gl.DEPTH_TEST);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        } else {
            gl.disable(gl.DEPTH_TEST); // TODO: make this configurable or so
        }

        indexBuf.bind();
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        indexBuf.unbind();
        gl.useProgram(null);
    };



    /**
     * @param {Float32Array} positions of obstacles
     * @param {Uint16Array} indices of obstacles
     * @param {Array.<matrix.Matrix3>} frustums
     */
    webgl.renderShadows = function (positions, indices, frustums) {
        util.assert(indices.length % 3 == 0);
        util.assert((util.maxInArray(indices) + 1) * 3 == positions.length);
        util.assert(util.minInArray(indices) == 0);

        var lightsCount = frustums.length;
        if (lightsCount == 0) {
            return;
        }

        var allPositions = new Float32Array(positions.length * 2 / 3 * lightsCount);
        var allIndices = new Uint16Array(2 * indices.length * lightsCount);
        var lightIndices = new Float32Array(indices.length * lightsCount);
        for (var i = 0; i < lightsCount; i++) {
            for (var j = 0; 3 * j < positions.length; j++) {
                allPositions[i * positions.length + 2 * j + 0] = positions[3 * j + 0];
                allPositions[i * positions.length + 2 * j + 1] = positions[3 * j + 1];
            }
            for (j = 0; 3 * j < indices.length; j++) {
                for (var k = 0; k < 3; k++) {
                    allIndices[i * indices.length * 2 + 2 * 3 * j + k * 2 + 0] = i * (positions.length / 3) + indices[3 * j + k];
                    allIndices[i * indices.length * 2 + 2 * 3 * j + k * 2 + 1] = i * (positions.length / 3) + indices[3 * j + ((k + 1) % 3)];
                }
            }
            for (j = 0; j < indices.length; j++) {
                lightIndices[i * indices.length + j] = i;
            }
        }
        util.assert(allIndices.length % 6 == 0);
        util.assert((util.maxInArray(allIndices) + 1) * 2 == allPositions.length);
        util.assert(util.minInArray(allIndices) == 0);

        var glProgram = webgl.shadowCasterProgram;

        var indexBuf = glProgram.indexBuf;
        var positionBuf = glProgram.positionBuf;
        var lightIndexBuf = glProgram.lightIndexBuf;

        indexBuf.bind();
        gl.bufferData(indexBuf.target, allIndices, gl.DYNAMIC_DRAW);
        indexBuf.unbind();

        positionBuf.bind();
        gl.bufferData(positionBuf.target, allPositions, gl.DYNAMIC_DRAW);
        positionBuf.unbind();

        lightIndexBuf.bind();
        gl.bufferData(lightIndexBuf.target, lightIndices, gl.DYNAMIC_DRAW);
        lightIndexBuf.unbind();

        gl.useProgram(glProgram);

        for (i = 0; i < lightsCount; i++) {
            gl.uniformMatrix3fv(glProgram.frustumUniforms[i], false, frustums[i].transpose().data);
        }

        positionBuf.bind();
        gl.enableVertexAttribArray(glProgram.positionAttrib);
        gl.vertexAttribPointer(glProgram.positionAttrib, 2, gl.FLOAT, false, 2 * 4, 0);
        positionBuf.unbind();

        lightIndexBuf.bind();
        gl.enableVertexAttribArray(glProgram.lightIndexAttrib);
        gl.vertexAttribPointer(glProgram.lightIndexAttrib, 1, gl.FLOAT, false, 1 * 4, 0);
        lightIndexBuf.unbind();


        glProgram.shadowFramebuffer.bind();
        gl.viewport(0, 0, webgl.SHADOW_RESOLUTION, webgl.LIGHTS_MAX);

        gl.clearColor(0, 0, 1.0, 1.0);
        gl.clearDepth(1.0);

        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        glProgram.indexBuf.bind();
        gl.drawElements(gl.LINES, allIndices.length, gl.UNSIGNED_SHORT, 0);
        glProgram.indexBuf.unbind();

        gl.disableVertexAttribArray(glProgram.positionAttrib);
        gl.disableVertexAttribArray(glProgram.lightIndexAttrib);

        gl.useProgram(null);
        glProgram.shadowFramebuffer.unbind();
    };


    /**
     * @param {geom.Vector} sceneCenter
     * @param {geom.Vector} canvasSize
     * @param {number} sceneWidth
     * @param {Float32Array} positions
     * @param {Uint16Array} indices
     * @param {Float32Array} colors
     * @param {Array.<matrix.Matrix3>} lightsFrustums
     * @param {Array.<geom.Vector>} lightPositions
     * @param {Array.<number>} lightRanges
     * @param {number} minLight
     */
    webgl.drawShadowedTriangles = function (sceneCenter, canvasSize, sceneWidth, positions, indices, colors,
                                            lightsFrustums, lightPositions, lightRanges, minLight) {
        util.assert(indices.length % 3 == 0);
        util.assert((util.maxInArray(indices) + 1) * 4 == colors.length);
        util.assert(util.minInArray(indices) == 0);
        util.assert(positions.length * 4 == colors.length * 3);

        var lightsCount = lightsFrustums.length;
        util.assert(lightsFrustums.length == lightsCount);
        util.assert(lightPositions.length == lightsCount);
        util.assert(lightRanges.length == lightsCount);

        var glProgram = webgl.shadowedPolygonProgram;

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

        var translate = matrix.Matrix3.translation(-sceneCenter.x, -sceneCenter.y);
        var scale = matrix.Matrix3.scaling(2.0 / sceneWidth, -(canvasSize.x / canvasSize.y) * (2.0 / sceneWidth));
        gl.uniformMatrix3fv(glProgram.frustumUniform, false, scale.dot(translate).transpose().data);

        gl.uniform1i(glProgram.lightsCountUniform, lightsCount);
        var rectToRect = matrix.Matrix3.rectToRect(
                new geom.Rectangle(new geom.Vector(-1, -1), new geom.Vector(1, 1)),
                new geom.Rectangle(new geom.Vector(0, -1), new geom.Vector(1, 1)));
        for (var i = 0; i < lightsCount; i++) {
            gl.uniformMatrix3fv(glProgram.worldToLightDepthUniform[i], false, rectToRect.dot(lightsFrustums[i]).transpose().data);
            gl.uniform2f(glProgram.lightPosUniform[i], lightPositions[i].x, lightPositions[i].y);
            gl.uniform1f(glProgram.lightRangeUniform[i], lightRanges[i]);
        }
        gl.uniform1f(glProgram.minLightUniform, minLight);

        positionBuf.bind();
        gl.enableVertexAttribArray(glProgram.positionAttrib);
        gl.vertexAttribPointer(glProgram.positionAttrib, 3, gl.FLOAT, false, 3 * 4, 0);
        positionBuf.unbind();

        colorBuf.bind();
        gl.enableVertexAttribArray(glProgram.colorAttrib);
        gl.vertexAttribPointer(glProgram.colorAttrib, 4, gl.FLOAT, false, 4 * 4, 0);
        colorBuf.unbind();

        gl.viewport(0, 0, webgl.width, webgl.height);

        gl.clearColor(0, 0, 0.5, 1);
        gl.clearDepth(1.0);

        gl.enable(gl.DEPTH_TEST);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        indexBuf.bind();
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        indexBuf.unbind();
        gl.disable(gl.BLEND);
        gl.useProgram(null);
    };

})();