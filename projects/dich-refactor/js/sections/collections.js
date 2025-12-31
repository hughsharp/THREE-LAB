/**
 * DICH™ Collections WebGL Animation
 * Uses Three.js to render a plane with a custom shader.
 * Handles the pixelated/ripple transition effect between collection images.
 */

document.addEventListener("DOMContentLoaded", () => {
    initCollectionsWebGL();
});

function initCollectionsWebGL() {
    const container = document.getElementById("webglContainer");
    const collectionButton = document.querySelector('[collection-button="2"]');

    if (!container) return;

    // Image assets configuration
    const images = {
        1: "https://cdn.prod.website-files.com/675835c7f4ae1fa1a79b3733/67c6b3bb846631fc97e4d6e3_658938bdc8e942f531f832e90115063c_collections-oraniths.webp",
        2: "https://cdn.prod.website-files.com/675835c7f4ae1fa1a79b3733/67d981fb252db636a62ada10_9fe515e30f59684f5ddbdef1174d5129_collections-anturax-v2.webp",
    };

    let scene, camera, renderer, material, plane;
    let textures = {};
    let activeTexture = 1;
    let transitionTexture = null;
    let progress = 1;
    let isAnimating = false;

    // Initialize Three.js Environment
    function initWebGL() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 10);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        const loader = new THREE.TextureLoader();
        let loaded = 0;

        // Preload all textures
        Object.keys(images).forEach((key) => {
            loader.load(images[key], (texture) => {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                textures[key] = texture;
                loaded++;

                if (loaded === Object.keys(images).length) {
                    createScene();
                    animate();
                    setInitialActiveLink();
                    updateLottieVisibility(activeTexture);
                }
            });
        });
    }

    // Create Shader Material and Mesh
    function createScene() {
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec3 uFillColor;
            uniform float uProgress;
            uniform float uType;
            uniform float uPixels[36];
            uniform vec2 uTextureSize;
            uniform vec2 uElementSize;
            uniform sampler2D uTexture;
            varying vec2 vUv;
            
            float quadraticInOut(float t) {
                float p = 2.0 * t * t;
                return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
            }
            
            void main() {
                vec2 uv = vUv - vec2(0.5, 0.5);
                float aspect1 = uTextureSize.x / uTextureSize.y;
                float aspect2 = uElementSize.x / uElementSize.y;
                
                // Aspect Ratio Correction
                if (aspect1 > aspect2) {
                    uv *= vec2(aspect2 / aspect1, 1.0);
                } else {
                    uv *= vec2(1.0, aspect1 / aspect2);
                }
                uv += vec2(0.5, 0.5);

                vec4 defaultColor = texture2D(uTexture, uv);

                // Type 3: Pixel/Ripple Distortion Effect
                if (uType == 3.0) {
                    float progress = quadraticInOut(1.0 - uProgress);
                    float s = 50.0;
                    float imageAspect = uTextureSize.x / uTextureSize.y;
                    vec2 gridSize = vec2(
                        s,
                        floor(s / imageAspect)
                    );

                    // Distortion Calculation
                    float v = smoothstep(0.0, 1.0, vUv.y + sin(vUv.x * 4.0 + progress * 6.0) * mix(0.3, 0.1, abs(0.5 - vUv.x)) * 0.5 * smoothstep(0.0, 0.2, progress) + (1.0 - progress * 2.0));
                    float mixnewUV = (vUv.x * 3.0 + (1.0 - v) * 50.0) * progress;
                    vec2 subUv = mix(uv, floor(uv * gridSize) / gridSize, mixnewUV);

                    vec4 color = texture2D(uTexture, subUv);
                    
                    // Alpha blending and color mixing
                    color.a = mix(1.0, pow(v, 5.0), step(0.0, progress));
                    color.a = pow(v, 1.0);
                    color.rgb = mix(color.rgb, uFillColor, smoothstep(0.5, 0.0, abs(0.5 - color.a)) * progress);
                    gl_FragColor = color;
                }
                
                // Gamma correction approximation
                gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0 / 1.2));
            }
        `;

        material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uFillColor: { value: new THREE.Color("#070707") },
                uProgress: { value: 1 },
                uType: { value: 3 },
                // Array used for pixelated steps in shader logic (reserved)
                uPixels: {
                    value: new Float32Array(
                        [1, 1.5, 2, 2.5, 3, 1, 1.5, 2, 2.5, 3, 3.5, 4, 2, 2.5, 3, 3.5, 4, 4.5, 5,
                            5.5, 6, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 20, 100
                        ].map(v => v / 100))
                },
                uTextureSize: { value: new THREE.Vector2(1, 1) },
                uElementSize: { value: new THREE.Vector2(1, 1) },
                uTexture: { value: textures[activeTexture] },
            },
            transparent: true,
        });

        // Set initial aspect ratio
        material.uniforms.uTextureSize.value.set(
            textures[activeTexture].image.width,
            textures[activeTexture].image.height
        );

        const geometry = new THREE.PlaneGeometry(8, 8);
        plane = new THREE.Mesh(geometry, material);
        plane.position.set(0, 0, 0);
        scene.add(plane);
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
        updateTransition();
    }

    function updateTransition() {
        if (transitionTexture !== null && isAnimating) {
            progress += 0.0225; // Speed of transition

            // Swap texture halfway through transition
            if (progress > 0.1 && material.uniforms.uTexture.value !== textures[transitionTexture]) {
                material.uniforms.uTexture.value = textures[transitionTexture];
                material.uniforms.uTextureSize.value.set(
                    textures[transitionTexture].image.width,
                    textures[transitionTexture].image.height
                );
            }

            if (progress >= 1) {
                progress = 1;
                activeTexture = transitionTexture;
                transitionTexture = null;
                isAnimating = false;
                updateLottieVisibility(activeTexture);
            }

            material.uniforms.uProgress.value = progress;
        }
    }

    // Updates z-index of buttons to ensure the active one is clickable
    function updateZIndex(activeLink) {
        if (!collectionButton) return;
        if (activeLink === "1") {
            collectionButton.setAttribute("data-z-index", "-1");
        } else if (activeLink === "2") {
            collectionButton.setAttribute("data-z-index", "2");
        }
    }

    // Toggles visibility of Lottie animations based on active collection
    function updateLottieVisibility(activeLink) {
        const lottie1 = document.querySelector(".lottie_case-index");
        const lottie2 = document.querySelector(".lottie_case-index-2");

        if (lottie1 && lottie2) {
            if (activeLink === "1") {
                lottie1.style.opacity = "1";
                lottie2.style.opacity = "0";
            } else if (activeLink === "2") {
                lottie1.style.opacity = "0";
                lottie2.style.opacity = "1";
            }
        }
    }

    function setInitialStyles() {
        const activeElements = document.querySelectorAll(`[data-collection-link="1"]`);
        activeElements.forEach((element) => {
            element.classList.add("active");
        });
        updateLottieVisibility(activeTexture);
    }

    function setupEventListeners() {
        document.querySelectorAll("[data-collection-link]").forEach((link) => {
            link.addEventListener("click", function() {
                const newTexture = this.getAttribute("data-collection-link");

                if (newTexture == activeTexture || isAnimating) return;

                transitionTexture = newTexture;
                progress = 0;
                isAnimating = true;

                // Update UI classes
                document.querySelectorAll("[data-collection-link]").forEach((el) => {
                    el.classList.remove("active");
                });
                document.querySelectorAll(`[data-collection-link='${newTexture}']`).forEach((el) => {
                    el.classList.add("active");
                });

                updateZIndex(newTexture);
                updateLottieVisibility(newTexture);
            });
        });
    }

    function setInitialActiveLink() {
        const activeLinks = document.querySelectorAll(`[data-collection-link='${activeTexture}']`);
        if (activeLinks.length > 0) {
            activeLinks.forEach((link) => link.classList.add("active"));
            updateZIndex(activeTexture);
        }
    }

    // Start execution
    initWebGL();
    setupEventListeners();
    setInitialStyles();
}