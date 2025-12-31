import * as THREE from 'three';

// Define the radius as a constant in one place
const FIREFLY_RADIUS = 200.0;
const startPosition = new THREE.Vector3(
    -FIREFLY_RADIUS,
    34.0,
    -2.4
);

const vertexShader = `
    uniform float iTime;

    attribute float size;
    attribute float speed;
    attribute vec3 direction;
    attribute float random;

    const float radius =  ${FIREFLY_RADIUS.toFixed(1)};
    const float speedFactor = 30.0;
    const float PI = 3.1415926535;
    varying float vRandom; 

    void main() {
        vRandom = random; //for fragmentShader
        // 1. LIFECYCLE
        float lifeTime = (radius * 2.0) / (direction.x * speed * speedFactor);
        float cycleTime = mod(iTime + random * lifeTime, lifeTime);

        // 2. POSITION
        vec3 displacement = direction * speed * speedFactor * cycleTime;
  
        vec3 newPosition = position + displacement;

        // 3. Z-AXIS ROTATION
        // Create a gentle rotation angle based on time
        vec2 pivot = vec2(${startPosition.y.toFixed(1)}, ${startPosition.z.toFixed(1)});
        float angle = iTime * 0.15; 
        mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        
        // Apply the rotation to the x and y coordinates
        newPosition.yz = rotationMatrix * (newPosition.yz - pivot) + pivot;

        // 4. SIZE
        float pulsatingSize = size + 15.0 * sin(random * PI * 2.0 * position.x + iTime * 5.0 );
    
        // if ( newPosition.z > 0. || newPosition.y < 0.) {
        //     pulsatingSize = 0.0;
        // }
        // 5. PROJECTION
        vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
        gl_PointSize = pulsatingSize * (15.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    uniform sampler2D fireFliesTexture;

    varying float vRandom; // <-- Receive the random value

    void main() {
        // Define the two possible colors
        vec3 orange = vec3(2.0, 0.8, 0.2);
        vec3 cyan = vec3(0.7, 1.8, 1.8); // A lightning cyan color

        vec3 color; // Declare the color variable

        // If the random value is less than 0.3 (a 30% chance), use cyan.
        if (vRandom < 0.2) {
            color = cyan;
        } else {
            color = orange;
        }

        // Apply texture and intensity
        vec4 tex = texture2D(fireFliesTexture, gl_PointCoord);
        float intensity = pow(tex.a, 2.0); 

        // Set the final color
        gl_FragColor = vec4(color * intensity, 1.0);
    }
`;
function addTweenData(item, scene) {
    let parent = item.initialParent || item.parent
    const itemData = {
        uuid: item.uuid,
        name: item.name,
        position: item.position.clone(),
        rotation: {
            x: item.rotation.x,
            y: item.rotation.y,
            z: item.rotation.z,
            order: item.rotation.order,
        },
        // Store the original scale
        scale: item.scale.clone(), // when binding rapier, scale might be changed and need to update
        parent: parent
    };
    // scene.tweenData = scene.tweenData || [];
    // scene.tweenData.push(itemData);
    scene.tweenData = scene.tweenData || {}
    scene.tweenData[item.uuid] = itemData;
}
export function addFireflies(scene, constantUniform, amount = 300) {

    const positions = new Float32Array(amount * 3);
    const sizes = new Float32Array(amount);
    const speeds = new Float32Array(amount);
    const directions = new Float32Array(amount * 3);
    const randoms = new Float32Array(amount);

    const vertex = new THREE.Vector3();
    const direction = new THREE.Vector3();

    for (let i = 0; i < amount; i++) {
        // Define the central starting point

        // Create a small, random offset from the center
        const offset = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 5.0);
        // Apply the offset to get the final starting position
        vertex.copy(startPosition).add(offset);
        vertex.toArray(positions, i * 3);

        // Set a random direction for movement
        direction.x = Math.random() * 0.5 + 0.5;
        direction.y = (Math.random() - 0.5) * 1.0;
        direction.z = (Math.random() - 0.5) * 0.5;
        direction.normalize();
        direction.toArray(directions, i * 3);

        // Set unique attributes for each particle
        randoms[i] = Math.random();
        sizes[i] = 20.0;
        speeds[i] = Math.random() * 0.4 + 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('direction', new THREE.BufferAttribute(directions, 3));
    geometry.setAttribute('random', new THREE.BufferAttribute(randoms, 1));

    // Note: The 'vertexShader' and 'fragmentShader' constants must be defined
    // outside this function, as in your original code.
    const material = new THREE.ShaderMaterial({
        uniforms: constantUniform,
        vertexShader: vertexShader, // Assumes vertexShader is in scope
        fragmentShader: fragmentShader, // Assumes fragmentShader is in scope
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true
    });

    const fireflies = new THREE.Points(geometry, material);
    scene.add(fireflies);
    fireflies.name = "fireflies";
    // fireflies.position.x = -10
    addTweenData(fireflies, scene)
    return fireflies;
}