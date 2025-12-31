import * as THREE from 'three'; // Assuming you have Three.js installed and can import it
import Stats from 'three/addons/libs/stats.module.js';
/**
 * Sets up the stats panel for performance monitoring.
 * @returns {Stats} The stats panel instance.
 */

export function setupStats() {
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: memory
    document.body.appendChild(stats.dom);
    return stats;
}