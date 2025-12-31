import { NoBlending, PerspectiveCamera, RGBADepthPacking, ShaderMaterial, Uniform } from "three";

// import fragmentShader from "./glsl/depth-comparison.frag";
// import vertexShader from "./glsl/depth-comparison.vert";
const fragmentShader = `
#include <packing>
#include <clipping_planes_pars_fragment>

#ifdef GL_FRAGMENT_PRECISION_HIGH

	uniform highp sampler2D depthBuffer;

#else

	uniform mediump sampler2D depthBuffer;

#endif

uniform float cameraNear;
uniform float cameraFar;

centroid varying float vViewZ;
centroid varying vec4 vProjTexCoord;

void main() {

	#include <clipping_planes_fragment>

	// Transform into Cartesian coordinates (not mirrored).
	vec2 projTexCoord = (vProjTexCoord.xy / vProjTexCoord.w) * 0.5 + 0.5;
	projTexCoord = clamp(projTexCoord, 0.002, 0.998);

	#if DEPTH_PACKING == 3201

		float fragCoordZ = unpackRGBAToDepth(texture2D(depthBuffer, projTexCoord));

	#else

		float fragCoordZ = texture2D(depthBuffer, projTexCoord).r;

	#endif

	#ifdef PERSPECTIVE_CAMERA

		float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);

	#else

		float viewZ = orthographicDepthToViewZ(fragCoordZ, cameraNear, cameraFar);

	#endif

	float depthTest = (-vViewZ > -viewZ) ? 1.0 : 0.0;

	gl_FragColor.rg = vec2(0.0, depthTest);

}

`;
const vertexShader = `#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>

varying float vViewZ;
varying vec4 vProjTexCoord;

void main() {

	#include <skinbase_vertex>

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>

	vViewZ = mvPosition.z;
	vProjTexCoord = gl_Position;

	#include <clipping_planes_vertex>

}
`;
/**
 * A depth comparison shader material.
 */

export class DepthComparisonMaterial extends ShaderMaterial {

	/**
	 * Constructs a new depth comparison material.
	 *
	 * @param {Texture} [depthTexture=null] - A depth texture.
	 * @param {PerspectiveCamera} [camera] - A camera.
	 */

	constructor(depthTexture = null, camera) {

		super({
			name: "DepthComparisonMaterial",
			defines: {
				DEPTH_PACKING: "0"
			},
			uniforms: {
				depthBuffer: new Uniform(null),
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

		this.depthBuffer = depthTexture;
		this.depthPacking = RGBADepthPacking;
		this.copyCameraSettings(camera);

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
	 * @param {DepthPackingStrategies} [depthPacking=RGBADepthPacking] - The depth packing strategy.
	 */

	setDepthBuffer(buffer, depthPacking = RGBADepthPacking) {

		this.depthBuffer = buffer;
		this.depthPacking = depthPacking;

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
