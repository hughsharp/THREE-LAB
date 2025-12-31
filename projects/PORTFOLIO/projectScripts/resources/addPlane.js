import * as THREE from 'three';
import { constantUniform } from '../utils/addConstantUniform.js';

export function addPlane(scene) {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0x00ff00) },
            uDivisions: { value: new THREE.Vector2(20, 10) },
            iTime: constantUniform.iTime,
            iResolution: constantUniform.iResolution
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                // Ignore world transforms (projection/view matrices)
                // Output position directly in clip space (-1 to 1) for a fullscreen quad
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float iTime;
            uniform vec2 iResolution;

            float grid(vec2 fragCoord, float space, float gridWidth) {
                vec2 p  = fragCoord - vec2(.5);
                vec2 size = vec2(gridWidth);
                
                vec2 a1 = mod(p - size, space);
                vec2 a2 = mod(p + size, space);
                vec2 a = a2 - a1;
                   
                float g = min(a.x, a.y);
                return clamp(g, 0., 1.0);
            }

            void main() {
                vec2 fragCoord = gl_FragCoord.xy;
                
                // 2-size grid pattern (0.0 = line, 1.0 = space)
                // Using 10. and 50. spacing as per user snippet
                // Using 0.5 and 1.0 width
                float g1 = grid(fragCoord, 10., 0.5);
                float g2 = grid(fragCoord, 50., 1.);
                
                // Combine grids (if either is 0, result is 0 -> line)
                float pattern = g1 * g2; 
                
                // Invert to get lines as bright (1.0)
                float lines = 1.0 - pattern;

                // Gradient / Vignette from user snippet
                vec2 p = fragCoord.xy;
                vec2 c = iResolution.xy / 2.0;
                float vignette = 1.0 - length(c - p)/iResolution.x * 0.7;
                vignette = clamp(vignette, 0.0, 1.0);
                
                // Flashing effect
                float flash = 0.5 + 0.5 * sin(iTime * 3.0);
                
                // Final Intensity
                float intensity = lines * vignette * flash;
                
                vec3 finalColor = uColor * intensity;
                gl_FragColor = vec4(finalColor, intensity);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true // Ensure it's not occluded by 3D objects
    });
    const plane = new THREE.Mesh(geometry, material);
    // plane.position, rotation, scale are now irrelevant due to vertex shader override
    plane.frustumCulled = false; // Prevent culling since it's always on screen
    plane.name = 'radarPlane';
    // scene.add(plane);
}
