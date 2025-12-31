import { BasicDepthPacking, NoBlending, REVISION, ShaderMaterial, Uniform, Vector2 } from "three";
import { EdgeDetectionMode } from "../enums/EdgeDetectionMode.js";

// import fragmentShader from "./glsl/edge-detection.frag";
// import vertexShader from "./glsl/edge-detection.vert";
const fragmentShader = `varying vec2 vUv;
varying vec2 vUv0;
varying vec2 vUv1;

#if EDGE_DETECTION_MODE != 0

	varying vec2 vUv2;
	varying vec2 vUv3;
	varying vec2 vUv4;
	varying vec2 vUv5;

#endif

#if EDGE_DETECTION_MODE == 1

	#include <common>

#endif

#if EDGE_DETECTION_MODE == 0 || PREDICATION_MODE == 1

	#ifdef GL_FRAGMENT_PRECISION_HIGH

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

	vec3 gatherNeighbors() {

		float p = readDepth(vUv);
		float pLeft = readDepth(vUv0);
		float pTop = readDepth(vUv1);

		return vec3(p, pLeft, pTop);

	}

#elif PREDICATION_MODE == 2

	uniform sampler2D predicationBuffer;

	vec3 gatherNeighbors() {

		float p = texture2D(predicationBuffer, vUv).r;
		float pLeft = texture2D(predicationBuffer, vUv0).r;
		float pTop = texture2D(predicationBuffer, vUv1).r;

		return vec3(p, pLeft, pTop);

	}

#endif

#if PREDICATION_MODE != 0

	vec2 calculatePredicatedThreshold() {

		vec3 neighbours = gatherNeighbors();
		vec2 delta = abs(neighbours.xx - neighbours.yz);
		vec2 edges = step(PREDICATION_THRESHOLD, delta);

		return PREDICATION_SCALE * EDGE_THRESHOLD * (1.0 - PREDICATION_STRENGTH * edges);

	}

#endif

#if EDGE_DETECTION_MODE != 0

	uniform sampler2D inputBuffer;

#endif

void main() {

	#if EDGE_DETECTION_MODE == 0

		const vec2 threshold = vec2(DEPTH_THRESHOLD);

	#elif PREDICATION_MODE != 0

		vec2 threshold = calculatePredicatedThreshold();

	#else

		const vec2 threshold = vec2(EDGE_THRESHOLD);

	#endif

	#if EDGE_DETECTION_MODE == 0

		// Depth-based edge detection.

		vec3 neighbors = gatherNeighbors();
		vec2 delta = abs(neighbors.xx - vec2(neighbors.y, neighbors.z));
		vec2 edges = step(threshold, delta);

		if(dot(edges, vec2(1.0)) == 0.0) {

			discard;

		}

		gl_FragColor = vec4(edges, 0.0, 1.0);

	#elif EDGE_DETECTION_MODE == 1

		// Luma-based edge detection.

		float l = luminance(texture2D(inputBuffer, vUv).rgb);
		float lLeft = luminance(texture2D(inputBuffer, vUv0).rgb);
		float lTop  = luminance(texture2D(inputBuffer, vUv1).rgb);

		vec4 delta;
		delta.xy = abs(l - vec2(lLeft, lTop));

		vec2 edges = step(threshold, delta.xy);

		if(dot(edges, vec2(1.0)) == 0.0) {

			discard;

		}

		// Calculate right and bottom deltas.
		float lRight = luminance(texture2D(inputBuffer, vUv2).rgb);
		float lBottom  = luminance(texture2D(inputBuffer, vUv3).rgb);
		delta.zw = abs(l - vec2(lRight, lBottom));

		// Calculate the maximum delta in the direct neighborhood.
		vec2 maxDelta = max(delta.xy, delta.zw);

		// Calculate left-left and top-top deltas.
		float lLeftLeft = luminance(texture2D(inputBuffer, vUv4).rgb);
		float lTopTop = luminance(texture2D(inputBuffer, vUv5).rgb);
		delta.zw = abs(vec2(lLeft, lTop) - vec2(lLeftLeft, lTopTop));

		// Calculate the final maximum delta.
		maxDelta = max(maxDelta.xy, delta.zw);
		float finalDelta = max(maxDelta.x, maxDelta.y);

		// Local contrast adaptation.
		edges.xy *= step(finalDelta, LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy);

		gl_FragColor = vec4(edges, 0.0, 1.0);

	#elif EDGE_DETECTION_MODE == 2

		// Chroma-based edge detection.

		vec4 delta;
		vec3 c = texture2D(inputBuffer, vUv).rgb;

		vec3 cLeft = texture2D(inputBuffer, vUv0).rgb;
		vec3 t = abs(c - cLeft);
		delta.x = max(max(t.r, t.g), t.b);

		vec3 cTop = texture2D(inputBuffer, vUv1).rgb;
		t = abs(c - cTop);
		delta.y = max(max(t.r, t.g), t.b);

		vec2 edges = step(threshold, delta.xy);

		if(dot(edges, vec2(1.0)) == 0.0) {

			discard;

		}

		// Calculate right and bottom deltas.
		vec3 cRight = texture2D(inputBuffer, vUv2).rgb;
		t = abs(c - cRight);
		delta.z = max(max(t.r, t.g), t.b);

		vec3 cBottom = texture2D(inputBuffer, vUv3).rgb;
		t = abs(c - cBottom);
		delta.w = max(max(t.r, t.g), t.b);

		// Calculate the maximum delta in the direct neighborhood.
		vec2 maxDelta = max(delta.xy, delta.zw);

		// Calculate left-left and top-top deltas.
		vec3 cLeftLeft = texture2D(inputBuffer, vUv4).rgb;
		t = abs(c - cLeftLeft);
		delta.z = max(max(t.r, t.g), t.b);

		vec3 cTopTop = texture2D(inputBuffer, vUv5).rgb;
		t = abs(c - cTopTop);
		delta.w = max(max(t.r, t.g), t.b);

		// Calculate the final maximum delta.
		maxDelta = max(maxDelta.xy, delta.zw);
		float finalDelta = max(maxDelta.x, maxDelta.y);

		// Local contrast adaptation.
		edges *= step(finalDelta, LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy);

		gl_FragColor = vec4(edges, 0.0, 1.0);

	#endif

}
`;
const vertexShader = `uniform vec2 texelSize;

varying vec2 vUv;
varying vec2 vUv0;
varying vec2 vUv1;

#if EDGE_DETECTION_MODE != 0

	varying vec2 vUv2;
	varying vec2 vUv3;
	varying vec2 vUv4;
	varying vec2 vUv5;

#endif

void main() {

	vUv = position.xy * 0.5 + 0.5;

	// Left and top texel coordinates.
	vUv0 = vUv + texelSize * vec2(-1.0, 0.0);
	vUv1 = vUv + texelSize * vec2(0.0, -1.0);

	#if EDGE_DETECTION_MODE != 0

		// Right and bottom texel coordinates.
		vUv2 = vUv + texelSize * vec2(1.0, 0.0);
		vUv3 = vUv + texelSize * vec2(0.0, 1.0);

		// Left-left and top-top texel coordinates.
		vUv4 = vUv + texelSize * vec2(-2.0, 0.0);
		vUv5 = vUv + texelSize * vec2(0.0, -2.0);

	#endif

	gl_Position = vec4(position.xy, 1.0, 1.0);

}
`;
/**
 * An edge detection material. Mainly used for SMAA.
 *
 * @implements {Resizable}
 */

