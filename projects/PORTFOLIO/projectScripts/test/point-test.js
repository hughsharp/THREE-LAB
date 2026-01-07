export function initPointTest(scene) {
    const moveBtn = document.getElementById('move-btn');
    if (moveBtn) {
        moveBtn.addEventListener('click', () => {
            console.log('clicked');
        });
    }
}
