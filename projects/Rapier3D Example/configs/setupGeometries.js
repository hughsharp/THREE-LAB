// basicGeometries.js
// Centralized basic geometries for reuse in your three.js scene
// All geometries have size = 1. Use mesh.scale to adjust size as needed.

import * as THREE from 'three';

export const BasicGeometries = {
    box:      new THREE.BoxGeometry(1, 1, 1),
    sphere:   new THREE.SphereGeometry(0.5, 32, 32), // diameter 1
    plane:    new THREE.PlaneGeometry(1, 1),
    circle:   new THREE.CircleGeometry(0.5, 32), // diameter 1
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32), // diameter 1, height 1
    cone:     new THREE.ConeGeometry(0.5, 1, 32), // base diameter 1, height 1
    torus:    new THREE.TorusGeometry(0.5, 0.2, 16, 100), // main radius 0.5, tube 0.2
    // Add more as needed
};
