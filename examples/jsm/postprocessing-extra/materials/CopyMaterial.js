import { NoBlending, ShaderMaterial, Uniform } from "three";

// import fragmentShader from "./glsl/copy.frag";

const fragmentShader = `
#include <common>
#include <dithering_pars_fragment>

#ifdef FRAMEBUFFER_PRECISION_HIGH

	uniform mediump sampler2D inputBuffer;

#else

	uniform lowp sampler2D inputBuffer;

#endif

uniform float opacity;

varying vec2 vUv;

void main() {

	vec4 texel = texture2D(inputBuffer, vUv);
	gl_FragColor = opacity * texel;

	#include <colorspace_fragment>
	#include <dithering_fragment>

}

`;
const vertexShader = `
varying vec2 vUv;

void main() {

	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 1.0, 1.0);

}

`;
/**
 * A simple copy shader material.
 */

export class CopyMaterial extends ShaderMaterial {

	/**
	 * Constructs a new copy material.
	 */

	constructor() {

		super({
			name: "CopyMaterial",
			uniforms: {
				inputBuffer: new Uniform(null),
				opacity: new Uniform(1.0)
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
	 * @param {Number} value - The buffer.
	 */

	setInputBuffer(value) {

		this.uniforms.inputBuffer.value = value;

	}

	/**
	 * Returns the opacity.
	 *
	 * @deprecated Use opacity instead.
	 * @return {Number} The opacity.
	 */

	getOpacity(value) {

		return this.uniforms.opacity.value;

	}

	/**
	 * Sets the opacity.
	 *
	 * @deprecated Use opacity instead.
	 * @param {Number} value - The opacity.
	 */

	setOpacity(value) {

		this.uniforms.opacity.value = value;

	}

}
