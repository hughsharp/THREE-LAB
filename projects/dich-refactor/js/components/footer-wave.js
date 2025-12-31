/**
 * DICH™ Footer Wave Animation
 * Generates a canvas-based interactive wave effect.
 * It uses an off-screen canvas to render text ("DICH") and uses pixel brightness
 * to determine the resting position (amplitude) of the lines, creating a hidden text effect.
 */

document.addEventListener("DOMContentLoaded", () => {
    initFooterWave();
});

function initFooterWave() {
    const wrapper = document.querySelector(".footer_hover-effect");
    if (!wrapper) return;

    // Create and append canvas
    const canvas = document.createElement("canvas");
    canvas.id = "line-effect";
    wrapper.appendChild(canvas);

    const mouse = { x: -9999, y: -9999 };
    const linesFooter = [];
    let context = canvas.getContext("2d");

    // Configuration
    let horizontalPadding = 0;
    let verticalPadding = 0;
    
    // Resize Observer to handle window changes
    const resizeCanvas = () => {
        const scaleFactor = window.devicePixelRatio || 1;
        const width = wrapper.offsetWidth;
        const height = wrapper.offsetHeight;
        
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        canvas.width = width * scaleFactor;
        canvas.height = height * scaleFactor;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(scaleFactor, scaleFactor);

        // Recalculate grid points based on new size
        setupGridPoints(width, height);
    };

    /**
     * Sets up the grid of points.
     * Uses a temporary off-screen canvas to render text and map pixel data to line height.
     */
    const setupGridPoints = (width, height) => {
        horizontalPadding = window.innerWidth < 768 ? 0 : width * 0.197;
        verticalPadding = height * 0.197;

        const linesCount = 60;
        const lineHeight = (height - verticalPadding * 2) / linesCount;
        const cellWidth = 5;
        const cols = Math.floor((width - horizontalPadding * 2) / cellWidth);

        // 1. Create off-screen canvas for text mapping
        const typeCanvasWidth = 120;
        const typeCanvasHeight = 50;
        const typeCanvas = document.createElement("canvas");
        const typeContext = typeCanvas.getContext("2d");
        typeCanvas.width = typeCanvasWidth;
        typeCanvas.height = typeCanvasHeight;

        // 2. Draw "DICH" text
        const fontSize = typeCanvasWidth * 0.22;
        typeContext.fillStyle = "black";
        typeContext.fillRect(0, 0, typeCanvasWidth, typeCanvasHeight);
        typeContext.fillStyle = "white";
        // Ensure font is loaded or fallback to sans-serif
        typeContext.font = `${fontSize}px "Drukwide", "Arial Black", sans-serif`;
        typeContext.textBaseline = "middle";
        typeContext.textAlign = "center";
        typeContext.fillText("DICH", typeCanvasWidth / 2, typeCanvasHeight / 2);

        // 3. Get pixel data
        const typeData = typeContext.getImageData(0, 0, typeCanvasWidth, typeCanvasHeight).data;

        // 4. Generate Lines
        linesFooter.length = 0;
        for (let i = 0; i < linesCount; i++) {
            const y = verticalPadding + i * lineHeight;
            const line = [];

            for (let j = 0; j < cols; j++) {
                const x = horizontalPadding + j * cellWidth;

                // Map current grid position to text-canvas pixel
                const typeX = Math.floor((j / cols) * typeCanvasWidth);
                const typeY = Math.floor((i / linesCount) * typeCanvasHeight);
                const index = (typeY * typeCanvasWidth + typeX) * 4;
                
                // Red channel determines brightness (0-255)
                const brightness = typeData[index] || 0;

                // Offset Y based on brightness to create "3D" text shape
                const heightOffset = (brightness / 255) * 20;
                const finalY = y - heightOffset;

                line.push({
                    x,
                    y: finalY,
                    baseX: x,
                    baseY: finalY,
                });
            }
            linesFooter.push(line);
        }
    };

    /**
     * Physics Update
     * Calculates mouse repulsion and spring-back effect.
     */
    const updatePhysics = (mouseX, mouseY, radius = 100, maxSpeed = 10) => {
        linesFooter.forEach((lineFooter) => {
            lineFooter.forEach((point) => {
                const dx = point.x - mouseX;
                const dy = point.y - mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Mouse Repulsion
                if (distance < radius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (radius - distance) / radius;

                    point.x += Math.cos(angle) * force * maxSpeed;
                    point.y += Math.sin(angle) * force * maxSpeed;
                }

                // Spring back to base position
                const springX = (point.baseX - point.x) * 0.1;
                const springY = (point.baseY - point.y) * 0.1;

                point.x += springX;
                point.y += springY;
            });
        });
    };

    /**
     * Render Loop
     */
    const render = () => {
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        context.clearRect(0, 0, width, height);

        // Update Physics
        updatePhysics(mouse.x, mouse.y);

        // Draw Lines
        context.strokeStyle = "#ffdfc4"; // Pastel peach color
        context.lineWidth = 0.5;

        linesFooter.forEach((lineFooter) => {
            context.beginPath();
            context.moveTo(lineFooter[0].x, lineFooter[0].y);

            // Draw smooth curve through points
            for (let i = 1; i < lineFooter.length; i++) {
                const prev = lineFooter[i - 1];
                const current = lineFooter[i];

                const midX = (prev.x + current.x) / 2;
                const midY = (prev.y + current.y) / 2;

                context.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
            context.stroke();
        });

        requestAnimationFrame(render);
    };

    // Event Listeners
    window.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    // Touch support
    window.addEventListener("touchmove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouse.x = touch.clientX - rect.left;
        mouse.y = touch.clientY - rect.top;
    }, { passive: true });

    window.addEventListener("resize", resizeCanvas);

    // Font loading check (Optional but recommended for the text effect)
    if (document.fonts) {
        document.fonts.ready.then(() => {
            resizeCanvas();
        });
    }

    // Initialize
    resizeCanvas();
    render();
}