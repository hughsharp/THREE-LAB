/**
 * DICH™ Past Drop WebGL Animation
 * Implements a "Liquid Distortion" effect using Three.js.
 * It uses a DataTexture to store physics data (velocity/relaxation) 
 * which drives the displacement in the fragment shader.
 */

document.addEventListener("DOMContentLoaded", () => {
    initPastDrop();
});

function initPastDrop() {
    // Helper: Clamps a number between min and max
    function clamp(number, min, max) {
        return Math.max(min, Math.min(number, max));
    }

    /**
     * Sketch Class
     * Manages the Three.js scene, camera, and physics loop for a single image container.
     */
    class Sketch {
        constructor(options) {
            this.container = options.dom;
            // Find the image inside the container to use as texture
            this.img = this.container.querySelector("img");
            
            if (!this.img) {
                console.warn("No image found for Past Drop Sketch");
                return;
            }

            // Scene Setup
            this.scene = new THREE.Scene();
            this.width = this.container.offsetWidth;
            this.height = this.container.offsetHeight;
            
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(this.width, this.height);
            this.renderer.setClearColor(0xeeeeee, 0); // Transparent background
            this.renderer.physicallyCorrectLights = true;
            this.renderer.outputEncoding = THREE.sRGBEncoding;

            // Fade in canvas once ready
            this.renderer.domElement.style.opacity = "0";
            this.renderer.domElement.style.transition = "opacity 1s ease-out";

            this.container.appendChild(this.renderer.domElement);

            // Camera Setup
            this.camera = new THREE.OrthographicCamera(
                this.width / -2,
                this.width / 2,
                this.height / 2,
                this.height / -2,
                -1000,
                1000
            );
            this.camera.position.set(0, 0, 2);

            // State & Settings
            this.time = 0;
            this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 };
            this.isPlaying = true;

            this.settings = {
                grid: 50,          // Resolution of the physics grid
                mouse: 0.14,       // Mouse influence radius
                strength: 1,       // Strength of the distortion
                relaxation: 0.9,   // How fast the liquid settles (0.9 = slow, 0.5 = fast)
            };

            // Initialization
            this.addObjects();
            this.resize();
            this.setupResize();
            this.mouseEvents();

            // Reveal canvas
            requestAnimationFrame(() => {
                this.renderer.domElement.style.opacity = "1";
            });
        }

        setupResize() {
            window.addEventListener("resize", this.resize.bind(this));
        }

        resize() {
            this.width = this.container.offsetWidth;
            this.height = this.container.offsetHeight;
            this.renderer.setSize(this.width, this.height);
            
            // Update Orthographic Camera
            this.camera.left = this.width / -2;
            this.camera.right = this.width / 2;
            this.camera.top = this.height / 2;
            this.camera.bottom = this.height / -2;
            this.camera.updateProjectionMatrix();

            if (this.plane) {
                this.plane.scale.set(this.width, this.height, 1);
            }
            this.regenerateGrid();
        }

        /**
         * Creates the DataTexture used for physics simulation.
         * Each pixel in this invisible texture holds velocity data.
         */
        regenerateGrid() {
            this.size = this.settings.grid;
            const size = this.size * this.size;
            const data = new Float32Array(3 * size);

            for (let i = 0; i < size; i++) {
                const stride = i * 3;
                data[stride] = Math.random() * 255 - 125;
                data[stride + 1] = Math.random() * 255 - 125;
                data[stride + 2] = 0;
            }

            this.texture = new THREE.DataTexture(
                data,
                this.size,
                this.size,
                THREE.RGBFormat,
                THREE.FloatType
            );
            this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter;

            if (this.material) {
                this.material.uniforms.uDataTexture.value = this.texture;
                this.material.uniforms.uDataTexture.value.needsUpdate = true;
            }
        }

        addObjects() {
            this.regenerateGrid();

            const loader = new THREE.TextureLoader();
            
            // Load the image from the DOM
            loader.load(this.img.src, (texture) => {
                texture.needsUpdate = true;

                this.material = new THREE.ShaderMaterial({
                    extensions: {
                        derivatives: "#extension GL_OES_standard_derivatives : enable",
                    },
                    side: THREE.DoubleSide,
                    uniforms: {
                        time: { value: 0 },
                        resolution: {
                            value: new THREE.Vector4(this.width, this.height, 1, 1),
                        },
                        uTexture: { value: texture },
                        uDataTexture: { value: this.texture },
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D uDataTexture;
                        uniform sampler2D uTexture;
                        uniform vec4 resolution;
                        varying vec2 vUv;
                        void main() {
                            vec2 newUV = (vUv - vec2(0.5)) * resolution.zw + vec2(0.5);
                            vec4 offset = texture2D(uDataTexture, vUv);
                            // Apply distortion to UV based on the DataTexture (offset)
                            gl_FragColor = texture2D(uTexture, newUV - 0.02 * offset.rg);
                        }
                    `,
                });

                this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
                this.plane = new THREE.Mesh(this.geometry, this.material);
                this.plane.scale.set(this.width, this.height, 1);
                this.scene.add(this.plane);
                
                this.render();
            });
        }

        /**
         * Physics Engine Loop
         * Updates the DataTexture based on mouse interaction.
         */
        updateDataTexture() {
            const data = this.texture.image.data;
            
            // 1. Relaxation: Gradually reduce force over time
            for (let i = 0; i < data.length; i += 3) {
                data[i] *= this.settings.relaxation;
                data[i + 1] *= this.settings.relaxation;
            }

            // 2. Mouse Interaction
            const gridMouseX = this.size * this.mouse.x;
            const gridMouseY = this.size * this.mouse.y;
            const maxDist = this.size * this.settings.mouse;
            const aspect = this.height / this.width;

            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    const distance = (gridMouseX - i) ** 2 / aspect + (gridMouseY - j) ** 2;
                    const maxDistSq = maxDist ** 2;

                    if (distance < maxDistSq) {
                        const index = 3 * (i + this.size * j);
                        const power = maxDist / Math.sqrt(distance);
                        const clampedPower = clamp(power, 0, 10);
                        
                        // Apply force based on mouse velocity
                        data[index] += this.settings.strength * 100 * this.mouse.vX * clampedPower;
                        data[index + 1] -= this.settings.strength * 100 * this.mouse.vY * clampedPower;
                    }
                }
            }

            this.mouse.vX *= 0.9;
            this.mouse.vY *= 0.9;
            this.texture.needsUpdate = true;
        }

        mouseEvents() {
            window.addEventListener("mousemove", (e) => {
                const rect = this.container.getBoundingClientRect();
                // Check if mouse is near container to save performance
                if (
                    e.clientX >= rect.left && 
                    e.clientX <= rect.right && 
                    e.clientY >= rect.top && 
                    e.clientY <= rect.bottom
                ) {
                    this.mouse.x = (e.clientX - rect.left) / this.width;
                    this.mouse.y = 1 - (e.clientY - rect.top) / this.height;
                    this.mouse.vX = this.mouse.x - this.mouse.prevX;
                    this.mouse.vY = this.mouse.y - this.mouse.prevY;
                    this.mouse.prevX = this.mouse.x;
                    this.mouse.prevY = this.mouse.y;
                }
            });
        }

        render() {
            if (!this.isPlaying) return;
            this.time += 0.05;
            
            // Physics update
            if (this.material && this.texture) {
                this.updateDataTexture();
                this.material.uniforms.time.value = this.time;
            }
            
            requestAnimationFrame(this.render.bind(this));
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Initialize Intersection Observer to load Sketches only when visible
    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    new Sketch({ dom: entry.target });
                    obs.unobserve(entry.target);
                }
            });
        },
        {
            rootMargin: "0px 0px 50% 0px", // Preload slightly before view
            threshold: 0.1,
        }
    );

    // Attach observer to specific ID containers
    const containers = [
        document.getElementById("canvasContainer"),
        document.getElementById("canvasContainerSecond"),
        document.getElementById("canvasContainerThird")
    ];

    containers.forEach((container) => {
        if (container) observer.observe(container);
    });
}