import * as THREE from 'three';
import { getSpriteInfo } from './spriteMapping.js';
import { resources } from '../resources/loadResources.js';

export class Tooltip {
    constructor(scene) { // Added scene parameter
        this.tooltip = document.createElement('div');
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.padding = '12px 16px';
        this.tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
        this.tooltip.style.color = '#fff';
        this.tooltip.style.borderRadius = '8px';
        this.tooltip.style.fontFamily = "'Inter', sans-serif";
        this.tooltip.style.fontSize = '14px';
        this.tooltip.style.lineHeight = '1.5';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.display = 'none';
        this.tooltip.style.zIndex = '1000';
        this.tooltip.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        this.tooltip.style.whiteSpace = 'normal';
        this.tooltip.style.maxWidth = '280px';
        this.tooltip.style.backdropFilter = 'blur(4px)';
        this.tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        this.tooltip.style.transition = 'opacity 0.2s, transform 0.2s';
        document.body.appendChild(this.tooltip);

        this.lastHoveredIndex = -1;
        this.lastTooltipRefString = null;

        // --- CSS 3D Icon Setup ---
        this.iconSize = 32;

        // Internal DOM state for rotation
        this.rotX = 0;
        this.rotY = 0;

        this.isAnimating = false;
        this._animateIcon = this._animateIcon.bind(this);
    }

    _createCubeDOM() {
        const container = document.createElement('div');
        container.style.width = this.iconSize + 'px';
        container.style.height = this.iconSize + 'px';
        container.style.position = 'relative';
        container.style.perspective = '800px';

        const cube = document.createElement('div');
        cube.style.width = '100%';
        cube.style.height = '100%';
        cube.style.position = 'absolute';
        cube.style.transformStyle = 'preserve-3d';
        this.cubeDOM = cube;

        const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
        const transformMap = {
            'front': `rotateY(0deg) translateZ(${this.iconSize / 2}px)`,
            'back': `rotateY(180deg) translateZ(${this.iconSize / 2}px)`,
            'right': `rotateY(90deg) translateZ(${this.iconSize / 2}px)`,
            'left': `rotateY(-90deg) translateZ(${this.iconSize / 2}px)`,
            'top': `rotateX(90deg) translateZ(${this.iconSize / 2}px)`,
            'bottom': `rotateX(-90deg) translateZ(${this.iconSize / 2}px)`
        };

        this.faceElements = [];

        faces.forEach(face => {
            const el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.width = this.iconSize + 'px';
            el.style.height = this.iconSize + 'px';
            el.style.backfaceVisibility = 'hidden'; // Optional: or 'visible' if transparent
            // Apply Sprite Texture
            if (resources.spriteSheetIcon) {
                el.style.backgroundImage = `url('${resources.spriteSheetIcon.image.src}')`;
                el.style.backgroundSize = '800% 400%'; // 8 cols, 4 rows
                el.style.imageRendering = 'pixelated'; // Keep crisp
            }
            el.style.transform = transformMap[face];

            // Border to define edges slightly?
            // el.style.border = '1px solid rgba(255,255,255,0.1)'; 

            cube.appendChild(el);
            this.faceElements.push(el);
        });

        container.appendChild(cube);
        return container;
    }

    _animateIcon() {
        if (!this.tooltip.style.display || this.tooltip.style.display === 'none') {
            this.isAnimating = false;
            return;
        }

        requestAnimationFrame(this._animateIcon);

        this.rotX += 0.02; // Rads
        this.rotY += 0.03;

        // Convert Rads to Degs for CSS
        const degX = this.rotX * (180 / Math.PI);
        const degY = this.rotY * (180 / Math.PI);

        if (this.cubeDOM) {
            this.cubeDOM.style.transform = `rotateX(${degX}deg) rotateY(${degY}deg)`;
        }
    }

    // Removed renderIcon(renderer) - Not needed for CSS

