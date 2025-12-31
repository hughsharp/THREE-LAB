import { getSpriteInfo } from './spriteMapping.js';

export class Tooltip {
    constructor() {
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
        this.hideTimer = null;
    }

    _getPointInfo(points, material, idx) {
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

        const isActive = 1.0 * isBuzzPhase;

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
        raycaster.params.Points.threshold = 0.5;

        // Ensure raycaster is updated with current camera/mouse (passed from main loop usually, but confirming here logic relies on main update to set it?)
        // Actually points.js does `this.raycaster.setFromCamera(this.smoothMouse, this.camera);` RIGHT BEFORE this.
        // So we assume raycaster is ready.

        const pointIntersects = raycaster.intersectObject(points);
        if (pointIntersects.length > 0) {
            // Clear any pending hide timer if we hit a point
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
            const idx = pointIntersects[0].index;
            const info = this._getPointInfo(points, material, idx);

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

                this.tooltip.style.background = bg;
                this.tooltip.style.color = fg;
                this.tooltip.style.border = border;

                this.tooltip.innerHTML = `
                        <div style="margin-bottom:4px; font-weight:700; font-size:15px;">${info.name}</div>
                        <div style="margin-bottom:8px; font-size:11px; color:${iconColor}; text-transform:uppercase; letter-spacing:0.5px;">${info.icon || ''}</div>
                        <div style="font-size:13px; color:${descColor}; line-height:1.4;">${info.description}</div>
                    `;
                this.tooltip.style.display = 'block';

                this.lastTooltipRefString = currentRefString;
            }

            // Smart Positioning (Responsive)
            const x = rawMouse.x;
            const y = rawMouse.y;
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            // Horizontal
            if (x > winW * 0.6) {
                this.tooltip.style.left = 'auto';
                this.tooltip.style.right = (winW - x + 20) + 'px';
            } else {
                this.tooltip.style.right = 'auto';
                this.tooltip.style.left = (x + 20) + 'px';
            }

            // Vertical
            if (y > winH * 0.7) {
                this.tooltip.style.top = 'auto';
                this.tooltip.style.bottom = (winH - y + 20) + 'px';
            } else {
                this.tooltip.style.bottom = 'auto';
                this.tooltip.style.top = (y + 20) + 'px';
            }

        } else {
            // Instead of hiding immediately, set a debounce timer
            if (this.lastHoveredIndex !== -1 && !this.hideTimer) {
                this.hideTimer = setTimeout(() => {
                    this.hide();
                }, 200); // 200ms delay to prevent flicker
            }
        }
        raycaster.params.Points.threshold = currentThreshold;
    }

    hide() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        this.tooltip.style.display = 'none';
        this.lastHoveredIndex = -1;
        this.lastTooltipRefString = null;
    }
}
