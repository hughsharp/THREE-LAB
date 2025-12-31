import { NoBlending, PerspectiveCamera, ShaderMaterial, Uniform, Vector2 } from "three";
import { orthographicDepthToViewZ } from "../utils/orthographicDepthToViewZ.js";
import { viewZToOrthographicDepth } from "../utils/viewZToOrthographicDepth.js";

// import fragmentShader from "./glsl/convolution.box.frag";
// import vertexShader from "./glsl/convolution.box.vert";

const fragmentShader = `#ifdef FRAMEBUFFER_PRECISION_HIGH

	uniform mediump sampler2D inputBuffer;

#else

	uniform lowp sampler2D inputBuffer;

#endif

#ifdef BILATERAL

	#include <packing>

	uniform vec2 cameraNearFar;

	#ifdef NORMAL_DEPTH

		#ifdef GL_FRAGMENT_PRECISION_HIGH

			uniform highp sampler2D normalDepthBuffer;

		#else

			uniform mediump sampler2D normalDepthBuffer;

		#endif

		float readDepth(const in vec2 uv) {

			return texture2D(normalDepthBuffer, uv).a;

		}

	#else

		#if DEPTH_PACKING == 3201

			uniform lowp sampler2D depthBuffer;

		#elif defined(GL_FRAGMENT_PRECISION_HIGH)

			uniform highp sampler2D depthBuffer;

		#else

			uniform mediump sampler2D depthBuffer;

		#endif

		float readDepth(const in vec2 uv) {

			#if DEPTH_PACKING == 3201

				return unpackRGBAToDepth(texture2D(depthBuffer, uv));

			#else

				return texture2D(depthBuffer, uv).r;

			#endif

		}

	#endif

	float getViewZ(const in float depth) {

		#ifdef PERSPECTIVE_CAMERA

			return perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);

		#else

			return orthographicDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);

		#endif

	}

	#ifdef PERSPECTIVE_CAMERA

		#define linearDepth(v) viewZToOrthographicDepth(getViewZ(readDepth(v)), cameraNearFar.x, cameraNearFar.y)

	#else

		#define linearDepth(v) readDepth(v)

	#endif

#endif

#define getTexel(v) texture2D(inputBuffer, v)

#if KERNEL_SIZE == 3

	// Optimized 3x3
	varying vec2 vUv00, vUv01, vUv02;
	varying vec2 vUv03, vUv04, vUv05;
	varying vec2 vUv06, vUv07, vUv08;

#elif KERNEL_SIZE == 5 && MAX_VARYING_VECTORS >= 13

	// Optimized 5x5
	varying vec2 vUv00, vUv01, vUv02, vUv03, vUv04;
	varying vec2 vUv05, vUv06, vUv07, vUv08, vUv09;
	varying vec2 vUv10, vUv11, vUv12, vUv13, vUv14;
	varying vec2 vUv15, vUv16, vUv17, vUv18, vUv19;
	varying vec2 vUv20, vUv21, vUv22, vUv23, vUv24;

#else

	// General case
	uniform vec2 texelSize;
	uniform float scale;
	varying vec2 vUv;

#endif

void main() {

	#if KERNEL_SIZE == 3

		// Optimized 3x3
		vec4 c[] = vec4[KERNEL_SIZE_SQ](
			getTexel(vUv00), getTexel(vUv01), getTexel(vUv02),
			getTexel(vUv03), getTexel(vUv04), getTexel(vUv05),
			getTexel(vUv06), getTexel(vUv07), getTexel(vUv08)
		);

		#ifdef BILATERAL

			float z[] = float[KERNEL_SIZE_SQ](
				linearDepth(vUv00), linearDepth(vUv01), linearDepth(vUv02),
				linearDepth(vUv03), linearDepth(vUv04), linearDepth(vUv05),
				linearDepth(vUv06), linearDepth(vUv07), linearDepth(vUv08)
			);

		#endif

	#elif KERNEL_SIZE == 5 && MAX_VARYING_VECTORS >= 13

		// Optimized 5x5
		vec4 c[] = vec4[KERNEL_SIZE_SQ](
			getTexel(vUv00), getTexel(vUv01), getTexel(vUv02), getTexel(vUv03), getTexel(vUv04),
			getTexel(vUv05), getTexel(vUv06), getTexel(vUv07), getTexel(vUv08), getTexel(vUv09),
			getTexel(vUv10), getTexel(vUv11), getTexel(vUv12), getTexel(vUv13), getTexel(vUv14),
			getTexel(vUv15), getTexel(vUv16), getTexel(vUv17), getTexel(vUv18), getTexel(vUv19),
			getTexel(vUv20), getTexel(vUv21), getTexel(vUv22), getTexel(vUv23), getTexel(vUv24)
		);

		#ifdef BILATERAL

			float z[] = float[KERNEL_SIZE_SQ](
				linearDepth(vUv00), linearDepth(vUv01), linearDepth(vUv02), linearDepth(vUv03), linearDepth(vUv04),
				linearDepth(vUv05), linearDepth(vUv06), linearDepth(vUv07), linearDepth(vUv08), linearDepth(vUv09),
				linearDepth(vUv10), linearDepth(vUv11), linearDepth(vUv12), linearDepth(vUv13), linearDepth(vUv14),
				linearDepth(vUv15), linearDepth(vUv16), linearDepth(vUv17), linearDepth(vUv18), linearDepth(vUv19),
				linearDepth(vUv20), linearDepth(vUv21), linearDepth(vUv22), linearDepth(vUv23), linearDepth(vUv24)
			);

		#endif

	#endif

	vec4 result = vec4(0.0);

	#ifdef BILATERAL

		float w = 0.0;

		#if KERNEL_SIZE == 3 || (KERNEL_SIZE == 5 && MAX_VARYING_VECTORS >= 13)

			// Optimized 3x3 or 5x5
			float centerDepth = z[KERNEL_SIZE_SQ_HALF];

			for(int i = 0; i < KERNEL_SIZE_SQ; ++i) {

				float d = step(abs(z[i] - centerDepth), DISTANCE_THRESHOLD);
				result += c[i] * d;
				w += d;

			}

		#else

			// General case
			float centerDepth = linearDepth(vUv);
			vec2 s = texelSize * scale;

			for(int x = -KERNEL_SIZE_HALF; x <= KERNEL_SIZE_HALF; ++x) {

				for(int y = -KERNEL_SIZE_HALF; y <= KERNEL_SIZE_HALF; ++y) {

					vec2 coords = vUv + vec2(x, y) * s;
					vec4 c = getTexel(coords);
					float z = (x == 0 && y == 0) ? centerDepth : linearDepth(coords);

					float d = step(abs(z - centerDepth), DISTANCE_THRESHOLD);
					result += c * d;
					w += d;

				}

			}

		#endif

		gl_FragColor = result / max(w, 1.0);

	#else

		#if KERNEL_SIZE == 3 || (KERNEL_SIZE == 5 && MAX_VARYING_VECTORS >= 13)

			// Optimized 3x3 or 5x5
			for(int i = 0; i < KERNEL_SIZE_SQ; ++i) {

				result += c[i];

			}

		#else

			// General case
			vec2 s = texelSize * scale;

			for(int x = -KERNEL_SIZE_HALF; x <= KERNEL_SIZE_HALF; ++x) {

				for(int y = -KERNEL_SIZE_HALF; y <= KERNEL_SIZE_HALF; ++y) {

					result += getTexel(uv + vec2(x, y) * s);

				}

			}

		#endif

		gl_FragColor = result * INV_KERNEL_SIZE_SQ;

	#endif

}
`;
const vertexShader = `uniform vec2 texelSize;
uniform float scale;

#if KERNEL_SIZE == 3

	// Optimized 3x3
	varying vec2 vUv00, vUv01, vUv02;
	varying vec2 vUv03, vUv04, vUv05;
	varying vec2 vUv06, vUv07, vUv08;

#elif KERNEL_SIZE == 5 && MAX_VARYING_VECTORS >= 13

	// Optimized 5x5
	varying vec2 vUv00, vUv01, vUv02, vUv03, vUv04;
	varying vec2 vUv05, vUv06, vUv07, vUv08, vUv09;
	varying vec2 vUv10, vUv11, vUv12, vUv13, vUv14;
	varying vec2 vUv15, vUv16, vUv17, vUv18, vUv19;
	varying vec2 vUv20, vUv21, vUv22, vUv23, vUv24;

#else

	// General case
	varying vec2 vUv;

#endif

void main() {

	vec2 uv = position.xy * 0.5 + 0.5;

	#if KERNEL_SIZE == 3

		vec2 s = texelSize * scale;

		// Optimized 3x3
		vUv00 = uv + s * vec2(-1.0, -1.0);
		vUv01 = uv + s * vec2(0.0, -1.0);
		vUv02 = uv + s * vec2(1.0, -1.0);

		vUv03 = uv + s * vec2(-1.0, 0.0);
		vUv04 = uv;
		vUv05 = uv + s * vec2(1.0, 0.0);

		vUv06 = uv + s * vec2(-1.0, 1.0);
		vUv07 = uv + s * vec2(0.0, 1.0);
		vUv08 = uv + s * vec2(1.0, 1.0);

	#elif KERNEL_SIZE == 5

		vec2 s = texelSize * scale;

		// Optimized 5x5
		vUv00 = uv + s * vec2(-2.0, -2.0);
		vUv01 = uv + s * vec2(-1.0, -2.0);
		vUv02 = uv + s * vec2(0.0, -2.0);
		vUv03 = uv + s * vec2(1.0, -2.0);
		vUv04 = uv + s * vec2(2.0, -2.0);

		vUv05 = uv + s * vec2(-2.0, -1.0);
		vUv06 = uv + s * vec2(-1.0, -1.0);
		vUv07 = uv + s * vec2(0.0, -1.0);
		vUv08 = uv + s * vec2(1.0, -1.0);
		vUv09 = uv + s * vec2(2.0, -1.0);

		vUv10 = uv + s * vec2(-2.0, 0.0);
		vUv11 = uv + s * vec2(-1.0, 0.0);
		vUv12 = uv;
		vUv13 = uv + s * vec2(1.0, 0.0);
		vUv14 = uv + s * vec2(2.0, 0.0);

		vUv15 = uv + s * vec2(-2.0, 1.0);
		vUv16 = uv + s * vec2(-1.0, 1.0);
		vUv17 = uv + s * vec2(0.0, 1.0);
		vUv18 = uv + s * vec2(1.0, 1.0);
		vUv19 = uv + s * vec2(2.0, 1.0);

		vUv20 = uv + s * vec2(-2.0, 2.0);
		vUv21 = uv + s * vec2(-1.0, 2.0);
		vUv22 = uv + s * vec2(0.0, 2.0);
		vUv23 = uv + s * vec2(1.0, 2.0);
		vUv24 = uv + s * vec2(2.0, 2.0);

	#else

		// General case
		vUv = uv;

	#endif

	gl_Position = vec4(position.xy, 1.0, 1.0);

}
`;

