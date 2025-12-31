import { NoBlending, ShaderMaterial, Uniform, Vector2 } from "three";

// import fragmentShader from "./glsl/outline.frag";
// import vertexShader from "./glsl/outline.vert";
const fragmentShader = `
uniform lowp sampler2D inputBuffer;

varying vec2 vUv0;
varying vec2 vUv1;
varying vec2 vUv2;
varying vec2 vUv3;

void main() {

	vec2 c0 = texture2D(inputBuffer, vUv0).rg;
	vec2 c1 = texture2D(inputBuffer, vUv1).rg;
	vec2 c2 = texture2D(inputBuffer, vUv2).rg;
	vec2 c3 = texture2D(inputBuffer, vUv3).rg;

	float d0 = (c0.x - c1.x) * 0.5;
	float d1 = (c2.x - c3.x) * 0.5;
	float d = length(vec2(d0, d1));

	float a0 = min(c0.y, c1.y);
	float a1 = min(c2.y, c3.y);
	float visibilityFactor = min(a0, a1);

	gl_FragColor.rg = (1.0 - visibilityFactor > 0.001) ? vec2(d, 0.0) : vec2(0.0, d);

}

`;
const vertexShader = `
uniform vec2 texelSize;

varying vec2 vUv0;
varying vec2 vUv1;
varying vec2 vUv2;
varying vec2 vUv3;

void main() {

	vec2 uv = position.xy * 0.5 + 0.5;

	vUv0 = vec2(uv.x + texelSize.x, uv.y);
	vUv1 = vec2(uv.x - texelSize.x, uv.y);
	vUv2 = vec2(uv.x, uv.y + texelSize.y);
	vUv3 = vec2(uv.x, uv.y - texelSize.y);

	gl_Position = vec4(position.xy, 1.0, 1.0);

}

`;
/**
 * An outline shader material.
 *
 * @implements {Resizable}
 */

export class OutlineMaterial extends ShaderMaterial {

	/**
	 * Constructs a new outline material.
	 *
	 * TODO Remove texelSize param.
	 * @param {Vector2} [texelSize] - The screen texel size.
	 */

	constructor(texelSize = new Vector2()) {

		super({
			name: "OutlineMaterial",
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

		this.uniforms.texelSize.value.set(texelSize.x, texelSize.y);

		// TODO Added for backward-compatibility.
		this.uniforms.maskTexture = this.uniforms.inputBuffer;

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
	 * @param {Texture} value - The input buffer.
	 */

	setInputBuffer(value) {

		this.uniforms.inputBuffer.value = value;

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
