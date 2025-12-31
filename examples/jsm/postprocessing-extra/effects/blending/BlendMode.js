import { EventDispatcher, Uniform } from "three";
import { BlendFunction } from "../../enums/BlendFunction.js";

// import add from "./glsl/add.frag";
// import alpha from "./glsl/alpha.frag";
// import average from "./glsl/average.frag";
// import color from "./glsl/color.frag";
// import colorBurn from "./glsl/color-burn.frag";
// import colorDodge from "./glsl/color-dodge.frag";
// import darken from "./glsl/darken.frag";
// import difference from "./glsl/difference.frag";
// import divide from "./glsl/divide.frag";
// import exclusion from "./glsl/exclusion.frag";
// import hardLight from "./glsl/hard-light.frag";
// import hardMix from "./glsl/hard-mix.frag";
// import hue from "./glsl/hue.frag";
// import invert from "./glsl/invert.frag";
// import invertRGB from "./glsl/invert-rgb.frag";
// import lighten from "./glsl/lighten.frag";
// import linearBurn from "./glsl/linear-burn.frag";
// import linearDodge from "./glsl/linear-dodge.frag";
// import linearLight from "./glsl/linear-light.frag";
// import luminosity from "./glsl/luminosity.frag";
// import multiply from "./glsl/multiply.frag";
// import negation from "./glsl/negation.frag";
// import normal from "./glsl/normal.frag";
// import overlay from "./glsl/overlay.frag";
// import pinLight from "./glsl/pin-light.frag";
// import reflect from "./glsl/reflect.frag";
// import saturation from "./glsl/saturation.frag";
// import screen from "./glsl/screen.frag";
// import softLight from "./glsl/soft-light.frag";
// import src from "./glsl/src.frag";
// import subtract from "./glsl/subtract.frag";
// import vividLight from "./glsl/vivid-light.frag";

