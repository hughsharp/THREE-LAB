import { BasicDepthPacking, Matrix4, NoBlending, PerspectiveCamera, ShaderMaterial, Uniform, Vector2 } from "three";
import { orthographicDepthToViewZ } from "../utils/orthographicDepthToViewZ.js";
import { viewZToOrthographicDepth } from "../utils/viewZToOrthographicDepth.js";

// import fragmentShader from "./glsl/ssao.frag";
// import vertexShader from "./glsl/ssao.vert";
const fragmentShader = `
#include <common>
#include <packing>

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

	uniform lowp sampler2D normalBuffer;

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

uniform lowp sampler2D noiseTexture;

uniform mat4 inverseProjectionMatrix;
uniform mat4 projectionMatrix;
uniform vec2 texelSize;
uniform vec2 cameraNearFar;

uniform float intensity;
uniform float minRadiusScale;
uniform float fade;
uniform float bias;

uniform vec2 distanceCutoff;
uniform vec2 proximityCutoff;

varying vec2 vUv;
varying vec2 vUv2;

float getViewZ(const in float depth) {

	#ifdef PERSPECTIVE_CAMERA

		return perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);

	#else

		return orthographicDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);

	#endif

}

vec3 getViewPosition(const in vec2 screenPosition, const in float depth, const in float viewZ) {

	vec4 clipPosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);

	// Unoptimized version:
	// vec4 viewPosition = inverseProjectionMatrix * clipPosition;
	// viewPosition /= viewPosition.w; // Unproject.
	// return viewPosition.xyz;

	float clipW = projectionMatrix[2][3] * viewZ + projectionMatrix[3][3];
	clipPosition *= clipW; // Unproject.

	return (inverseProjectionMatrix * clipPosition).xyz;

}

float getAmbientOcclusion(const in vec3 p, const in vec3 n, const in float depth, const in vec2 uv) {

	// Distance scaling
	float radiusScale = 1.0 - smoothstep(0.0, distanceCutoff.y, depth);
	radiusScale = radiusScale * (1.0 - minRadiusScale) + minRadiusScale;
	float radius = RADIUS * radiusScale;

	// Use a random starting angle.
	float noise = texture2D(noiseTexture, vUv2).r;
	float baseAngle = noise * PI2;
	float rings = SPIRAL_TURNS * PI2;

	float occlusion = 0.0;
	int taps = 0;

	for(int i = 0; i < SAMPLES_INT; ++i) {

		float alpha = (float(i) + 0.5) * INV_SAMPLES_FLOAT;
		float angle = alpha * rings + baseAngle;
		vec2 rotation = vec2(cos(angle), sin(angle));
		vec2 coords = alpha * radius * rotation * texelSize + uv;

		if(coords.s < 0.0 || coords.s > 1.0 || coords.t < 0.0 || coords.t > 1.0) {

			// Skip samples outside the screen.
			continue;

		}

		float sampleDepth = readDepth(coords);
		float viewZ = getViewZ(sampleDepth);

		#ifdef PERSPECTIVE_CAMERA

			float linearSampleDepth = viewZToOrthographicDepth(viewZ, cameraNearFar.x, cameraNearFar.y);

		#else

			float linearSampleDepth = sampleDepth;

		#endif

		float proximity = abs(depth - linearSampleDepth);

		if(proximity < proximityCutoff.y) {

			float falloff = 1.0 - smoothstep(proximityCutoff.x, proximityCutoff.y, proximity);

			vec3 Q = getViewPosition(coords, sampleDepth, viewZ);
			vec3 v = Q - p;

			float vv = dot(v, v);
			float vn = dot(v, n) - bias;

			float f = max(RADIUS_SQ - vv, 0.0) / RADIUS_SQ;
			occlusion += (f * f * f * max(vn / (fade + vv), 0.0)) * falloff;

		}

		++taps;

	}

	return occlusion / (4.0 * max(float(taps), 1.0));

}

void main() {

	#ifdef NORMAL_DEPTH

		vec4 normalDepth = texture2D(normalDepthBuffer, vUv);

	#else

		vec4 normalDepth = vec4(texture2D(normalBuffer, vUv).xyz, readDepth(vUv));

	#endif

	float ao = 0.0;
	float depth = normalDepth.a;
	float viewZ = getViewZ(depth);

	#ifdef PERSPECTIVE_CAMERA

		float linearDepth = viewZToOrthographicDepth(viewZ, cameraNearFar.x, cameraNearFar.y);

	#else

		float linearDepth = depth;

	#endif

	// Skip fragments that are too far away.
	if(linearDepth < distanceCutoff.y) {

		vec3 viewPosition = getViewPosition(vUv, depth, viewZ);
		vec3 viewNormal = unpackRGBToNormal(normalDepth.rgb);
		ao += getAmbientOcclusion(viewPosition, viewNormal, linearDepth, vUv);

		// Fade AO based on depth.
		float d = smoothstep(distanceCutoff.x, distanceCutoff.y, linearDepth);
		ao = mix(ao, 0.0, d);

		#ifdef LEGACY_INTENSITY

			ao = clamp(1.0 - pow(1.0 - ao, abs(intensity)), 0.0, 1.0);

		#endif

	}

	gl_FragColor.r = ao;

}

`;
const vertexShader = `
uniform vec2 noiseScale;

varying vec2 vUv;
varying vec2 vUv2;

void main() {

	vUv = position.xy * 0.5 + 0.5;
	vUv2 = vUv * noiseScale;

	gl_Position = vec4(position.xy, 1.0, 1.0);

}

`;
/**
 * A Screen Space Ambient Occlusion (SSAO) shader material.
 *
 * @implements {Resizable}
 */

