import { NoBlending, ShaderMaterial, Uniform, Vector2 } from "three";

// import fragmentShader from "./glsl/convolution.downsampling.frag";
// import vertexShader from "./glsl/convolution.downsampling.vert";


const fragmentShader = `#ifdef FRAMEBUFFER_PRECISION_HIGH

	uniform mediump sampler2D inputBuffer;

#else

	uniform lowp sampler2D inputBuffer;

#endif

// (1 / 4) * 0.5 = 0.125
#define WEIGHT_INNER 0.125
// (1 / 9) * 0.5 = 0.0555555
#define WEIGHT_OUTER 0.0555555

varying vec2 vUv;
varying vec2 vUv00;
varying vec2 vUv01;
varying vec2 vUv02;
varying vec2 vUv03;
varying vec2 vUv04;
varying vec2 vUv05;
varying vec2 vUv06;
varying vec2 vUv07;
varying vec2 vUv08;
varying vec2 vUv09;
varying vec2 vUv10;
varying vec2 vUv11;

float clampToBorder(const in vec2 uv) {

	return float(uv.s >= 0.0 && uv.s <= 1.0 && uv.t >= 0.0 && uv.t <= 1.0);

}

void main() {

	vec4 c = vec4(0.0);

	vec4 w = WEIGHT_INNER * vec4(
		clampToBorder(vUv00),
		clampToBorder(vUv01),
		clampToBorder(vUv02),
		clampToBorder(vUv03)
	);

	c += w.x * texture2D(inputBuffer, vUv00);
	c += w.y * texture2D(inputBuffer, vUv01);
	c += w.z * texture2D(inputBuffer, vUv02);
	c += w.w * texture2D(inputBuffer, vUv03);

	w = WEIGHT_OUTER * vec4(
		clampToBorder(vUv04),
		clampToBorder(vUv05),
		clampToBorder(vUv06),
		clampToBorder(vUv07)
	);

	c += w.x * texture2D(inputBuffer, vUv04);
	c += w.y * texture2D(inputBuffer, vUv05);
	c += w.z * texture2D(inputBuffer, vUv06);
	c += w.w * texture2D(inputBuffer, vUv07);

	w = WEIGHT_OUTER * vec4(
		clampToBorder(vUv08),
		clampToBorder(vUv09),
		clampToBorder(vUv10),
		clampToBorder(vUv11)
	);

	c += w.x * texture2D(inputBuffer, vUv08);
	c += w.y * texture2D(inputBuffer, vUv09);
	c += w.z * texture2D(inputBuffer, vUv10);
	c += w.w * texture2D(inputBuffer, vUv11);

	c += WEIGHT_OUTER * texture2D(inputBuffer, vUv);
	gl_FragColor = c;

	#include <colorspace_fragment>

}
`;
const vertexShader = `uniform vec2 texelSize;

varying vec2 vUv;
varying vec2 vUv00;
varying vec2 vUv01;
varying vec2 vUv02;
varying vec2 vUv03;
varying vec2 vUv04;
varying vec2 vUv05;
varying vec2 vUv06;
varying vec2 vUv07;
varying vec2 vUv08;
varying vec2 vUv09;
varying vec2 vUv10;
varying vec2 vUv11;

void main() {

	vUv = position.xy * 0.5 + 0.5;

	vUv00 = vUv + texelSize * vec2(-1.0, 1.0);
	vUv01 = vUv + texelSize * vec2(1.0, 1.0);
	vUv02 = vUv + texelSize * vec2(-1.0, -1.0);
	vUv03 = vUv + texelSize * vec2(1.0, -1.0);

	vUv04 = vUv + texelSize * vec2(-2.0, 2.0);
	vUv05 = vUv + texelSize * vec2(0.0, 2.0);
	vUv06 = vUv + texelSize * vec2(2.0, 2.0);
	vUv07 = vUv + texelSize * vec2(-2.0, 0.0);
	vUv08 = vUv + texelSize * vec2(2.0, 0.0);
	vUv09 = vUv + texelSize * vec2(-2.0, -2.0);
	vUv10 = vUv + texelSize * vec2(0.0, -2.0);
	vUv11 = vUv + texelSize * vec2(2.0, -2.0);

	gl_Position = vec4(position.xy, 1.0, 1.0);

}
`;
/**
 * A downsampling material.
 *
 * Based on an article by Fabrice Piquet:
 * https://www.froyok.fr/blog/2021-12-ue4-custom-bloom/
 *
 * @implements {Resizable}
 */

export class DownsamplingMaterial extends ShaderMaterial {

	/**
	 * Constructs a new downsampling material.
	 */

	constructor() {

		super({
			name: "DownsamplingMaterial",
			uniforms: {
				inputBuffer: new Uniform(null),
				texelSize: new Uniform(new Vector2())
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
	 * Sets the size of this object.
	 *
	 * @param {Number} width - The width.
	 * @param {Number} height - The height.
	 */

	setSize(width, height) {

		this.uniforms.texelSize.value.set(1.0 / width, 1.0 / height);

	}

}
