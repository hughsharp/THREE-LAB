import {
	AdditiveBlending,
	Color,
	HalfFloatType,
	MeshBasicMaterial,
	ShaderMaterial,
	UniformsUtils,
	Vector2,
	Vector3,
	WebGLRenderTarget
} from 'three';
import { Pass, FullScreenQuad } from './Pass.js';
import { CopyShader } from '../shaders/CopyShader.js';
import { LuminosityHighPassShader } from '../shaders/LuminosityHighPassShader.js';

/**
 * This pass is inspired by the bloom pass of Unreal Engine. It creates a
 * mip map chain of bloom textures and blurs them with different radii. Because
 * of the weighted combination of mips, and because larger blurs are done on
 * higher mips, this effect provides good quality and performance.
 *
 * When using this pass, tone mapping must be enabled in the renderer settings.
 *
 * Reference:
 * - [Bloom in Unreal Engine]{@link https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/}
 *
 * ```js
 * const resolution = new THREE.Vector2( window.innerWidth, window.innerHeight );
 * const bloomPass = new UnrealBloomPass( resolution, 1.5, 0.4, 0.85 );
 * composer.addPass( bloomPass );
 * ```
 *
 * @augments Pass
 * @three_import import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
 */
class UnrealBloomPass extends Pass {

	/**
	 * Constructs a new Unreal Bloom pass.
	 *
	 * @param {Vector2} [resolution] - The effect's resolution.
	 * @param {number} [strength=1] - The Bloom strength.
	 * @param {number} radius - The Bloom radius.
	 * @param {number} threshold - The luminance threshold limits which bright areas contribute to the Bloom effect.
	 */
	constructor( resolution, strength = 1, radius, threshold, nMips = 5,resolutionScale = 1, enableHelper = false ) {

		super();

		/**
		 * The Bloom strength.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.strength = strength;

		/**
		 * The Bloom radius.
		 *
		 * @type {number}
		 */
		this.radius = radius;

		/**
		 * The luminance threshold limits which bright areas contribute to the Bloom effect.
		 *
		 * @type {number}
		 */
		this.threshold = threshold;

		/**
		 * The effect's resolution.
		 *
		 * @type {Vector2}
		 * @default (256,256)
		 */
		this.resolution = ( resolution !== undefined ) ? new Vector2( resolution.x, resolution.y ) : new Vector2( 256, 256 );

		/**
		 * The effect's clear color
		 *
		 * @type {Color}
		 * @default (0,0,0)
		 */
		this.clearColor = new Color( 0, 0, 0 );

		/**
		 * Overwritten to disable the swap.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.needsSwap = false;
		this.resolutionScale = resolutionScale
		// internals

		// render targets
		this.renderTargetsHorizontal = [];
		this.renderTargetsVertical = [];
		this.nMips = nMips;
		let resx = Math.round( this.resolution.x * resolutionScale / 2 );
		let resy = Math.round( this.resolution.y * resolutionScale / 2 );

		this.renderTargetBright = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } );
		this.renderTargetBright.texture.name = 'UnrealBloomPass.bright';
		this.renderTargetBright.texture.generateMipmaps = false;

		for ( let i = 0; i < this.nMips; i ++ ) {

			const renderTargetHorizontal = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } );

			renderTargetHorizontal.texture.name = 'UnrealBloomPass.h' + i;
			renderTargetHorizontal.texture.generateMipmaps = false;

			this.renderTargetsHorizontal.push( renderTargetHorizontal );

			const renderTargetVertical = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } );

			renderTargetVertical.texture.name = 'UnrealBloomPass.v' + i;
			renderTargetVertical.texture.generateMipmaps = false;

			this.renderTargetsVertical.push( renderTargetVertical );

			resx = Math.round( resx / 2 );

			resy = Math.round( resy / 2 );

		}

		// luminosity high pass material

		const highPassShader = LuminosityHighPassShader;
		this.highPassUniforms = UniformsUtils.clone( highPassShader.uniforms );

		this.highPassUniforms[ 'luminosityThreshold' ].value = threshold;
		this.highPassUniforms[ 'smoothWidth' ].value = 0.01;

		this.materialHighPassFilter = new ShaderMaterial( {
			uniforms: this.highPassUniforms,
			vertexShader: highPassShader.vertexShader,
			fragmentShader: highPassShader.fragmentShader
		} );

		// gaussian blur materials

		this.separableBlurMaterials = [];
		const kernelSizeArray = [ 3, 5, 7, 9, 11 ];
		resx = Math.round( this.resolution.x / 2 );
		resy = Math.round( this.resolution.y / 2 );

		for ( let i = 0; i < this.nMips; i ++ ) {

			this.separableBlurMaterials.push( this._getSeparableBlurMaterial( kernelSizeArray[ i ] ) );

			this.separableBlurMaterials[ i ].uniforms[ 'invSize' ].value = new Vector2( 1 / resx, 1 / resy );

			resx = Math.round( resx / 2 );

			resy = Math.round( resy / 2 );

		}

		// composite material

		this.compositeMaterial = this._getCompositeMaterial( this.nMips );

		// this.compositeMaterial.uniforms[ 'blurTexture1' ].value = this.renderTargetsVertical[ 0 ].texture;
		// this.compositeMaterial.uniforms[ 'blurTexture2' ].value = this.renderTargetsVertical[ 1 ].texture;
		// this.compositeMaterial.uniforms[ 'blurTexture3' ].value = this.renderTargetsVertical[ 2 ].texture;
		// this.compositeMaterial.uniforms[ 'blurTexture4' ].value = this.renderTargetsVertical[ 3 ].texture;
		// this.compositeMaterial.uniforms[ 'blurTexture5' ].value = this.renderTargetsVertical[ 4 ].texture;
		 for(let i = 0; i < this.nMips; i++) {
        const uniformName = `blurTexture${i + 1}`;
        this.compositeMaterial.uniforms[uniformName].value = this.renderTargetsVertical[i].texture;
    }
		this.compositeMaterial.uniforms[ 'bloomStrength' ].value = strength;
		this.compositeMaterial.uniforms[ 'bloomRadius' ].value = 0.1;

		const bloomFactors = [ 1.0, 0.8, 0.6, 0.4, 0.2 ];
		this.compositeMaterial.uniforms[ 'bloomFactors' ].value = bloomFactors;
		this.bloomTintColors = [ new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ) ];
		this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors;

		// blend material

		this.copyUniforms = UniformsUtils.clone( CopyShader.uniforms );

		this.blendMaterial = new ShaderMaterial( {
			uniforms: this.copyUniforms,
			vertexShader: CopyShader.vertexShader,
			fragmentShader: CopyShader.fragmentShader,
			blending: AdditiveBlending,
			depthTest: false,
			depthWrite: false,
			transparent: true
		} );

		this._oldClearColor = new Color();
		this._oldClearAlpha = 1;

		this._basic = new MeshBasicMaterial();

		this._fsQuad = new FullScreenQuad( null );

		if (enableHelper) {
            this._createGui();
        }

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever the pass is no longer used in your app.
	 */
	dispose() {

		for ( let i = 0; i < this.renderTargetsHorizontal.length; i ++ ) {

			this.renderTargetsHorizontal[ i ].dispose();

		}

		for ( let i = 0; i < this.renderTargetsVertical.length; i ++ ) {

			this.renderTargetsVertical[ i ].dispose();

		}

		this.renderTargetBright.dispose();

		//

		for ( let i = 0; i < this.separableBlurMaterials.length; i ++ ) {

			this.separableBlurMaterials[ i ].dispose();

		}

		this.compositeMaterial.dispose();
		this.blendMaterial.dispose();
		this._basic.dispose();

		//

		this._fsQuad.dispose();

	}

	/**
	 * Sets the size of the pass.
	 *
	 * @param {number} width - The width to set.
	 * @param {number} height - The height to set.
	 */
	setSize( width, height ) {

		let resx = Math.round( width * this.resolutionScale / 2 );
		let resy = Math.round( height * this.resolutionScale / 2 );

		this.renderTargetBright.setSize( resx, resy );

		for ( let i = 0; i < this.nMips; i ++ ) {

			this.renderTargetsHorizontal[ i ].setSize( resx, resy );
			this.renderTargetsVertical[ i ].setSize( resx, resy );

			this.separableBlurMaterials[ i ].uniforms[ 'invSize' ].value = new Vector2( 1 / resx, 1 / resy );

			resx = Math.round( resx / 2 );
			resy = Math.round( resy / 2 );

		}

	}

	/**
	 * Performs the Bloom pass.
	 *
	 * @param {WebGLRenderer} renderer - The renderer.
	 * @param {WebGLRenderTarget} writeBuffer - The write buffer. This buffer is intended as the rendering
	 * destination for the pass.
	 * @param {WebGLRenderTarget} readBuffer - The read buffer. The pass can access the result from the
	 * previous pass from this buffer.
	 * @param {number} deltaTime - The delta time in seconds.
	 * @param {boolean} maskActive - Whether masking is active or not.
	 */
	render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

		renderer.getClearColor( this._oldClearColor );
		this._oldClearAlpha = renderer.getClearAlpha();
		const oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		renderer.setClearColor( this.clearColor, 0 );

		if ( maskActive ) renderer.state.buffers.stencil.setTest( false );

		// Render input to screen

		if ( this.renderToScreen ) {

			this._fsQuad.material = this._basic;
			this._basic.map = readBuffer.texture;

			renderer.setRenderTarget( null );
			renderer.clear();
			this._fsQuad.render( renderer );

		}

		// 1. Extract Bright Areas

		this.highPassUniforms[ 'tDiffuse' ].value = readBuffer.texture;
		this.highPassUniforms[ 'luminosityThreshold' ].value = this.threshold;
		this._fsQuad.material = this.materialHighPassFilter;

		renderer.setRenderTarget( this.renderTargetBright );
		renderer.clear();
		this._fsQuad.render( renderer );

		// 2. Blur All the mips progressively

		let inputRenderTarget = this.renderTargetBright;

		for ( let i = 0; i < this.nMips; i ++ ) {

			this._fsQuad.material = this.separableBlurMaterials[ i ];

			this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = inputRenderTarget.texture;
			this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = UnrealBloomPass.BlurDirectionX;
			renderer.setRenderTarget( this.renderTargetsHorizontal[ i ] );
			renderer.clear();
			this._fsQuad.render( renderer );

			this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = this.renderTargetsHorizontal[ i ].texture;
			this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = UnrealBloomPass.BlurDirectionY;
			renderer.setRenderTarget( this.renderTargetsVertical[ i ] );
			renderer.clear();
			this._fsQuad.render( renderer );

			inputRenderTarget = this.renderTargetsVertical[ i ];

		}

		// Composite All the mips

		this._fsQuad.material = this.compositeMaterial;
		this.compositeMaterial.uniforms[ 'bloomStrength' ].value = this.strength;
		this.compositeMaterial.uniforms[ 'bloomRadius' ].value = this.radius;
		this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors;

		renderer.setRenderTarget( this.renderTargetsHorizontal[ 0 ] );
		renderer.clear();
		this._fsQuad.render( renderer );

		// Blend it additively over the input texture

		this._fsQuad.material = this.blendMaterial;
		this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetsHorizontal[ 0 ].texture;

		if ( maskActive ) renderer.state.buffers.stencil.setTest( true );

		if ( this.renderToScreen ) {

			renderer.setRenderTarget( null );
			this._fsQuad.render( renderer );

		} else {

			renderer.setRenderTarget( readBuffer );
			this._fsQuad.render( renderer );

		}

		// Restore renderer settings

		renderer.setClearColor( this._oldClearColor, this._oldClearAlpha );
		renderer.autoClear = oldAutoClear;

	}