/**
 * A fast box blur material that supports depth-based bilateral filtering.
 *
 * @implements {Resizable}
 */

export class BoxBlurMaterial extends ShaderMaterial {

	/**
	 * Constructs a new box blur material.
	 *
	 * @param {Object} [options] - The options.
	 * @param {Number} [options.bilateral=false] - Enables or disables bilateral blurring.
	 * @param {Number} [options.kernelSize=5] - The kernel size.
	 */

	constructor({ bilateral = false, kernelSize = 5 } = {}) {

		super({
			name: "BoxBlurMaterial",
			defines: {
				DEPTH_PACKING: "0",
				DISTANCE_THRESHOLD: "0.1"
			},
			uniforms: {
				inputBuffer: new Uniform(null),
				depthBuffer: new Uniform(null),
				normalDepthBuffer: new Uniform(null),
				texelSize: new Uniform(new Vector2()),
				cameraNearFar: new Uniform(new Vector2()),
				scale: new Uniform(1.0)
			},
			blending: NoBlending,
			toneMapped: false,
			depthWrite: false,
			depthTest: false,
			fragmentShader,
			vertexShader
		});

		this.bilateral = bilateral;
		this.kernelSize = kernelSize;
		this.maxVaryingVectors = 8;

	}

	/**
	 * The maximum amount of varying vectors.
	 *
	 * Should be synced with `renderer.capabilities.maxVaryings`. Default is 8.
	 *
	 * @type {Number}
	 */

