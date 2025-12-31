import * as THREE from 'three'; // Assuming you have Three.js installed and can import it
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


export function setupOrbitControl(scene, camera, renderer) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.25;
    // controls.screenSpacePanning = false;
    // controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation to prevent flipping
    // controls.minDistance = 1; // Prevent zooming too close
    // controls.maxDistance = 10; // Prevent zooming too far

    controls.addEventListener( 'change', ()=>{renderer.render( scene, camera )} ); // use if there is no animation loop
    // controls.target.set( 0, 0, - 0.2 );
    controls.update();

    return controls;
}