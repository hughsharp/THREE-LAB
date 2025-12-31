/**
 * Custom TWEEN Easing Functions
 */

/**
 * Returns a Back.InOut easing function with a custom overshoot amount.
 * The standard TWEEN.Easing.Back.InOut has an overshoot of ~1.70158.
 * Use valid range typically [0.0 - 2.0].
 * 
 * @param {number} amount - Overshoot magnitude (e.g. 0.5 for subtle, 1.7 for standard)
 * @returns {function} Easing function compatible with TWEEN.easing()
 */
export function getBackInOut(amount) {
    return function (k) {
        let s = amount * 1.525; // Scale the overshoot amount for the InOut variant
        if ((k *= 2) < 1) {
            return 0.5 * (k * k * ((s + 1) * k - s));
        }
        return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
    };
}

// Custom Back.Out
export function getBackOut(amount) {
    return function (k) {
        let s = amount;
        return --k * k * ((s + 1) * k + s) + 1;
    };
}

export const BACK_IN_OUT_DEFAULT = getBackInOut(0.4);
export const BACK_OUT_DEFAULT = getBackOut(0.4);
