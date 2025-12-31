
import * as SU from './scenarioUtility.js';
import { activateDragonBallPointGravity } from '../addDragonBalls.js';


// --- MAIN ORCHESTRATOR ---

export async function runIntroScenario(scene, camera, orbitControl, clock) {
    console.log("Running Intro Scenario...");

    const objectMap = SU.initializeScenario(scene, orbitControl, clock);

    await SU.handleUserEntry(scene);

    console.log("User entered. Starting Build Sequence...");

    await SU.assembleScene(scene, objectMap);
    // await addDroneGravityPoint(scene)
    // let t = scene.rapierWrapper.getGravityPointByName('drone')
    // console.log(t)
    
    await SU.applyPhysics(scene, objectMap, clock);
    SU.activateRain(scene)
    await SU.playDrone(scene)
    activateDragonBallPointGravity(scene)
    console.log('Done')
}

