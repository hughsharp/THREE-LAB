import { BasicDepthPacking, NoBlending, ShaderMaterial, Uniform, Vector2 } from "three";

// import fragmentShader from "./glsl/depth-downsampling.frag";
// import vertexShader from "./glsl/depth-downsampling.vert";
const fragmentShader = `#include <packing>

#ifdef GL_FRAGMENT_PRECISION_HIGH

	uniform highp sampler2D depthBuffer;

#else

	uniform mediump sampler2D depthBuffer;

#endif

#ifdef DOWNSAMPLE_NORMALS

	uniform lowp sampler2D normalBuffer;

#endif

varying vec2 vUv0;
varying vec2 vUv1;
varying vec2 vUv2;
varying vec2 vUv3;

float readDepth(const in vec2 uv) {

	#if DEPTH_PACKING == 3201

		return unpackRGBAToDepth(texture2D(depthBuffer, uv));

	#else

		return texture2D(depthBuffer, uv).r;

	#endif

}

/**
 * Returns the index of the most representative depth in the 2x2 neighborhood.
 */

int findBestDepth(const in float samples[4]) {

	// Calculate the centroid.
	float c = (samples[0] + samples[1] + samples[2] + samples[3]) * 0.25;

	float distances[4];
	distances[0] = abs(c - samples[0]);
	distances[1] = abs(c - samples[1]);
	distances[2] = abs(c - samples[2]);
	distances[3] = abs(c - samples[3]);

	float maxDistance = max(
		max(distances[0], distances[1]),
		max(distances[2], distances[3])
	);

	int remaining[3];
	int rejected[3];

	int i, j, k;

	for(i = 0, j = 0, k = 0; i < 4; ++i) {

		if(distances[i] < maxDistance) {

			// Keep the most representative samples.
			remaining[j++] = i;

		} else {

			// Discard max distance samples.
			rejected[k++] = i;

		}

	}

	// Fill up the array in case there were two or more max distance samples.
	for(; j < 3; ++j) {

		remaining[j] = rejected[--k];

	}

	// Final candidates.
	vec3 s = vec3(
		samples[remaining[0]],
		samples[remaining[1]],
		samples[remaining[2]]
	);

	// Recalculate the controid.
	c = (s.x + s.y + s.z) / 3.0;

	distances[0] = abs(c - s.x);
	distances[1] = abs(c - s.y);
	distances[2] = abs(c - s.z);

	float minDistance = min(distances[0], min(distances[1], distances[2]));

	// Determine the index of the min distance sample.
	for(i = 0; i < 3; ++i) {

		if(distances[i] == minDistance) {

			break;

		}

	}

	return remaining[i];

}

void main() {

	// Gather depth samples in a 2x2 neighborhood.
	float d[4];
	d[0] = readDepth(vUv0);
	d[1] = readDepth(vUv1);
	d[2] = readDepth(vUv2);
	d[3] = readDepth(vUv3);

	int index = findBestDepth(d);

	#ifdef DOWNSAMPLE_NORMALS

		// Gather all corresponding normals to avoid dependent texel fetches.
		vec3 n[4];
		n[0] = texture2D(normalBuffer, vUv0).rgb;
		n[1] = texture2D(normalBuffer, vUv1).rgb;
		n[2] = texture2D(normalBuffer, vUv2).rgb;
		n[3] = texture2D(normalBuffer, vUv3).rgb;

	#else

		vec3 n[4];
		n[0] = vec3(0.0);
		n[1] = vec3(0.0);
		n[2] = vec3(0.0);
		n[3] = vec3(0.0);

	#endif

	gl_FragColor = vec4(n[index], d[index]);

}
`;
const vertexShader = `uniform vec2 texelSize;

varying vec2 vUv0;
varying vec2 vUv1;
varying vec2 vUv2;
varying vec2 vUv3;

void main() {

	vec2 uv = position.xy * 0.5 + 0.5;

	vUv0 = uv;
	vUv1 = vec2(uv.x, uv.y + texelSize.y);
	vUv2 = vec2(uv.x + texelSize.x, uv.y);
	vUv3 = uv + texelSize;

	gl_Position = vec4(position.xy, 1.0, 1.0);

}
`;
/**
 * A depth downsampling shader material.
 *
 * Based on an article by Eleni Maria Stea:
 * https://eleni.mutantstargoat.com/hikiko/depth-aware-upsampling-6
 *
 * @implements {Resizable}
 */

export class DepthDownsamplingMaterial extends ShaderMaterial {

	/**
	 * Constructs a new depth downsampling material.
	 */

	constructor() {

		super({
			name: "DepthDownsamplingMaterial",
			defines: {
				DEPTH_PACKING: "0"
			},
			uniforms: {
				depthBuffer: new Uniform(null),
				normalBuffer: new Uniform(null),
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
	 * The depth buffer.
	 *
	 * @type {Texture}
	 */

	set depthBuffer(value) {

		this.uniforms.depthBuffer.value = value;

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
	 * Sets the depth buffer.
	 *
	 * @deprecated Use depthBuffer and depthPacking instead.
	 * @param {Texture} buffer - The depth texture.
	 * @param {DepthPackingStrategies} [depthPacking=BasicDepthPacking] - The depth packing strategy.
	 */

	setDepthBuffer(buffer, depthPacking = BasicDepthPacking) {

		this.depthBuffer = buffer;
		this.depthPacking = depthPacking;

	}

	/**
	 * The normal buffer.
	 *
	 * @type {Texture}
	 */

	set normalBuffer(value) {

		this.uniforms.normalBuffer.value = value;

		if(value !== null) {

			this.defines.DOWNSAMPLE_NORMALS = "1";

		} else {

			delete this.defines.DOWNSAMPLE_NORMALS;

		}

		this.needsUpdate = true;

	}

	/**
	 * Sets the normal buffer.
	 *
	 * @deprecated Use normalBuffer instead.
	 * @param {Texture} value - The normal buffer.
	 */

	setNormalBuffer(value) {

		this.normalBuffer = value;

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
