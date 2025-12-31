
let fpsElement;
let coordsElement;
let storyElement;

let lastTime = 0;
let frameCount = 0;
let fps = 0;
let storyTimeout;

export function initStatus() {
    fpsElement = document.getElementById('ui-fps');
    coordsElement = document.getElementById('ui-coords');
    storyElement = document.querySelector('.frame_story-text');

    // Mouse Move Listener
    window.addEventListener('mousemove', (event) => {
        if (coordsElement) {
            // Normalize coordinates if needed, or just show raw pixels. 
            // User asked for "X:1 Y:1", let's assume pixel coords or normalized? 
            // "X:1 Y:1" suggests pixels or integer values. Let's start with Client X/Y.
            coordsElement.innerText = `X:${event.clientX} Y:${event.clientY}`;
        }
    });

    lastTime = performance.now();
    // console.log("Status module initialized");
}

export function updateStatus() {
    if (!fpsElement) return;

    frameCount++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime;

    if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta);
        fpsElement.innerText = `${fps} FPS`;
        frameCount = 0;
        lastTime = currentTime;
    }
}

export function updateStory(text) {
    if (storyElement) {
        storyElement.innerText = text;

        // Clear previous timeout if exists
        if (storyTimeout) clearTimeout(storyTimeout);

        // Set new timeout to clear text after 5 seconds
        storyTimeout = setTimeout(() => {
            if (storyElement) storyElement.innerText = "";
        }, 5000);
    }
}