export class SSAOMaterial extends ShaderMaterial {

	/**
	 * Constructs a new SSAO material.
	 *
	 * @param {Camera} camera - A camera.
	 */

	constructor(camera) {

		super({
			name: "SSAOMaterial",
			defines: {
				SAMPLES_INT: "0",
				INV_SAMPLES_FLOAT: "0.0",
				SPIRAL_TURNS: "0.0",
				RADIUS: "1.0",
				RADIUS_SQ: "1.0",
				DISTANCE_SCALING: "1",
				DEPTH_PACKING: "0"
			},
			uniforms: {
				depthBuffer: new Uniform(null),
				normalBuffer: new Uniform(null),
				normalDepthBuffer: new Uniform(null),
				noiseTexture: new Uniform(null),
				inverseProjectionMatrix: new Uniform(new Matrix4()),
				projectionMatrix: new Uniform(new Matrix4()),
				texelSize: new Uniform(new Vector2()),
				cameraNearFar: new Uniform(new Vector2()),
				distanceCutoff: new Uniform(new Vector2()),
				proximityCutoff: new Uniform(new Vector2()),
				noiseScale: new Uniform(new Vector2()),
				minRadiusScale: new Uniform(0.33),
				intensity: new Uniform(1.0),
				fade: new Uniform(0.01),
				bias: new Uniform(0.0)
			},
			blending: NoBlending,
			toneMapped: false,
			depthWrite: false,
			depthTest: false,
			fragmentShader,
			vertexShader
		});

		this.copyCameraSettings(camera);

		/**
		 * The resolution.
		 *
		 * @type {Vector2}
		 * @private
		 */

		this.resolution = new Vector2();

		/**
		 * The relative sampling radius.
		 *
		 * @type {Number}
		 * @private
		 */

		this.r = 1.0;

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
	 * A combined normal-depth buffer.
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
	 * Sets the combined normal-depth buffer.
	 *
	 * @deprecated Use normalDepthBuffer instead.
	 * @param {Number} value - The buffer.
	 */

	setNormalDepthBuffer(value) {

		this.normalDepthBuffer = value;

	}

	/**
	 * The normal buffer.
	 *
	 * @type {Texture}
	 */

	set normalBuffer(value) {

		this.uniforms.normalBuffer.value = value;

	}

	/**
	 * Sets the normal buffer.
	 *
	 * @deprecated Use normalBuffer instead.
	 * @param {Number} value - The buffer.
	 */

	setNormalBuffer(value) {

		this.uniforms.normalBuffer.value = value;

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
	 * The noise texture.
	 *
	 * @type {Texture}
	 */

	set noiseTexture(value) {

		this.uniforms.noiseTexture.value = value;

	}

	/**
	 * Sets the noise texture.
	 *
	 * @deprecated Use noiseTexture instead.
	 * @param {Number} value - The texture.
	 */

	setNoiseTexture(value) {

		this.uniforms.noiseTexture.value = value;

	}

	/**
	 * The sample count.
	 *
	 * @type {Number}
	 */

	get samples() {

		return Number(this.defines.SAMPLES_INT);

	}

	set samples(value) {

		this.defines.SAMPLES_INT = value.toFixed(0);
		this.defines.INV_SAMPLES_FLOAT = (1.0 / value).toFixed(9);
		this.needsUpdate = true;

	}

	/**
	 * Returns the amount of occlusion samples per pixel.
	 *
	 * @deprecated Use samples instead.
	 * @return {Number} The sample count.
	 */

	getSamples() {

		return this.samples;

	}

	/**
	 * Sets the amount of occlusion samples per pixel.
	 *
	 * @deprecated Use samples instead.
	 * @param {Number} value - The sample count.
	 */

	setSamples(value) {

		this.samples = value;

	}

	/**
	 * The sampling spiral ring count.
	 *
	 * @type {Number}
	 */

	get rings() {

		return Number(this.defines.SPIRAL_TURNS);

	}

	set rings(value) {

		this.defines.SPIRAL_TURNS = value.toFixed(1);
		this.needsUpdate = true;

	}

	/**
	 * Returns the amount of spiral turns in the occlusion sampling pattern.
	 *
	 * @deprecated Use rings instead.
	 * @return {Number} The radius.
	 */

	getRings() {

		return this.rings;

	}

	/**
	 * Sets the amount of spiral turns in the occlusion sampling pattern.
	 *
	 * @deprecated Use rings instead.
	 * @param {Number} value - The radius.
	 */

	setRings(value) {

		this.rings = value;

	}

	/**
	 * The intensity.
	 *
	 * @type {Number}
	 * @deprecated Use SSAOEffect.intensity instead.
	 */

	get intensity() {

		return this.uniforms.intensity.value;

	}

	set intensity(value) {

		this.uniforms.intensity.value = value;

		if(this.defines.LEGACY_INTENSITY === undefined) {

			this.defines.LEGACY_INTENSITY = "1";
			this.needsUpdate = true;

		}

	}

	/**
	 * Returns the intensity.
	 *
	 * @deprecated Use SSAOEffect.intensity instead.
	 * @return {Number} The intensity.
	 */

	getIntensity() {

		return this.uniforms.intensity.value;

	}

	/**
	 * Sets the intensity.
	 *
	 * @deprecated Use SSAOEffect.intensity instead.
	 * @param {Number} value - The intensity.
	 */

	setIntensity(value) {

		this.uniforms.intensity.value = value;

	}

	/**
	 * The depth fade factor.
	 *
	 * @type {Number}
	 */

	get fade() {

		return this.uniforms.fade.value;

	}

	set fade(value) {

		this.uniforms.fade.value = value;

	}

	/**
	 * Returns the depth fade factor.
	 *
	 * @deprecated Use fade instead.
	 * @return {Number} The fade factor.
	 */

	getFade() {

		return this.uniforms.fade.value;

	}

	/**
	 * Sets the depth fade factor.
	 *
	 * @deprecated Use fade instead.
	 * @param {Number} value - The fade factor.
	 */

	setFade(value) {

		this.uniforms.fade.value = value;

	}

	/**
	 * The depth bias. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get bias() {

		return this.uniforms.bias.value;

	}

	set bias(value) {

		this.uniforms.bias.value = value;

	}

	/**
	 * Returns the depth bias.
	 *
	 * @deprecated Use bias instead.
	 * @return {Number} The bias.
	 */

	getBias() {

		return this.uniforms.bias.value;

	}

	/**
	 * Sets the depth bias.
	 *
	 * @deprecated Use bias instead.
	 * @param {Number} value - The bias.
	 */

	setBias(value) {

		this.uniforms.bias.value = value;

	}

	/**
	 * The minimum radius scale for distance scaling. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get minRadiusScale() {

		return this.uniforms.minRadiusScale.value;

	}

	set minRadiusScale(value) {

		this.uniforms.minRadiusScale.value = value;

	}

	/**
	 * Returns the minimum radius scale for distance scaling.
	 *
	 * @deprecated Use minRadiusScale instead.
	 * @return {Number} The minimum radius scale.
	 */

	getMinRadiusScale() {

		return this.uniforms.minRadiusScale.value;

	}

	/**
	 * Sets the minimum radius scale for distance scaling.
	 *
	 * @deprecated Use minRadiusScale instead.
	 * @param {Number} value - The minimum radius scale.
	 */

	setMinRadiusScale(value) {

		this.uniforms.minRadiusScale.value = value;

	}

	/**
	 * Updates the absolute radius.
	 *
	 * @private
	 */

	updateRadius() {

		const radius = this.r * this.resolution.height;
		this.defines.RADIUS = radius.toFixed(11);
		this.defines.RADIUS_SQ = (radius * radius).toFixed(11);
		this.needsUpdate = true;

	}

	/**
	 * The occlusion sampling radius. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get radius() {

		return this.r;

	}

	set radius(value) {

		this.r = Math.min(Math.max(value, 1e-6), 1.0);
		this.updateRadius();

	}

	/**
	 * Returns the occlusion sampling radius.
	 *
	 * @deprecated Use radius instead.
	 * @return {Number} The radius.
	 */

	getRadius() {

		return this.radius;

	}

	/**
	 * Sets the occlusion sampling radius.
	 *
	 * @deprecated Use radius instead.
	 * @param {Number} value - The radius. Range [1e-6, 1.0].
	 */

	setRadius(value) {

		this.radius = value;

	}

	/**
	 * Indicates whether distance-based radius scaling is enabled.
	 *
	 * @type {Boolean}
	 * @deprecated
	 */

	get distanceScaling() { return true; }
	set distanceScaling(value) {}

	/**
	 * Indicates whether distance-based radius scaling is enabled.
	 *
	 * @deprecated
	 * @return {Boolean} Whether distance scaling is enabled.
	 */

	isDistanceScalingEnabled() {

		return this.distanceScaling;

	}

	/**
	 * Enables or disables distance-based radius scaling.
	 *
	 * @deprecated
	 * @param {Boolean} value - Whether distance scaling should be enabled.
	 */

	setDistanceScalingEnabled(value) {

		this.distanceScaling = value;

	}

	/**
	 * The occlusion distance threshold. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get distanceThreshold() {

		return this.uniforms.distanceCutoff.value.x;

	}

	set distanceThreshold(value) {

		this.uniforms.distanceCutoff.value.set(
			Math.min(Math.max(value, 0.0), 1.0),
			Math.min(Math.max(value + this.distanceFalloff, 0.0), 1.0)
		);

	}

	/**
	 * The occlusion distance threshold in world units.
	 *
	 * @type {Number}
	 */

	get worldDistanceThreshold() {

		return -orthographicDepthToViewZ(this.distanceThreshold, this.near, this.far);

	}

	set worldDistanceThreshold(value) {

		this.distanceThreshold = viewZToOrthographicDepth(-value, this.near, this.far);

	}

	/**
	 * The occlusion distance falloff. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get distanceFalloff() {

		return this.uniforms.distanceCutoff.value.y - this.distanceThreshold;

	}

	set distanceFalloff(value) {

		this.uniforms.distanceCutoff.value.y = Math.min(Math.max(this.distanceThreshold + value, 0.0), 1.0);

	}

	/**
	 * The occlusion distance falloff in world units.
	 *
	 * @type {Number}
	 */

	get worldDistanceFalloff() {

		return -orthographicDepthToViewZ(this.distanceFalloff, this.near, this.far);

	}

	set worldDistanceFalloff(value) {

		this.distanceFalloff = viewZToOrthographicDepth(-value, this.near, this.far);

	}

	/**
	 * Sets the occlusion distance cutoff.
	 *
	 * @deprecated Use distanceThreshold and distanceFalloff instead.
	 * @param {Number} threshold - The distance threshold. Range [0.0, 1.0].
	 * @param {Number} falloff - The falloff. Range [0.0, 1.0].
	 */

	setDistanceCutoff(threshold, falloff) {

		this.uniforms.distanceCutoff.value.set(
			Math.min(Math.max(threshold, 0.0), 1.0),
			Math.min(Math.max(threshold + falloff, 0.0), 1.0)
		);

	}

	/**
	 * The occlusion proximity threshold. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get proximityThreshold() {

		return this.uniforms.proximityCutoff.value.x;

	}

	set proximityThreshold(value) {

		this.uniforms.proximityCutoff.value.set(
			Math.min(Math.max(value, 0.0), 1.0),
			Math.min(Math.max(value + this.proximityFalloff, 0.0), 1.0)
		);

	}

	/**
	 * The occlusion proximity threshold in world units.
	 *
	 * @type {Number}
	 */

	get worldProximityThreshold() {

		return -orthographicDepthToViewZ(this.proximityThreshold, this.near, this.far);

	}

	set worldProximityThreshold(value) {

		this.proximityThreshold = viewZToOrthographicDepth(-value, this.near, this.far);

	}

	/**
	 * The occlusion proximity falloff. Range: [0.0, 1.0].
	 *
	 * @type {Number}
	 */

	get proximityFalloff() {

		return this.uniforms.proximityCutoff.value.y - this.proximityThreshold;

	}

	set proximityFalloff(value) {

		this.uniforms.proximityCutoff.value.y = Math.min(Math.max(this.proximityThreshold + value, 0.0), 1.0);

	}

	/**
	 * The occlusion proximity falloff in world units.
	 *
	 * @type {Number}
	 */

	get worldProximityFalloff() {

		return -orthographicDepthToViewZ(this.proximityFalloff, this.near, this.far);

	}

	set worldProximityFalloff(value) {

		this.proximityFalloff = viewZToOrthographicDepth(-value, this.near, this.far);

	}

	/**
	 * Sets the occlusion proximity cutoff.
	 *
	 * @deprecated Use proximityThreshold and proximityFalloff instead.
	 * @param {Number} threshold - The range threshold. Range [0.0, 1.0].
	 * @param {Number} falloff - The falloff. Range [0.0, 1.0].
	 */

	setProximityCutoff(threshold, falloff) {

		this.uniforms.proximityCutoff.value.set(
			Math.min(Math.max(threshold, 0.0), 1.0),
			Math.min(Math.max(threshold + falloff, 0.0), 1.0)
		);

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

			this.uniforms.cameraNearFar.value.set(camera.near, camera.far);
			this.uniforms.projectionMatrix.value.copy(camera.projectionMatrix);
			this.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();

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

		const uniforms = this.uniforms;
		const noiseTexture = uniforms.noiseTexture.value;

		if(noiseTexture !== null) {

			uniforms.noiseScale.value.set(
				width / noiseTexture.image.width,
				height / noiseTexture.image.height
			);

		}

		uniforms.texelSize.value.set(1.0 / width, 1.0 / height);
		this.resolution.set(width, height);
		this.updateRadius();

	}

}