	set maxVaryingVectors(value) {

		this.defines.MAX_VARYING_VECTORS = value.toFixed(0);

	}

	/**
	 * The kernel size.
	 *
	 * - Must be an odd number
	 * - Kernel size 3 and 5 use optimized code paths
	 * - Default is 5
	 *
	 * @type {Number}
	 */

	get kernelSize() {

		return Number(this.defines.KERNEL_SIZE);

	}

	set kernelSize(value) {

		if(value % 2 === 0) {

			throw new Error("The kernel size must be an odd number");

		}

		this.defines.KERNEL_SIZE = value.toFixed(0);
		this.defines.KERNEL_SIZE_HALF = Math.floor(value / 2).toFixed(0);
		this.defines.KERNEL_SIZE_SQ = (value ** 2).toFixed(0);
		this.defines.KERNEL_SIZE_SQ_HALF = Math.floor(value ** 2 / 2).toFixed(0);
		this.defines.INV_KERNEL_SIZE_SQ = (1 / value ** 2).toFixed(6);
		this.needsUpdate = true;

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
	 * The current near plane setting.
	 *
	 * @type {Number}
	 * @private
	 */

	get near() {

		return this.uniforms.cameraNearFar.value.x;

	}

	/**
	 * The current far plane setting.
	 *
	 * @type {Number}
	 * @private
	 */

	get far() {

		return this.uniforms.cameraNearFar.value.y;

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
	 * The depth buffer.
	 *
	 * @type {Texture}
	 */

	set depthBuffer(value) {

		this.uniforms.depthBuffer.value = value;

	}

	/**
	 * A combined normal-depth buffer. Overrides {@link depthBuffer} if set.
	 *
	 * @type {Texture}
	 */

	set normalDepthBuffer(value) {

		this.uniforms.normalDepthBuffer.value = value;

		if(value !== null) {

			this.defines.NORMAL_DEPTH = "1";

		} else {

			delete this.defines.NORMAL_DEPTH;

		}

		this.needsUpdate = true;

	}

	/**
	 * The depth packing strategy.
	 *
	 * @type {DepthPackingStrategies}
	 */

	set depthPacking(value) {

		this.defines.DEPTH_PACKING = value.toFixed(0);
		this.needsUpdate = true;

	}

	/**
	 * Indicates whether bilateral filtering is enabled.
	 *
	 * @type {Boolean}
	 */

	get bilateral() {

		return (this.defines.BILATERAL !== undefined);

	}

	set bilateral(value) {

		if(value !== null) {

			this.defines.BILATERAL = "1";

		} else {

			delete this.defines.BILATERAL;

		}

		this.needsUpdate = true;

	}

	/**
	 * The bilateral filter distance threshold in world units.
	 *
	 * @type {Number}
	 */

	get worldDistanceThreshold() {

		return -orthographicDepthToViewZ(Number(this.defines.DISTANCE_THRESHOLD), this.near, this.far);

	}

	set worldDistanceThreshold(value) {

		const threshold = viewZToOrthographicDepth(-value, this.near, this.far);
		this.defines.DISTANCE_THRESHOLD = threshold.toFixed(12);
		this.needsUpdate = true;

	}

	/**
	 * Copies the settings of the given camera.
	 *
	 * @param {Camera} camera - A camera.
	 */

	copyCameraSettings(camera) {

		if(camera) {

			this.uniforms.cameraNearFar.value.set(camera.near, camera.far);

			if(camera instanceof PerspectiveCamera) {

				this.defines.PERSPECTIVE_CAMERA = "1";

			} else {

				delete this.defines.PERSPECTIVE_CAMERA;

			}

			this.needsUpdate = true;

		}

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
