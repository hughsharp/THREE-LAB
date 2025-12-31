import { NoBlending, ShaderMaterial, Uniform } from "three";

// import fragmentShader from "./glsl/adaptive-luminance.frag";
// import vertexShader from "./glsl/common.vert";

const fragmentShader = `
#include <packing>

#define packFloatToRGBA(v) packDepthToRGBA(v)
#define unpackRGBAToFloat(v) unpackRGBAToDepth(v)

uniform lowp sampler2D luminanceBuffer0;
uniform lowp sampler2D luminanceBuffer1;

uniform float minLuminance;
uniform float deltaTime;
uniform float tau;

varying vec2 vUv;

void main() {

	// This 1x1 buffer contains the previous luminance.
	float l0 = unpackRGBAToFloat(texture2D(luminanceBuffer0, vUv));

	// Get the current average scene luminance.
	#if __VERSION__ < 300

		float l1 = texture2DLodEXT(luminanceBuffer1, vUv, MIP_LEVEL_1X1).r;

	#else

		float l1 = textureLod(luminanceBuffer1, vUv, MIP_LEVEL_1X1).r;

	#endif

	l0 = max(minLuminance, l0);
	l1 = max(minLuminance, l1);

	// Adapt the luminance using Pattanaik's technique.
	float adaptedLum = l0 + (l1 - l0) * (1.0 - exp(-deltaTime * tau));

	gl_FragColor = (adaptedLum == 1.0) ? vec4(1.0) : packFloatToRGBA(adaptedLum);

}

`
const vertexShader = `varying vec2 vUv;

void main() {

	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 1.0, 1.0);

}
`
/**
 * An adaptive luminance shader material.
 */

export class AdaptiveLuminanceMaterial extends ShaderMaterial {

	/**
	 * Constructs a new adaptive luminance material.
	 */

	constructor() {

		super({
			name: "AdaptiveLuminanceMaterial",
			defines: {
				MIP_LEVEL_1X1: "0.0"
			},
			uniforms: {
				luminanceBuffer0: new Uniform(null),
				luminanceBuffer1: new Uniform(null),
				minLuminance: new Uniform(0.01),
				deltaTime: new Uniform(0.0),
				tau: new Uniform(1.0)
			},
			extensions: {
				shaderTextureLOD: true
			},
			blending: NoBlending,
			toneMapped: false,
			depthWrite: false,
			depthTest: false,
			fragmentShader,
			vertexShader
		});

	}

	/**
	 * The primary luminance buffer that contains the downsampled average luminance.
	 *
	 * @type {Texture}
	 */

	set luminanceBuffer0(value) {

		this.uniforms.luminanceBuffer0.value = value;

	}

	/**
	 * Sets the primary luminance buffer that contains the downsampled average luminance.
	 *
	 * @deprecated Use luminanceBuffer0 instead.
	 * @param {Texture} value - The buffer.
	 */

	setLuminanceBuffer0(value) {

		this.uniforms.luminanceBuffer0.value = value;

	}

	/**
	 * The secondary luminance buffer.
	 *
	 * @type {Texture}
	 */

	set luminanceBuffer1(value) {

		this.uniforms.luminanceBuffer1.value = value;

	}

	/**
	 * Sets the secondary luminance buffer.
	 *
	 * @deprecated Use luminanceBuffer1 instead.
	 * @param {Texture} value - The buffer.
	 */

	setLuminanceBuffer1(value) {

		this.uniforms.luminanceBuffer1.value = value;

	}

	/**
	 * The 1x1 mipmap level.
	 *
	 * This level is used to identify the smallest mipmap of the primary luminance buffer.
	 *
	 * @type {Number}
	 */

	set mipLevel1x1(value) {

		this.defines.MIP_LEVEL_1X1 = value.toFixed(1);
		this.needsUpdate = true;

	}

	/**
	 * Sets the 1x1 mipmap level.
	 *
	 * @deprecated Use mipLevel1x1 instead.
	 * @param {Number} value - The level.
	 */

	setMipLevel1x1(value) {

		this.mipLevel1x1 = value;

	}

	/**
	 * The delta time.
	 *
	 * @type {Number}
	 */

	set deltaTime(value) {

		this.uniforms.deltaTime.value = value;

	}

	/**
	 * Sets the delta time.
	 *
	 * @deprecated Use deltaTime instead.
	 * @param {Number} value - The delta time.
	 */

	setDeltaTime(value) {

		this.uniforms.deltaTime.value = value;

	}

	/**
	 * The lowest possible luminance value.
	 *
	 * @type {Number}
	 */

	get minLuminance() {

		return this.uniforms.minLuminance.value;

	}

	set minLuminance(value) {

		this.uniforms.minLuminance.value = value;

	}

	/**
	 * Returns the lowest possible luminance value.
	 *
	 * @deprecated Use minLuminance instead.
	 * @return {Number} The minimum luminance.
	 */

	getMinLuminance() {

		return this.uniforms.minLuminance.value;

	}

	/**
	 * Sets the minimum luminance.
	 *
	 * @deprecated Use minLuminance instead.
	 * @param {Number} value - The minimum luminance.
	 */

	setMinLuminance(value) {

		this.uniforms.minLuminance.value = value;

	}

	/**
	 * The luminance adaptation rate.
	 *
	 * @type {Number}
	 */

	get adaptationRate() {

		return this.uniforms.tau.value;

	}

	set adaptationRate(value) {

		this.uniforms.tau.value = value;

	}

	/**
	 * Returns the luminance adaptation rate.
	 *
	 * @deprecated Use adaptationRate instead.
	 * @return {Number} The adaptation rate.
	 */

	getAdaptationRate() {

		return this.uniforms.tau.value;

	}

	/**
	 * Sets the luminance adaptation rate.
	 *
	 * @deprecated Use adaptationRate instead.
	 * @param {Number} value - The adaptation rate.
	 */

	setAdaptationRate(value) {

		this.uniforms.tau.value = value;

	}

}