	// internals

	_getSeparableBlurMaterial( kernelRadius ) {

		const coefficients = [];

		for ( let i = 0; i < kernelRadius; i ++ ) {

			coefficients.push( 0.39894 * Math.exp( - 0.5 * i * i / ( kernelRadius * kernelRadius ) ) / kernelRadius );

		}

		return new ShaderMaterial( {

			defines: {
				'KERNEL_RADIUS': kernelRadius
			},

			uniforms: {
				'colorTexture': { value: null },
				'invSize': { value: new Vector2( 0.5, 0.5 ) }, // inverse texture size
				'direction': { value: new Vector2( 0.5, 0.5 ) },
				'gaussianCoefficients': { value: coefficients } // precomputed Gaussian coefficients
			},

			vertexShader:
				`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,

			fragmentShader:
				`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`
		} );

	}

_getCompositeMaterial( nMips ) {
    // ✨ Create the uniforms object dynamically
    const uniforms = {
        'bloomStrength': { value: 1.0 },
        'bloomRadius': { value: 0.0 },
        'bloomFactors': { value: null },
        'bloomTintColors': { value: null },
		'originalTexture': { value: null } 
    };

    let uniformDeclarations = '';
    for ( let i = 1; i <= nMips; i ++ ) {
        const uniformName = `blurTexture${i}`;
        uniforms[ uniformName ] = { value: null }; // Add uniform definition
        uniformDeclarations += `uniform sampler2D ${uniformName};\n`;
    }

    // --- The rest of the function remains the same ---
    
    let fragmentShader = `
        varying vec2 vUv;
        uniform float bloomStrength;
        uniform float bloomRadius;
        uniform float bloomFactors[NUM_MIPS];
        uniform vec3 bloomTintColors[NUM_MIPS];
		uniform sampler2D originalTexture;
    `;

    fragmentShader += uniformDeclarations;

    fragmentShader += `
        float lerpBloomFactor(const in float factor) {
            float mirrorFactor = 1.2 - factor;
            return mix(factor, mirrorFactor, bloomRadius);
        }

        void main() {
            vec4 color = vec4(0.0);
    `;
    
    let mainLoop = '';
    for ( let i = 0; i < nMips; i ++ ) {
        mainLoop += `
            color += lerpBloomFactor(bloomFactors[${i}]) * vec4(bloomTintColors[${i}], 1.0) * texture2D(blurTexture${i + 1}, vUv);
        `;
    }

    fragmentShader += mainLoop;
    // fragmentShader += `
    //         gl_FragColor = bloomStrength * color;
    //     }
    // `;
    fragmentShader += `
            vec4 originalColor = texture2D(originalTexture, vUv);
            gl_FragColor = originalColor + (bloomStrength * color); // ✨ 3. Perform the final blend
        }
    `;
    return new ShaderMaterial( {
        defines: { 'NUM_MIPS': nMips },
        uniforms: uniforms, // Use the dynamically created uniforms object
        vertexShader:
            `varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`,
        fragmentShader: fragmentShader,
    } );
}
    // --- GUI HELPER METHODS ---

   _createGui() {
        this.guiPanel = document.createElement('div');
        Object.assign(this.guiPanel.style, {
            position: 'fixed', right: '10px', top: '10px', background: 'white', color: 'black',
            padding: '0', borderRadius: '5px', fontFamily: 'monospace', fontSize: '11px', zIndex: '1001',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block', minWidth: '280px', userSelect: 'none'
        });

        const head = document.createElement('div');
        Object.assign(head.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold',
            textTransform: 'uppercase', background: '#eee', padding: '6px 10px', borderRadius: '5px 5px 0 0',
            cursor: 'pointer', letterSpacing: '1px'
        });

        const title = document.createElement('span');
        title.textContent = 'Bloom Pass Controls';
        const chevron = document.createElement('span');
        chevron.innerHTML = '&#x25BC;';
        head.appendChild(title);
        head.appendChild(chevron);

        const body = document.createElement('div');
        Object.assign(body.style, {
            padding: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px',
            transition: 'max-height 0.2s', overflow: 'hidden'
        });

        // ✨ Add controls with wider, more practical ranges
        body.appendChild(this._createGuiControl('Strength', 'strength', { min: 0, max: 20, step: 0.1 }));
        body.appendChild(this._createGuiControl('Radius', 'radius', { min: 0, max: 5, step: 0.05 }));
        body.appendChild(this._createGuiControl('Threshold', 'threshold', { min: 0, max: 2, step: 0.01 }));

        this.guiPanel.appendChild(head);
        this.guiPanel.appendChild(body);
        document.body.appendChild(this.guiPanel);

        // Event listeners for dragging and collapsing
        let isDragging = false, dragMoved = false, dragOffsetX = 0, dragOffsetY = 0;
        head.onmousedown = (e) => {
            isDragging = true; dragMoved = false; const rect = this.guiPanel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top;
            Object.assign(this.guiPanel.style, { position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`, right: '', bottom: '' });
            document.body.style.userSelect = 'none';
        };
        document.onmousemove = (e) => {
            if (!isDragging) return;
            this.guiPanel.style.left = `${e.clientX - dragOffsetX}px`;
            this.guiPanel.style.top = `${e.clientY - dragOffsetY}px`;
            dragMoved = true;
        };
        document.onmouseup = () => {
            if (isDragging) { setTimeout(() => { dragMoved = false; }, 0); isDragging = false; document.body.style.userSelect = ''; }
        };

        let collapsed = false;
        head.onclick = () => {
            if (dragMoved) return;
            collapsed = !collapsed;
            body.style.display = collapsed ? 'none' : 'flex';
            chevron.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;';
        };
    }

_createGuiControl(labelText, property, options = {}) {
    const row = document.createElement('div');
    // Adjust the grid layout to accommodate the new input field
    Object.assign(row.style, { display: 'grid', gridTemplateColumns: '100px 1fr 60px 60px', alignItems: 'center', gap: '8px' });

    const label = document.createElement('label');
    label.textContent = labelText;
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = options.min ?? 0;
    slider.max = options.max ?? 100;
    slider.step = options.step ?? 0.01;
    slider.value = this[property];

    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.min = slider.min;
    numberInput.max = slider.max;
    numberInput.step = slider.step;
    numberInput.value = parseFloat(this[property]).toFixed(2);
    Object.assign(numberInput.style, {
        width: '100%',
        textAlign: 'right',
        fontFamily: 'monospace',
        border: '1px solid #ccc',
        borderRadius: '3px',
        padding: '4px'
    });

    // New input for the top range (max value)
    const topRangeInput = document.createElement('input');
    topRangeInput.type = 'number';
    topRangeInput.value = options.max ?? 100;
    topRangeInput.step = slider.step; // Use the same step for consistency
    Object.assign(topRangeInput.style, {
        width: '100%',
        textAlign: 'right',
        fontFamily: 'monospace',
        border: '1px solid #ccc',
        borderRadius: '3px',
        padding: '4px'
    });

    // Sync slider -> number input
    slider.oninput = () => {
        const value = parseFloat(slider.value);
        this[property] = value;
        numberInput.value = value.toFixed(2);
    };

    // Sync number input -> slider
    numberInput.onchange = () => {
        let value = parseFloat(numberInput.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);

        if (value < min) value = min;
        if (value > max) value = max;
        
        this[property] = value;
        slider.value = value;
        numberInput.value = value.toFixed(2);
    };

    // Handle changes to the new top range input
    topRangeInput.onchange = () => {
        let newMax = parseFloat(topRangeInput.value);
        if (isNaN(newMax)) {
            newMax = options.max ?? 100;
            topRangeInput.value = newMax;
        }

        slider.max = newMax;
        numberInput.max = newMax;

        // Ensure the current value is within the new range
        let currentValue = parseFloat(numberInput.value);
        if (currentValue > newMax) {
            this[property] = newMax;
            slider.value = newMax;
            numberInput.value = newMax.toFixed(2);
        }
    };
    
    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(numberInput);
    row.appendChild(topRangeInput); // Add the new top range input to the row
    return row;
}
}

UnrealBloomPass.BlurDirectionX = new Vector2( 1.0, 0.0 );
UnrealBloomPass.BlurDirectionY = new Vector2( 0.0, 1.0 );

export { UnrealBloomPass };