const add = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(x.rgb + y.rgb, y.a), opacity);

}
`;
const alpha = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, y, y.a * opacity);

}
`;
const average = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4((x.rgb + y.rgb) * 0.5, y.a), opacity);

}
`;
const color = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 xHSL = RGBToHSL(x.rgb);
	vec3 yHSL = RGBToHSL(y.rgb);
	vec3 z = HSLToRGB(vec3(yHSL.xy, xHSL.z));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const colorBurn = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 a = x.rgb, b = y.rgb;
	vec3 z = mix(step(0.0, b) * (1.0 - min(vec3(1.0), (1.0 - a) / b)), vec3(1.0), step(1.0, a));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const colorDodge = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 a = x.rgb, b = y.rgb;
	vec3 z = step(0.0, a) * mix(min(vec3(1.0), a / max(1.0 - b, 1e-9)), vec3(1.0), step(1.0, b));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const darken = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(min(x.rgb, y.rgb), y.a), opacity);

}
`;
const difference = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(abs(x.rgb - y.rgb), y.a), opacity);

}
`;
const divide = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(x.rgb / max(y.rgb, 1e-12), y.a), opacity);

}
`;
const exclusion = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4((x.rgb + y.rgb - 2.0 * x.rgb * y.rgb), y.a), opacity);

}
`;
const hardLight = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 a = min(x.rgb, 1.0);
	vec3 b = min(y.rgb, 1.0);
	vec3 z = mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), step(0.5, b));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const hardMix = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(step(1.0, x.rgb + y.rgb), y.a), opacity);

}
`;
const hue = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 xHSL = RGBToHSL(x.rgb);
	vec3 yHSL = RGBToHSL(y.rgb);
	vec3 z = HSLToRGB(vec3(yHSL.x, xHSL.yz));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const invert = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(1.0 - y.rgb, y.a), opacity);

}
`;
const invertRGB = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(y.rgb * (1.0 - x.rgb), y.a), opacity);

}
`;
const lighten = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(max(x.rgb, y.rgb), y.a), opacity);

}
`;
const linearBurn = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(clamp(y.rgb + x.rgb - 1.0, 0.0, 1.0), y.a), opacity);

}
`;
const linearDodge = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(min(x.rgb + y.rgb, 1.0), y.a), opacity);

}
`;
const linearLight = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(clamp(2.0 * y.rgb + x.rgb - 1.0, 0.0, 1.0), y.a), opacity);

}
`;
const luminosity = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 xHSL = RGBToHSL(x.rgb);
	vec3 yHSL = RGBToHSL(y.rgb);
	vec3 z = HSLToRGB(vec3(xHSL.xy, yHSL.z));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const multiply = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(x.rgb * y.rgb, y.a), opacity);

}
`;
const negation = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(1.0 - abs(1.0 - x.rgb - y.rgb), y.a), opacity);

}
`;
const normal = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, y, opacity);

}
`;
const overlay = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 z = mix(2.0 * y.rgb * x.rgb, 1.0 - 2.0 * (1.0 - y.rgb) * (1.0 - x.rgb), step(0.5, x.rgb));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const pinLight = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 y2 = 2.0 * y.rgb;

	vec3 z = mix(
		mix(y2, x.rgb, step(0.5 * x.rgb, y.rgb)),
		max(y2 - 1.0, vec3(0.0)), 
		step(x.rgb, y2 - 1.0)
	);

	return mix(x, vec4(z, y.a), opacity);

}
`;
const reflect = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 z = mix(min(x.rgb * x.rgb / max(1.0 - y.rgb, 1e-12), 1.0), y.rgb, step(1.0, y.rgb));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const saturation = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 xHSL = RGBToHSL(x.rgb);
	vec3 yHSL = RGBToHSL(y.rgb);
	vec3 z = HSLToRGB(vec3(xHSL.x, yHSL.y, xHSL.z));
	return mix(x, vec4(z, y.a), opacity);

}
`;
const screen = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(x.rgb + y.rgb - min(x.rgb * y.rgb, 1.0), y.a), opacity);

}
`;
const softLight = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 a = x.rgb;
	vec3 b = y.rgb;

	vec3 y2 = 2.0 * b;
	vec3 w = step(0.5, b);

	vec3 c = a - (1.0 - y2) * a * (1.0 - a);
	vec3 d = mix(
		a + (y2 - 1.0) * (sqrt(a) - a),
		a + (y2 - 1.0) * a * ((16.0 * a - 12.0) * a + 3.0),
		w * (1.0 - step(0.25, a))
	);

	vec3 z = mix(c, d, w);

	return mix(x, vec4(z, y.a), opacity);

}
`;
const src = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	// x is the color that is already there (DST), y is the new color (SRC)
	return y;

}
`;
const subtract = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, vec4(max(x.rgb + y.rgb - 1.0, 0.0), y.a), opacity);

}
`;
const vividLight = `vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	vec3 z = mix(
		max(1.0 - min((1.0 - x.rgb) / (2.0 * y.rgb), 1.0), 0.0),
		min(x.rgb / (2.0 * (1.0 - y.rgb)), 1.0),
		step(0.5, y.rgb)
	);

	return mix(x, vec4(z, y.a), opacity);

}
`;

/**
 * A blend function shader code catalogue.
 *
 * @type {Map<BlendFunction, String>}
 * @private
 */

const blendFunctions = new Map([
	[BlendFunction.ADD, add],
	[BlendFunction.ALPHA, alpha],
	[BlendFunction.AVERAGE, average],
	[BlendFunction.COLOR, color],
	[BlendFunction.COLOR_BURN, colorBurn],
	[BlendFunction.COLOR_DODGE, colorDodge],
	[BlendFunction.DARKEN, darken],
	[BlendFunction.DIFFERENCE, difference],
	[BlendFunction.DIVIDE, divide],
	[BlendFunction.DST, null],
	[BlendFunction.EXCLUSION, exclusion],
	[BlendFunction.HARD_LIGHT, hardLight],
	[BlendFunction.HARD_MIX, hardMix],
	[BlendFunction.HUE, hue],
	[BlendFunction.INVERT, invert],
	[BlendFunction.INVERT_RGB, invertRGB],
	[BlendFunction.LIGHTEN, lighten],
	[BlendFunction.LINEAR_BURN, linearBurn],
	[BlendFunction.LINEAR_DODGE, linearDodge],
	[BlendFunction.LINEAR_LIGHT, linearLight],
	[BlendFunction.LUMINOSITY, luminosity],
	[BlendFunction.MULTIPLY, multiply],
	[BlendFunction.NEGATION, negation],
	[BlendFunction.NORMAL, normal],
	[BlendFunction.OVERLAY, overlay],
	[BlendFunction.PIN_LIGHT, pinLight],
	[BlendFunction.REFLECT, reflect],
	[BlendFunction.SATURATION, saturation],
	[BlendFunction.SCREEN, screen],
	[BlendFunction.SOFT_LIGHT, softLight],
	[BlendFunction.SRC, src],
	[BlendFunction.SUBTRACT, subtract],
	[BlendFunction.VIVID_LIGHT, vividLight]
]);

/**
 * A blend mode.
 */

export class BlendMode extends EventDispatcher {

	/**
	 * Constructs a new blend mode.
	 *
	 * @param {BlendFunction} blendFunction - The blend function.
	 * @param {Number} opacity - The opacity of the color that will be blended with the base color.
	 */

	constructor(blendFunction, opacity = 1.0) {

		super();

		/**
		 * Backing data for {@link blendFunction}.
		 *
		 * @type {BlendFunction}
		 * @private
		 */

		this._blendFunction = blendFunction;

		/**
		 * A uniform that controls the opacity of this blend mode.
		 *
		 * TODO Add opacity accessors for uniform value.
		 * @type {Uniform}
		 */

		this.opacity = new Uniform(opacity);

	}

	/**
	 * Returns the opacity.
	 *
	 * @return {Number} The opacity.
	 */

	getOpacity() {

		return this.opacity.value;

	}

	/**
	 * Sets the opacity.
	 *
	 * @param {Number} value - The opacity.
	 */

	setOpacity(value) {

		this.opacity.value = value;

	}

	/**
	 * The blend function.
	 *
	 * @type {BlendFunction}
	 */

	get blendFunction() {

		return this._blendFunction;

	}

	set blendFunction(value) {

		this._blendFunction = value;
		this.dispatchEvent({ type: "change" });

	}

	/**
	 * Returns the blend function.
	 *
	 * @deprecated Use blendFunction instead.
	 * @return {BlendFunction} The blend function.
	 */

	getBlendFunction() {

		return this.blendFunction;

	}

	/**
	 * Sets the blend function.
	 *
	 * @deprecated Use blendFunction instead.
	 * @param {BlendFunction} value - The blend function.
	 */

	setBlendFunction(value) {

		this.blendFunction = value;

	}

	/**
	 * Returns the blend function shader code.
	 *
	 * @return {String} The blend function shader code.
	 */

	getShaderCode() {

		return blendFunctions.get(this.blendFunction);

	}

}