    _getPointInfo(points, material, idx, camera, rawMouse) {
        if (!points.geometry.attributes.aStableRandom) return null;

        const rnd = points.geometry.attributes.aStableRandom.array[idx];

        // Get Uniforms
        const time = material.uniforms.iTime.value;
        const progress = material.uniforms.uProgress.value;
        const chaos = material.uniforms.uIsChaos.value;

        // Calculate vIsGrid (Approx)
        let startVal = 0;
        if (points.geometry.attributes.aStartSizeIsGrid) startVal = points.geometry.attributes.aStartSizeIsGrid.array[idx * 2 + 1];

        let targetVal = 0;
        if (points.geometry.attributes.aTargetSizeIsGrid) targetVal = points.geometry.attributes.aTargetSizeIsGrid.array[idx * 2 + 1];

        const vIsGridVal = startVal * (1.0 - progress) + targetVal * progress;
        const isGrid = vIsGridVal > 0.5 ? 1.0 : 0.0;

        // --- Calculate Screen Distance (Shader Simulation) ---
        // We must replicate the vertex shader to know WHERE the point visually is
        // to determine if it is "Locked" by the hover effect.

        // 1. Get Base Position
        const positionAttribute = points.geometry.attributes.position;
        const pt = new THREE.Vector3();
        pt.fromBufferAttribute(positionAttribute, idx);

        // 2. Apply Model Transforms (If Model Point)
        // Shader: if (isTargetModel > 0.5) { apply scale, rot, pos }
        // Note: isGrid in JS is 1.0 for Grid. So isModel is (1.0 - isGrid).
        const isModel = 1.0 - isGrid;

        if (isModel > 0.5) {
            // Uniforms
            const uModelScale = material.uniforms.uModelScale ? material.uniforms.uModelScale.value : 1.0;
            const uModelPosition = material.uniforms.uModelPosition ? material.uniforms.uModelPosition.value : new THREE.Vector3(0, 0, 0);
            const uModelRotation = material.uniforms.uModelRotation ? material.uniforms.uModelRotation.value : new THREE.Vector3(0, 0, 0);

            // Scale
            pt.multiplyScalar(uModelScale);

            // Rotate (Z * Y * X)
            const euler = new THREE.Euler(uModelRotation.x, uModelRotation.y, uModelRotation.z, 'XYZ');
            // Shader uses custom matrix calc Z*Y*X, Three.js Euler 'XYZ' applies X then Y then Z (intrinsic) or Z then Y then X (extrinsic)?
            // Three.js applyEuler with Default XYZ: Applies RotX, then RotY, then RotZ.
            // Shader: rotateZ * rotateY * rotateX.
            // This matches Three.js 'ZYX' order??
            // Verify: Matrix = RotZ * RotY * RotX. Vector * Matrix.
            // This means we apply X first, then Y, then Z.
            // Three.js default is XYZ.
            // Let's assume XYZ for now or use manually constructed matrix if precise match needed.
            // For simple Y rotation it matters less.
            pt.applyEuler(euler);

            // Translate
            pt.add(uModelPosition);
        }

        // 3. Project to Clip Space
        pt.applyMatrix4(points.matrixWorld); // Model -> World
        pt.applyMatrix4(camera.matrixWorldInverse); // World -> View
        pt.applyMatrix4(camera.projectionMatrix); // View -> Clip

        // 4. Apply Screen Offset (Shader Logic)
        // Shader: gl_Position.xy += uModelScreenOffset * gl_Position.w;
        const uModelScreenOffset = material.uniforms.uModelScreenOffset ? material.uniforms.uModelScreenOffset.value : new THREE.Vector2(0, 0);
        pt.x += uModelScreenOffset.x * pt.w;
        pt.y += uModelScreenOffset.y * pt.w;

        // 5. Convert to Screen Pixels
        const ndc = new THREE.Vector2(pt.x / pt.w, pt.y / pt.w);
        const screenX = (ndc.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (ndc.y * 0.5 + 0.5) * window.innerHeight;

        // 6. Calculate Distance
        // Note: rawMouse.y in Three.js usually is Top-Left or Bottom-Left?
        // rawMouse passed from points.js is clientX, clientY (Top-Left origin).
        // screenY above: ndc.y=1 is Top? No, WebGL Y=1 is Top. screenY calc assumes bottom-left 0?
        // (ndc.y * 0.5 + 0.5). If Y=1 -> 1.0 * H.
        // DOM Y=0 is Top.
        // So we need to flip Y comparison.
        const glScreenY = screenY;
        const mouseScreenY = window.innerHeight - rawMouse.y; // Convert DOM mouse to GL coords
        const dx = screenX - rawMouse.x;
        const dy = glScreenY - mouseScreenY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // --- Logic Checks ---
        // Cycle Logic from Shader
        const isOtherState = 1.0 - chaos;
        const cycleLen = (isGrid * isOtherState) > 0.5 ? 10.0 : 6.0;

        const totalTime = time + rnd * 10.0;
        const cycleCount = Math.floor(totalTime / cycleLen);
        const baseOffset = cycleCount * 13.0; // Prime number jump

        // Buzz Phase
        const buzzDuration = 0.75;
        const cycle = totalTime % cycleLen;
        const isBuzzPhase = cycle > (cycleLen - buzzDuration) ? 1.0 : 0.0;

        // --- LOCK LOGIC ---
        // Shader:
        // float isInsideOuter = 1.0 - step(uHoverRadius, dist);
        // float isOutsideInner = step(minInteractionDist, dist);
        // float isHover = isInsideOuter * isOutsideInner;
        // float isActive = isHover * isBuzzPhase;

        const uHoverRadius = material.uniforms.uHoverRadius ? material.uniforms.uHoverRadius.value : 200.0;
        const minInteractionDist = 5.0; // Hardcoded in Shader

        const isInsideOuter = dist < uHoverRadius ? 1.0 : 0.0;
        const isOutsideInner = dist > minInteractionDist ? 1.0 : 0.0;
        const isHover = isInsideOuter * isOutsideInner;

        const isActive = isHover * isBuzzPhase;

        // Stepped Time (Flicker)
        const flickSpeed = 13.33;
        const steppedTime = Math.floor((time * flickSpeed) + rnd) * isActive;

        // Final Index
        const finalIndexRaw = (rnd * 32.0) + steppedTime + baseOffset;
        const totalFrames = 32;
        const finalTexIndex = Math.floor(finalIndexRaw) % totalFrames;

        const cols = 8;
        const col = finalTexIndex % cols;
        const row = Math.floor(finalTexIndex / cols);

        const sprite = getSpriteInfo(row, col);

        return {
            idx,
            texIndex: finalTexIndex,
            col,
            row,
            rnd,
            icon: sprite.icon,
            name: sprite.name,
            description: sprite.description
        };
    }

    update(raycaster, points, material, smoothMouse, rawMouse, camera) {
        if (!points) return;

        // Raycasting Logic
        const currentThreshold = raycaster.params.Points.threshold;
        raycaster.params.Points.threshold = 1.0;

        // Fix for Offset Raycasting:
        // Because the Shader applies 'uModelScreenOffset' (2D shift),
        // the visual points do NOT match the physics points (geometry).
        // We must inverse-shift the mouse for raycasting to hit the "real" geometry.
        const offset = material.uniforms.uModelScreenOffset ? material.uniforms.uModelScreenOffset.value : new THREE.Vector2(0, 0);

        // Raycaster uses Normalized Device Coordinates (-1 to +1)
        // smoothMouse is already in NDC.
        // uModelScreenOffset is added to NDC in shader.
        // So: VisualPos = GeoPos + Offset.
        // If Mouse hits VisualPos, then Mouse = GeoPos + Offset.
        // So GeoPos = Mouse - Offset.
        const correctedMouse = smoothMouse.clone().sub(offset);

        // Temporarily override raycaster to use corrected mouse
        raycaster.setFromCamera(correctedMouse, camera);

        const pointIntersects = raycaster.intersectObject(points);
        let idx = -1;

        if (pointIntersects.length > 0) {
            idx = pointIntersects[0].index;
        } else if (points.geometry.morphCurrentIndex === 2 && points.parentInstance && points.parentInstance.model) {
            // AREA HOVER CHECK: If we missed individual points but we are in Armature state,
            // check against the hidden proxy mesh for the "area".
            const modelIntersects = raycaster.intersectObject(points.parentInstance.model, true);
            if (modelIntersects.length > 0) {
                idx = points.geometry.lastClosestIndex || 0;
            }
        }

        if (idx !== -1) {
            const info = this._getPointInfo(points, material, idx, camera, rawMouse);

            if (this.lastHoveredIndex !== idx) {
                this.lastHoveredIndex = idx;
            }

            // Dynamic Style
            const isLeft = rawMouse.x < window.innerWidth / 2;
            const side = isLeft ? 'left' : 'right';

            // Track changes using composite key (Index + TextureIndex + Side)
            const currentRefString = `${idx}_${info ? info.texIndex : -1}_${side}`;

            if (this.lastTooltipRefString !== currentRefString && info) {
                const bg = isLeft ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
                const fg = isLeft ? '#fff' : '#000';
                const border = isLeft ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)';
                const descColor = isLeft ? '#bbb' : '#555';
                const iconColor = isLeft ? '#888' : '#999';

                // Restore Styling (No Transparency/Holes)
                this.tooltip.style.background = bg;
                this.tooltip.style.border = border;
                this.tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

                // Calculate UVs for CSS
                const bgX = (info.col / 7) * 100;
                const bgY = (info.row / 3) * 100;

                // Update texture offset on the faces
                if (this.faceElements) {
                    this.faceElements.forEach(el => {
                        el.style.backgroundPosition = `${bgX}% ${bgY}%`;
                        // Handle filter if needed (Invert for left side?)
                        el.style.filter = isLeft ? 'invert(1)' : 'none';
                    });
                }

                this.tooltip.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <div>
                            <div style="font-weight:700; font-size:15px; margin-bottom:4px; color:${fg};">${info.name}</div>
                            <div style="font-size:11px; color:${iconColor}; text-transform:uppercase; letter-spacing:0.5px;">${info.icon || ''}</div>
                        </div>
                        <div id="tooltip-icon-container" style="
                            width: ${this.iconSize}px; 
                            height: ${this.iconSize}px;
                            /* margin-left:12px; */
                        "></div>
                    </div>
                    <div style="font-size:13px; color:${descColor}; line-height:1.4;">${info.description}</div>
                `;

                // Append CSS 3D Cube
                const container = this.tooltip.querySelector('#tooltip-icon-container');
                if (container) {
                    if (!this.cubeDOM) {
                        const cube = this._createCubeDOM();
                        container.appendChild(cube);
                    } else {
                        // Re-append existing (reusing DOM)
                        // Note: cubeDOM is the inner cube. _createCubeDOM returns the wrapper.
                        // We need the wrapper.
                        // Better: just recreate if missing, or store wrapper.
                        const wrapper = this.cubeDOM.parentElement; // container provided by create
                        container.appendChild(wrapper);
                    }
                }

                this.tooltip.style.display = 'block';

                if (!this.isAnimating) {
                    this.isAnimating = true;
                    this._animateIcon();
                }

                this.lastTooltipRefString = currentRefString;
            }

            // Smart Positioning (Responsive)
            const x = rawMouse.x;
            const y = rawMouse.y;
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            if (x > winW * 0.6) {
                this.tooltip.style.left = 'auto';
                this.tooltip.style.right = (winW - x + 20) + 'px';
            } else {
                this.tooltip.style.right = 'auto';
                this.tooltip.style.left = (x + 20) + 'px';
            }

            if (y > winH * 0.7) {
                this.tooltip.style.top = 'auto';
                this.tooltip.style.bottom = (winH - y + 20) + 'px';
            } else {
                this.tooltip.style.bottom = 'auto';
                this.tooltip.style.top = (y + 20) + 'px';
            }

        } else {
            if (this.lastHoveredIndex !== -1) {
                this.hide();
            }
        }
        raycaster.params.Points.threshold = currentThreshold;
    }

    hide() {
        this.tooltip.style.display = 'none';
        this.lastHoveredIndex = -1;
        this.lastTooltipRefString = null;
        this.isAnimating = false; // Stop loop
    }
}
