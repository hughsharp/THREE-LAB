import { BasicDepthPacking, NoBlending, PerspectiveCamera, ShaderMaterial, Uniform } from "three";
import { orthographicDepthToViewZ } from "../utils/orthographicDepthToViewZ.js";
import { viewZToOrthographicDepth } from "../utils/viewZToOrthographicDepth.js";

// import fragmentShader from "./glsl/circle-of-confusion.frag";
// import vertexShader from "./glsl/common.vert";

const fragmentShader = `#include <common>
#include <packing>

#ifdef GL_FRAGMENT_PRECISION_HIGH

	uniform highp sampler2D depthBuffer;

#else

	uniform mediump sampler2D depthBuffer;

#endif

uniform float focusDistance;
uniform float focusRange;
uniform float cameraNear;
uniform float cameraFar;

varying vec2 vUv;

float readDepth(const in vec2 uv) {

	#if DEPTH_PACKING == 3201

		float depth = unpackRGBAToDepth(texture2D(depthBuffer, uv));

	#else

		float depth = texture2D(depthBuffer, uv).r;

	#endif

	#ifdef LOG_DEPTH

		float d = pow(2.0, depth * log2(cameraFar + 1.0)) - 1.0;
		float a = cameraFar / (cameraFar - cameraNear);
		float b = cameraFar * cameraNear / (cameraNear - cameraFar);
		depth = a + b / d;

	#endif

	return depth;

}

void main() {

	float depth = readDepth(vUv);

	#ifdef PERSPECTIVE_CAMERA

		float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
		float linearDepth = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);

	#else

		float linearDepth = depth;

	#endif

	float signedDistance = linearDepth - focusDistance;
	float magnitude = smoothstep(0.0, focusRange, abs(signedDistance));

	gl_FragColor.rg = magnitude * vec2(
		step(signedDistance, 0.0),
		step(0.0, signedDistance)
	);

}
`;
const vertexShader = `varying vec2 vUv;

void main() {

	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 1.0, 1.0);

}
`;
/**
 * A Circle of Confusion shader material.
 */

export class CircleOfConfusionMaterial extends ShaderMaterial {

	/**
	 * Constructs a new CoC material.
	 *
	 * @param {Camera} camera - A camera.
	 */

	constructor(camera) {

		super({
			name: "CircleOfConfusionMaterial",
			defines: {
				DEPTH_PACKING: "0"
			},
			uniforms: {
				depthBuffer: new Uniform(null),
				focusDistance: new Uniform(0.0),
				focusRange: new Uniform(0.0),
				cameraNear: new Uniform(0.3),
				cameraFar: new Uniform(1000)
			},
			blending: NoBlending,
			toneMapped: false,
			depthWrite: false,
			depthTest: false,
			fragmentShader,
			vertexShader
		});

		// TODO Added for backward-compatibility.
		this.uniforms.focalLength = this.uniforms.focusRange;

		this.copyCameraSettings(camera);

	}

	/**
	 * The current near plane setting.
	 *
	 * @type {Number}
	 * @private
	 */

	get near() {

		return this.uniforms.cameraNear.value;

	}

	/**
	 * The current far plane setting.
	 *
	 * @type {Number}
	 * @private
	 */

	get far() {

		return this.uniforms.cameraFar.value;

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
	 * The focus distance. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get focusDistance() {

		return this.uniforms.focusDistance.value;

	}

	set focusDistance(value) {

		this.uniforms.focusDistance.value = value;

	}

	/**
	 * The focus distance in world units.
	 *
	 * @type {Number}
	 */

	get worldFocusDistance() {

		return -orthographicDepthToViewZ(this.focusDistance, this.near, this.far);

	}

	set worldFocusDistance(value) {

		this.focusDistance = viewZToOrthographicDepth(-value, this.near, this.far);

	}

	/**
	 * Returns the focus distance.
	 *
	 * @deprecated Use focusDistance instead.
	 * @return {Number} The focus distance.
	 */

	getFocusDistance(value) {

		this.uniforms.focusDistance.value = value;

	}

	/**
	 * Sets the focus distance.
	 *
	 * @deprecated Use focusDistance instead.
	 * @param {Number} value - The focus distance.
	 */

	setFocusDistance(value) {

		this.uniforms.focusDistance.value = value;

	}

	/**
	 * The focal length.
	 *
	 * @deprecated Renamed to focusRange.
	 * @type {Number}
	 */

	get focalLength() {

		return this.focusRange;

	}

	set focalLength(value) {

		this.focusRange = value;

	}

	/**
	 * The focus range. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get focusRange() {

		return this.uniforms.focusRange.value;

	}

	set focusRange(value) {

		this.uniforms.focusRange.value = value;

	}

	/**
	 * The focus range in world units.
	 *
	 * @type {Number}
	 */

	get worldFocusRange() {

		return -orthographicDepthToViewZ(this.focusRange, this.near, this.far);

	}

	set worldFocusRange(value) {

		this.focusRange = viewZToOrthographicDepth(-value, this.near, this.far);

	}

	/**
	 * Returns the focal length.
	 *
	 * @deprecated Use focusRange instead.
	 * @return {Number} The focal length.
	 */

	getFocalLength(value) {

		return this.focusRange;

	}

	/**
	 * Sets the focal length.
	 *
	 * @deprecated Use focusRange instead.
	 * @param {Number} value - The focal length.
	 */

	setFocalLength(value) {

		this.focusRange = value;

	}

	/**
	 * Copies the settings of the given camera.
	 *
	 * @deprecated Use copyCameraSettings instead.
	 * @param {Camera} camera - A camera.
	 */

	adoptCameraSettings(camera) {

		this.copyCameraSettings(camera);

	}

	/**
	 * Copies the settings of the given camera.
	 *
	 * @param {Camera} camera - A camera.
	 */

	copyCameraSettings(camera) {

		if(camera) {

			this.uniforms.cameraNear.value = camera.near;
			this.uniforms.cameraFar.value = camera.far;

			if(camera instanceof PerspectiveCamera) {

				this.defines.PERSPECTIVE_CAMERA = "1";

			} else {

				delete this.defines.PERSPECTIVE_CAMERA;

			}

			this.needsUpdate = true;

		}

	}

}