export class EdgeDetectionMaterial extends ShaderMaterial {

	/**
	 * Constructs a new edge detection material.
	 *
	 * TODO Remove parameters.
	 * @param {Vector2} [texelSize] - The screen texel size.
	 * @param {EdgeDetectionMode} [mode=EdgeDetectionMode.COLOR] - The edge detection mode.
	 */

	constructor(texelSize = new Vector2(), mode = EdgeDetectionMode.COLOR) {

		super({
			name: "EdgeDetectionMaterial",
			defines: {
				THREE_REVISION: REVISION.replace(/\D+/g, ""),
				LOCAL_CONTRAST_ADAPTATION_FACTOR: "2.0",
				EDGE_THRESHOLD: "0.1",
				DEPTH_THRESHOLD: "0.01",
				PREDICATION_MODE: "0",
				PREDICATION_THRESHOLD: "0.01",
				PREDICATION_SCALE: "2.0",
				PREDICATION_STRENGTH: "1.0",
				DEPTH_PACKING: "0"
			},
			uniforms: {
				inputBuffer: new Uniform(null),
				depthBuffer: new Uniform(null),
				predicationBuffer: new Uniform(null),
				texelSize: new Uniform(texelSize)
			},
			blending: NoBlending,
			toneMapped: false,
			depthWrite: false,
			depthTest: false,
			fragmentShader,
			vertexShader
		});

		this.edgeDetectionMode = mode;

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
	 * The edge detection mode.
	 *
	 * @type {EdgeDetectionMode}
	 */

	get edgeDetectionMode() {

		return Number(this.defines.EDGE_DETECTION_MODE);

	}

	set edgeDetectionMode(value) {

		this.defines.EDGE_DETECTION_MODE = value.toFixed(0);
		this.needsUpdate = true;

	}

	/**
	 * Returns the edge detection mode.
	 *
	 * @deprecated Use edgeDetectionMode instead.
	 * @return {EdgeDetectionMode} The mode.
	 */

	getEdgeDetectionMode() {

		return this.edgeDetectionMode;

	}

	/**
	 * Sets the edge detection mode.
	 *
	 * @deprecated Use edgeDetectionMode instead.
	 * @param {EdgeDetectionMode} value - The edge detection mode.
	 */

	setEdgeDetectionMode(value) {

		this.edgeDetectionMode = value;

	}

	/**
	 * The local contrast adaptation factor. Has no effect if the edge detection mode is set to DEPTH. Default is 2.0.
	 *
	 * If a neighbor edge has _factor_ times bigger contrast than the current edge, the edge will be discarded.
	 *
	 * This allows to eliminate spurious crossing edges and is based on the fact that if there is too much contrast in a
	 * direction, the perceptual contrast in the other neighbors will be hidden.
	 *
	 * @type {Number}
	 */

	get localContrastAdaptationFactor() {

		return Number(this.defines.LOCAL_CONTRAST_ADAPTATION_FACTOR);

	}

	set localContrastAdaptationFactor(value) {

		this.defines.LOCAL_CONTRAST_ADAPTATION_FACTOR = value.toFixed("6");
		this.needsUpdate = true;

	}

	/**
	 * Returns the local contrast adaptation factor.
	 *
	 * @deprecated Use localContrastAdaptationFactor instead.
	 * @return {Number} The factor.
	 */

	getLocalContrastAdaptationFactor() {

		return this.localContrastAdaptationFactor;

	}

	/**
	 * Sets the local contrast adaptation factor. Has no effect if the edge detection mode is set to DEPTH.
	 *
	 * @deprecated Use localContrastAdaptationFactor instead.
	 * @param {Number} value - The local contrast adaptation factor. Default is 2.0.
	 */

	setLocalContrastAdaptationFactor(value) {

		this.localContrastAdaptationFactor = value;

	}

	/**
	 * The edge detection threshold. Range: [0.0, 0.5].
	 *
	 * A lower value results in more edges being detected at the expense of performance.
	 *
	 * For luma- and chroma-based edge detection, 0.1 is a reasonable value and allows to catch most visible edges. 0.05
	 * is a rather overkill value that allows to catch 'em all. Darker scenes may require an even lower threshold.
	 *
	 * If depth-based edge detection is used, the threshold will depend on the scene depth.
	 *
	 * @type {Number}
	 */

	get edgeDetectionThreshold() {

		return Number(this.defines.EDGE_THRESHOLD);

	}

	set edgeDetectionThreshold(value) {

		this.defines.EDGE_THRESHOLD = value.toFixed("6");
		this.defines.DEPTH_THRESHOLD = (value * 0.1).toFixed("6");
		this.needsUpdate = true;

	}

	/**
	 * Returns the edge detection threshold.
	 *
	 * @deprecated Use edgeDetectionThreshold instead.
	 * @return {Number} The threshold.
	 */

	getEdgeDetectionThreshold() {

		return this.edgeDetectionThreshold;

	}

	/**
	 * Sets the edge detection threshold.
	 *
	 * @deprecated Use edgeDetectionThreshold instead.
	 * @param {Number} value - The edge detection threshold. Range: [0.0, 0.5].
	 */

	setEdgeDetectionThreshold(value) {

		this.edgeDetectionThreshold = value;

	}

	/**
	 * The predication mode.
	 *
	 * Predicated thresholding allows to better preserve texture details and to improve edge detection using an additional
	 * buffer such as a light accumulation or depth buffer.
	 *
	 * @type {PredicationMode}
	 */

	get predicationMode() {

		return Number(this.defines.PREDICATION_MODE);

	}

	set predicationMode(value) {

		this.defines.PREDICATION_MODE = value.toFixed(0);
		this.needsUpdate = true;

	}

	/**
	 * Returns the predication mode.
	 *
	 * @deprecated Use predicationMode instead.
	 * @return {PredicationMode} The mode.
	 */

	getPredicationMode() {

		return this.predicationMode;

	}

	/**
	 * Sets the predication mode.
	 *
	 * @deprecated Use predicationMode instead.
	 * @param {PredicationMode} value - The predication mode.
	 */

	setPredicationMode(value) {

		this.predicationMode = value;

	}

	/**
	 * The predication buffer.
	 *
	 * @type {Texture}
	 */

	set predicationBuffer(value) {

		this.uniforms.predicationBuffer.value = value;

	}

	/**
	 * Sets a custom predication buffer.
	 *
	 * @deprecated Use predicationBuffer instead.
	 * @param {Texture} value - The predication buffer.
	 */

	setPredicationBuffer(value) {

		this.uniforms.predicationBuffer.value = value;

	}

	/**
	 * The predication threshold.
	 *
	 * @type {Number}
	 */

	get predicationThreshold() {

		return Number(this.defines.PREDICATION_THRESHOLD);

	}

	set predicationThreshold(value) {

		this.defines.PREDICATION_THRESHOLD = value.toFixed("6");
		this.needsUpdate = true;

	}

	/**
	 * Returns the predication threshold.
	 *
	 * @deprecated Use predicationThreshold instead.
	 * @return {Number} The threshold.
	 */

	getPredicationThreshold() {

		return this.predicationThreshold;

	}

	/**
	 * Sets the predication threshold.
	 *
	 * @deprecated Use predicationThreshold instead.
	 * @param {Number} value - The threshold.
	 */

	setPredicationThreshold(value) {

		this.predicationThreshold = value;

	}

	/**
	 * The predication scale. Range: [1.0, 5.0].
	 *
	 * Determines how much the edge detection threshold should be scaled when using predication.
	 *
	 * @type {Boolean|Texture|Number}
	 */

	get predicationScale() {

		return Number(this.defines.PREDICATION_SCALE);

	}

	set predicationScale(value) {

		this.defines.PREDICATION_SCALE = value.toFixed("6");
		this.needsUpdate = true;

	}

	/**
	 * Returns the predication scale.
	 *
	 * @deprecated Use predicationScale instead.
	 * @return {Number} The scale.
	 */

	getPredicationScale() {

		return this.predicationScale;

	}

	/**
	 * Sets the predication scale.
	 *
	 * @deprecated Use predicationScale instead.
	 * @param {Number} value - The scale. Range: [1.0, 5.0].
	 */

	setPredicationScale(value) {

		this.predicationScale = value;

	}

	/**
	 * The predication strength. Range: [0.0, 1.0].
	 *
	 * Determines how much the edge detection threshold should be decreased locally when using predication.
	 *
	 * @type {Number}
	 */

	get predicationStrength() {

		return Number(this.defines.PREDICATION_STRENGTH);

	}

	set predicationStrength(value) {

		this.defines.PREDICATION_STRENGTH = value.toFixed("6");
		this.needsUpdate = true;

	}

	/**
	 * Returns the predication strength.
	 *
	 * @deprecated Use predicationStrength instead.
	 * @return {Number} The strength.
	 */

	getPredicationStrength() {

		return this.predicationStrength;

	}

	/**
	 * Sets the predication strength.
	 *
	 * @deprecated Use predicationStrength instead.
	 * @param {Number} value - The strength. Range: [0.0, 1.0].
	 */

	setPredicationStrength(value) {

		this.predicationStrength = value;

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
