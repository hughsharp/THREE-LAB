import { NoBlending, ShaderMaterial, Uniform, Vector2 } from "three";

// import fragmentShader from "./glsl/convolution.bokeh.frag";
// import vertexShader from "./glsl/common.vert";

const fragmentShader = `
#ifdef FRAMEBUFFER_PRECISION_HIGH

	uniform mediump sampler2D inputBuffer;

#else

	uniform lowp sampler2D inputBuffer;

#endif

#if PASS == 1

	uniform vec4 kernel64[32];

#else

	uniform vec4 kernel16[8];

#endif

uniform lowp sampler2D cocBuffer;
uniform vec2 texelSize;
uniform float scale;

varying vec2 vUv;

void main() {

	#ifdef FOREGROUND

		vec2 cocNearFar = texture2D(cocBuffer, vUv).rg * scale;
		float coc = cocNearFar.x;

	#else

		float coc = texture2D(cocBuffer, vUv).g * scale;

	#endif

	if(coc == 0.0) {

		// Skip blurring.
		gl_FragColor = texture2D(inputBuffer, vUv);

	} else {

		#ifdef FOREGROUND

			// Use far CoC to avoid weak blurring around foreground objects.
			vec2 step = texelSize * max(cocNearFar.x, cocNearFar.y);

		#else

			vec2 step = texelSize * coc;

		#endif

		#if PASS == 1

			vec4 acc = vec4(0.0);

			// Each vector contains two sampling points (64 in total).
			for(int i = 0; i < 32; ++i) {

				vec4 kernel = kernel64[i];

				vec2 uv = step * kernel.xy + vUv;
				acc += texture2D(inputBuffer, uv);

				uv = step * kernel.zw + vUv;
				acc += texture2D(inputBuffer, uv);

			}

			gl_FragColor = acc / 64.0;

		#else

			vec4 maxValue = texture2D(inputBuffer, vUv);

			// Each vector contains two sampling points (16 in total).
			for(int i = 0; i < 8; ++i) {

				vec4 kernel = kernel16[i];

				vec2 uv = step * kernel.xy + vUv;
				maxValue = max(texture2D(inputBuffer, uv), maxValue);

				uv = step * kernel.zw + vUv;
				maxValue = max(texture2D(inputBuffer, uv), maxValue);


			}

			gl_FragColor = maxValue;

		#endif

	}

}

`

const vertexShader = `varying vec2 vUv;

void main() {

	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 1.0, 1.0);

}
`


/**
 * A bokeh disc blur material.
 *
 * This material should be applied twice in a row, with `fill` mode enabled for the second pass. Enabling the
 * `foreground` option causes the shader to combine the near and far CoC values around foreground objects.
 *
 * @implements {Resizable}
 */

export class BokehMaterial extends ShaderMaterial {

	/**
	 * Constructs a new bokeh material.
	 *
	 * @param {Boolean} [fill=false] - Enables or disables the bokeh highlight fill mode.
	 * @param {Boolean} [foreground=false] - Determines whether this material will be applied to foreground colors.
	 */

	constructor(fill = false, foreground = false) {

		super({
			name: "BokehMaterial",
			defines: {
				PASS: fill ? "2" : "1"
			},
			uniforms: {
				inputBuffer: new Uniform(null),
				cocBuffer: new Uniform(null),
				texelSize: new Uniform(new Vector2()),
				kernel64: new Uniform(null),
				kernel16: new Uniform(null),
				scale: new Uniform(1.0)
			},
			blending: NoBlending,
			toneMapped: false,
			depthWrite: false,
			depthTest: false,
			fragmentShader,
			vertexShader
		});

		if(foreground) {

			this.defines.FOREGROUND = "1";

		}

		this.generateKernel();

	}

	/**
	 * The input buffer.
	 *
	 * @type {Texture}
	 */

	set inputBuffer(value) {

		this.uniforms.inputBuffer.value = value;

	}

	/**
	 * Sets the input buffer.
	 *
	 * @deprecated Use inputBuffer instead.
	 * @param {Texture} value - The buffer.
	 */

	setInputBuffer(value) {

		this.uniforms.inputBuffer.value = value;

	}

	/**
	 * The circle of confusion buffer.
	 *
	 * @type {Texture}
	 */

	set cocBuffer(value) {

		this.uniforms.cocBuffer.value = value;

	}

	/**
	 * Sets the circle of confusion buffer.
	 *
	 * @deprecated Use cocBuffer instead.
	 * @param {Texture} value - The buffer.
	 */

	setCoCBuffer(value) {

		this.uniforms.cocBuffer.value = value;

	}

	/**
	 * The blur scale.
	 *
	 * @type {Number}
	 */

	get scale() {

		return this.uniforms.scale.value;

	}

	set scale(value) {

		this.uniforms.scale.value = value;

	}

	/**
	 * Returns the blur scale.
	 *
	 * @deprecated Use scale instead.
	 * @return {Number} The scale.
	 */

	getScale(value) {

		return this.scale;

	}

	/**
	 * Sets the blur scale.
	 *
	 * @deprecated Use scale instead.
	 * @param {Number} value - The scale.
	 */

	setScale(value) {

		this.scale = value;

	}

	/**
	 * Generates the blur kernel.
	 *
	 * @private
	 */

	generateKernel() {

		const GOLDEN_ANGLE = 2.39996323;
		const points64 = new Float64Array(128);
		const points16 = new Float64Array(32);

		let i64 = 0, i16 = 0;

		for(let i = 0, sqrt80 = Math.sqrt(80); i < 80; ++i) {

			const theta = i * GOLDEN_ANGLE;
			const r = Math.sqrt(i) / sqrt80;
			const u = r * Math.cos(theta), v = r * Math.sin(theta);

			if(i % 5 === 0) {

				points16[i16++] = u;
				points16[i16++] = v;

			} else {

				points64[i64++] = u;
				points64[i64++] = v;

			}

		}

		// The points are packed into vec4 instances to minimize the uniform count.
		this.uniforms.kernel64.value = points64;
		this.uniforms.kernel16.value = points16;

	}

	/**
	 * Sets the texel size.
	 *
	 * @deprecated Use setSize() instead.
	 * @param {Number} x - The texel width.
	 * @param {Number} y - The texel height.
	 */

	setTexelSize(x, y) {

		this.uniforms.texelSize.value.set(x, y);

	}

	/**
	 * Sets the size of this object.
	 *
	 * @param {Number} width - The width.
	 * @param {Number} height - The height.
	 */

	setSize(width, height) {

		this.uniforms.texelSize.value.set(1.0 / width, 1.0 / height);

	}

}
