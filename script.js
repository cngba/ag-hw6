document.addEventListener("DOMContentLoaded", () => {
    const videos = document.querySelectorAll(".video");
    const canvases = document.querySelectorAll(".canvas");

    videos.forEach((video, index) => {
        setupWebGLEdgeDetection(video, canvases[index]);
    });
});

function setupWebGLEdgeDetection(video, canvas) {
    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("WebGL not supported!");
        return;
    }

    // Vertex Shader (Pass-through)
    const vertexShaderSource = `
        attribute vec2 position;
        varying vec2 texCoord;
        void main() {
            texCoord = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    // Fragment Shader (Sobel Edge Detection with Fixes)
    const fragmentShaderSource = `
	precision mediump float;
	uniform sampler2D u_texture;
	varying vec2 texCoord;
	uniform vec2 texSize;

	void main() {
		float kernelX[9];
		float kernelY[9];

		kernelX[0] = -1.0; kernelX[1] =  0.0; kernelX[2] =  1.0;
		kernelX[3] = -2.0; kernelX[4] =  0.0; kernelX[5] =  2.0;
		kernelX[6] = -1.0; kernelX[7] =  0.0; kernelX[8] =  1.0;

		kernelY[0] = -1.0; kernelY[1] = -2.0; kernelY[2] = -1.0;
		kernelY[3] =  0.0; kernelY[4] =  0.0; kernelY[5] =  0.0;
		kernelY[6] =  1.0; kernelY[7] =  2.0; kernelY[8] =  1.0;

		float stepX = 1.0 / texSize.x;
		float stepY = 1.0 / texSize.y;

		vec3 sobelX = vec3(0.0);
		vec3 sobelY = vec3(0.0);

		vec2 offsets[9];
		offsets[0] = vec2(-stepX, -stepY);
		offsets[1] = vec2( 0.0,   -stepY);
		offsets[2] = vec2( stepX, -stepY);
		offsets[3] = vec2(-stepX,  0.0);
		offsets[4] = vec2( 0.0,    0.0);
		offsets[5] = vec2( stepX,  0.0);
		offsets[6] = vec2(-stepX,  stepY);
		offsets[7] = vec2( 0.0,    stepY);
		offsets[8] = vec2( stepX,  stepY);

		// Manually unrolled loop
		for (int i = 0; i < 9; i++) {
			vec3 texColor = texture2D(u_texture, vec2(texCoord.x, 1.0 - texCoord.y) + offsets[i]).rgb;
			float gray = dot(texColor, vec3(0.3, 0.59, 0.11)); // Convert to grayscale
			sobelX += gray * kernelX[i];
			sobelY += gray * kernelY[i];
		}

		float edgeStrength = length(sobelX + sobelY);
		float edge = edgeStrength > 0.3 ? 1.0 : 0.0; // Edge threshold

		gl_FragColor = vec4(vec3(edge), 1.0);
	}
    `;

    function compileShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    function createShaderProgram(gl, vertexSource, fragmentSource) {
        const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            console.error("Shader compilation failed.");
            return null;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Shader program linking error:", gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!shaderProgram) return;

    gl.useProgram(shaderProgram);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionAttrib = gl.getAttribLocation(shaderProgram, "position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const texSizeLocation = gl.getUniformLocation(shaderProgram, "texSize");

    function updateFrame() {
        if (!video.videoWidth) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform2f(texSizeLocation, video.videoWidth, video.videoHeight);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(updateFrame);
    }

    video.addEventListener("play", () => {
        requestAnimationFrame(updateFrame);
    });
}
