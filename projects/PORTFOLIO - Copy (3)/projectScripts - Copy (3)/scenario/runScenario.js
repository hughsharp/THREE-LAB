
import * as SU from './scenarioUtility.js';
import { updateStory } from '../utils/status.js';
import { activateDragonBallPointGravity } from '../resources/addDragonBalls.js';
import { slideGlassAnimation } from '../raycast/loadedModelRaycast.js';


// --- MAIN ORCHESTRATOR ---

export async function runIntroScenario(scene, camera, orbitControl, clock) {
    updateStory("Running Intro Scenario...");

    // MASTER TIME CONSTANT (in ms)
    // Adjust this single value to speed up/slow down the entire intro sequence.
    const MASTER_TIME = 15000;

    // 1. Initialize Scenario:
    //    - Pause the clock (physics/animation stop).
    //    - Map all scene objects for easy access.
    //    - Prepare objects (hide specific ones, set initial off-screen positions).
    // 1. Initialize Scenario:
    updateStory("Initializing Scenario System...");
    const objectMap = SU.initializeScenario(scene, orbitControl, clock);

    // 2. Reset Environment:
    //    - Turn off rain, storm effects, and darken the scene (set the "stage").
    // 2. Reset Environment:
    updateStory("Calibrating Environment...");
    SU.deactivateEnvironment(scene, MASTER_TIME * 0.05)

    // 3. User Entry Interaction:
    //    - Display the "Loading/Ready" UI.
    //    - Wait for the user to click "ENTER" to begin.
    // 3. User Entry Interaction:
    updateStory("Waiting for Pilot Entry...");
    await SU.handleUserEntry(scene);

    updateStory("User entered. Starting Build Sequence...");

    // 4. Build Sequence:
    //    - Animate objects (floor, furniture, books) flying in from their spawn points.
    //    - Tween the Black Hole into position.
    //    Ratio: 1500 / 20000 = 0.075
    await SU.assembleScene(scene, objectMap, MASTER_TIME * 0.075);

    // 5. Light & Atmosphere:
    //    - Start the rain and storm effects (gradual ramp-up).
    //    - Move the moon slightly.
    //    Ratio: 12000 / 20000 = 0.6
    updateStory("Activating Atmospheric Systems...");
    SU.activateEnvironment(scene, MASTER_TIME * 0.6)

    // 6. Physics Activation:
    //    - Resume the clock.
    //    - Enable Rapier physics simulation for the world.
    // 6. Physics Activation:
    updateStory("Engaging Physics Engine...");
    await SU.applyPhysics(scene, objectMap, clock);

    // 7. Drone Sequence:
    //    - Animate the drone flying along a path.
    //    - Init GazeFollower after flight.
    //    Ratio: 3000 / 20000 = 0.15
    updateStory("Deploying Recon Drone...");
    await SU.playDrone(scene, MASTER_TIME * 0.15)

    // 8. Slight Pause before final touches
    //    Ratio: 2000 / 20000 = 0.1
    await SU.delay(MASTER_TIME * 0.1)

    // 9. Glass Animation:
    //    - Slide the glass door to its open position.
    //    Note: slideGlassAnimation duration is fixed at ~1000ms in loadedModelRaycast.js
    updateStory("Opening Access Gates...");
    slideGlassAnimation(scene, 0.65, 1);

    updateStory('Access Granted. Welcome.');

    // Wait for Glass Animation (1000ms) to complete
    // Using a buffer relative to Master Time or fixed? 
    // Since slideGlassAnimation is fixed 1000ms, we should probably keep this fixed or 
    // allow it to scale if we ever parameterize slideGlassAnimation. 
    // For now, let's keep it consistent with the intent: MASTER_TIME * 0.06 (1200ms)
    await SU.delay(MASTER_TIME * 0.06)
    SU.callMjolnir(scene, MASTER_TIME * 0.25)

    await SU.delay(MASTER_TIME * 0.25)
    scene.constantUniform.enableLightning.value = true

    // a.play()
}



