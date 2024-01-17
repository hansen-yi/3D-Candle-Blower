// import { degToRad } from 'three/src/math/MathUtils.js';
import * as THREE from '/node_modules/three/build/three.module.js';
import { TrackballControls } from '/node_modules/three/examples/jsm/controls/TrackballControls.js';
// import THREE from 'https://cdn.skypack.dev/three';
// import { TrackballControls } from 'https://cdn.skypack.dev/three-trackballcontrols-ts';
// import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls';
// import { GUI } from 'dat.gui';
import { GUI } from "https://cdn.skypack.dev/dat.gui";
// import vertexShader from '../shaders/vert.glsl'

let time = 0;

function vertexShader() {
    return `
        vec3 hash3(vec3 p) {
            return fract(sin(vec3(dot(p,vec3(127.1, 311.7, 191.999)),
                                dot(p,vec3(269.5, 183.3, 423.891)),
                                dot(p, vec3(420.6, 631.2, 119.02))
                            )) * 43758.5453);
        }
        
        float surflet(vec3 p, vec3 gridPoint) {
            // Compute the distance between p and the grid point along each axis, and warp it with a
            // quintic function so we can smooth our cells
            vec3 t2 = abs(p - gridPoint);
            // vec3 t = vec3(1.f) - 6.f * pow(t2, 5.f) + 15.f * pow(t2, 4.f) - 10.f * pow(t2, 3.f);
            vec3 t = vec3(1.f) - 6.f * (t2 * t2 * t2 * t2 * t2) + 15.f * (t2 * t2 * t2 * t2) - 10.f * (t2 * t2 * t2);
            // Get the random vector for the grid point (assume we wrote a function random2
            // that returns a vec2 in the range [0, 1])
            vec3 gradient = hash3(gridPoint) * 2. - vec3(1., 1., 1.);
            // Get the vector from the grid point to P
            vec3 diff = p - gridPoint;
            // Get the value of our height field by dotting grid->P with our gradient
            float height = dot(diff, gradient);
            // Scale our height field (i.e. reduce it) by our polynomial falloff function
            return height * t.x * t.y * t.z;
        }
        
        float perlinNoise3D(vec3 p) {
            float surfletSum = 0.f;
            // Iterate over the four integer corners surrounding uv
            for(int dx = 0; dx <= 1; ++dx) {
                for(int dy = 0; dy <= 1; ++dy) {
                    for(int dz = 0; dz <= 1; ++dz) {
                        surfletSum += surflet(p, floor(p) + vec3(dx, dy, dz));
                    }
                }
            }
            return surfletSum;
        }

        varying vec3 vUv;
        varying vec3 origPos;

        uniform float uTime;

        void main() {
            origPos = position;
            vUv = position; 
            if (position.y > 0.0) {
                float yDiff = (0.1 - position.y) / 0.1;
                float xzDiff = (0.1 - sqrt(position.x * position.x + position.z * position.z)) / 0.1;
                // vUv *= 2.0;

                vUv.x *= yDiff;
                // vUv.z *= yDiff;

                float noise = abs((perlinNoise3D(position * 50.0))) * 0.5 * xzDiff;
                // vUv.y += noise * sin(uTime * noise);
                // vUv.y += noise * sin(uTime * (noise * 10.0));
                vUv.y += noise * ((sin(uTime / 10.0 * (noise * 10.0)) + 1.0) / 2.0) * 0.4;
            }
            // if (position.y > 0.0) {
            //     // vUv.y *= 2.0;
            //     float noise = abs((perlinNoise3D(position * 50.0))) * 0.5;
            //     vUv.y += noise;
            // }
            
            // vUv.x = sin((position.y)*2.0 * uTime/10.0) * 0.02;
            // vUv.x = sin((position.y) * 50.0) * 0.05;
            float hRatio = (position.y + 0.1) / 0.2;
            vUv.x += sin((position.y) * 25.0 + uTime / 20.0) * 0.025 * hRatio;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(vUv, 1);
        }
    `
}

function fragmentShader() {
    return `
        uniform mat3 uRotation;

        varying vec3 origPos;
        varying vec3 vUv;
        void main() {
            // vec4 newPos = uRotation * vec4(origPos, 1);
            vec3 newPos = uRotation * origPos;
            // vec3 outlinePos = (inverse(viewMatrix) * vec4(origPos, 1)).xyz;
            vec3 outlinePos = uRotation * origPos;
            // origPos = newPos.xyz;
            // // if (abs(vUv.x) < 0.05 && abs(vUv.z) < 0.05) {
            // if ((pow(vUv.x, 2.0) + pow(vUv.y, 2.0) + pow(vUv.z, 2.0)) <= pow(0.105, 2.0)) {
            // if ((pow(origPos.x, 2.0) + pow(origPos.y + 0.1, 2.0) + pow(origPos.z, 2.0)) <= pow(0.075, 2.0)) {
            float radius = pow(origPos.x, 2.0) + pow(origPos.y, 2.0) + pow(origPos.z, 2.0);
            // if ((pow(origPos.x * 2.0, 2.0) + pow(origPos.y + 0.1, 2.0) + pow(origPos.z / 2.0, 2.0)) <= pow(0.1, 2.0)) {
            // float dist = sqrt(pow(origPos.x, 2.0) + pow(origPos.z, 2.0)) / 0.1;
            float dist = 0.5 * (abs(origPos.x) * 2.0 / 0.2) + 0.5 * (abs(origPos.z) / 2.0 / 0.05);
            dist += 0.2;
            dist = pow(dist, 3.0);
            float xyRad = sqrt(pow(origPos.x, 2.0) + pow(origPos.y, 2.0));
            if ((pow(newPos.x / 2.0, 2.0) + pow(newPos.y + 0.1, 2.0) + pow(newPos.z * 2.0, 2.0)) <= pow(0.09, 2.0)) {
                gl_FragColor = vec4(59. / 255., 87. / 255., 246. / 255., mix(0.0, 1.0, dist));
            } else if ((pow(newPos.x / 2.0, 2.0) + pow(newPos.y + 0.1, 2.0) + pow(newPos.z * 2.0, 2.0)) <= pow(0.125, 2.0)) {
                // gl_FragColor = mix(vec4(216. / 255., 139. / 255., 50. / 255., 0.8), 
                //                    vec4(247. / 255., 245. / 255., 88. / 255., 0.8), dist);
                float innerRad = sqrt((pow(newPos.x / 2.0, 2.0) + pow(newPos.y + 0.1, 2.0) + pow(newPos.z * 2.0, 2.0))) / 0.125;
                gl_FragColor = vec4(vec3(216. / 255., 139. / 255., 50. / 255.) * (1.0 - dist) +
                                    vec3(247. / 255., 245. / 255., 88. / 255.) * (dist), 0.8);
            // } else if (radius >= pow(0.1, 2.0)) {
            // } else if (pow(outlinePos.y, 2.0) + pow(outlinePos.z, 2.0) >= pow(0.09, 2.0)) {
            //     gl_FragColor = vec4(0, 1, 1, 1);
            } else {
                gl_FragColor = mix(vec4(254. / 255., 254. / 255., 254. / 255., 0.8),
                                   vec4(254. / 255., 245. / 255., 145. / 255., 0.8), xyRad / 0.1);
            }
        }
    `
}

function cakeVert() {
    return `
        varying vec3 cakePos;
        
        void main() {
            cakePos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(cakePos, 1);
        }
    `
}

function cakeFrag() {
    return `
        varying vec3 cakePos;
        uniform float numStripes;
        uniform float cakeHeight;
        uniform vec3 primColor;
        uniform vec3 secoColor;
        
        void main() {
            float r = sqrt(cakePos.x * cakePos.x + cakePos.z * cakePos.z);
            float angle = asin(cakePos.x / r);
            // if (cakePos.y > sin(angle * 10.0 + 3.14) * 0.1) {
            float offset = cakeHeight / numStripes;
            

            // vec4 primColor = vec4(232. / 255., 113. / 255., 177. / 255., 1);
            // vec4 secoColor = vec4(254. / 255., 254. / 255., 228. / 255., 1);
            gl_FragColor = vec4(secoColor / 255., 1);

            for (float i = -numStripes / 2.0; i < numStripes / 2.0; i+=2.0) {
                float botBound = cos(angle * 10.0) * 0.1 + i * offset;
                float topBound = cos(angle * 10.0) * 0.1 + (i + 1.0) * offset;
                if (i == -numStripes / 2.0) {
                    botBound = -cakeHeight / 2.0;
                    if (cakePos.y <= botBound + 0.01 && cakePos.y >= botBound - 0.01) {
                        gl_FragColor = vec4(primColor / 255., 1);
                    }
                }
                if (i == numStripes / 2.0 - 1.0) {
                    topBound = cakeHeight / 2.0;
                    if (cakePos.y <= topBound + 0.01 && cakePos.y >= topBound - 0.01) {
                        gl_FragColor = vec4(primColor / 255., 1);
                    }
                }
                if (cakePos.y >= botBound && cakePos.y <= topBound) {
                    gl_FragColor = vec4(primColor / 255., 1);
                }
            }
            // if (cakePos.y > cos(angle * 10.0) * 0.1) {
            //     gl_FragColor = vec4(1, 0, 0, 1);
            // }
            // else {
            //     gl_FragColor = vec4(0, 0, 1, 1);
            // }
        }
    `
}

function wickVert() {
    return `
        varying vec3 wickPos;
            
        void main() {
            wickPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(wickPos, 1);
        }
    `
}

function wickFrag() {
    return `
        varying vec3 wickPos;
        uniform float burnPos;

        void main() {
            if (wickPos.y > burnPos) {
                gl_FragColor = vec4(16. / 255., 13. / 255., 20. / 255., 1);
            } else {
                // if (sqrt(pow(wickPos.x, 2.0) + pow(wickPos.z, 2.0)) > 0.005 && wickPos.y == sin(atan(wickPos.x, wickPos.z) * 100.)) {
                //     gl_FragColor = vec4(0, 0, 1, 1);
                // } else {
                    gl_FragColor = vec4(222. / 255., 223. / 255., 205. / 255., 1);
                // }
            }
        }
    `
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.6, 1200);
// camera.position.y = -2;
camera.position.z = 5;
// camera.rotation.x = 20;

const renderer = new THREE.WebGLRenderer({antialias: true});

// renderer.setClearColor("#233143");
renderer.setClearColor("#F8C8DC");
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Listener to resize the renderer canvas and camera
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
})

const controlData = {
    radius: 2,
    height: 1.5,
    numCandles: 0,
    minCandleHeight: 0.5,
    maxCandleHeight: 1.2,
    wickHeight: 0.15,
    numStripes: 3,
    primary: [232, 113, 177],
    secondary: [254, 254, 228],
    candleColor: '#E5E5E5',
};

let rotationMatrix = new THREE.Matrix3();
// const angleInRadians = Math.PI / 2; // Adjust the angle as needed
// rotationMatrix.makeRotationY(angleInRadians);
// rotationMatrix = camera.matrixWorld;

const viewDirection = new THREE.Vector3();
// viewMatrix.extractBasis(new THREE.Vector3(), viewDirection, new THREE.Vector3());
// const projectedDirection = new THREE.Vector2(viewDirection.x, viewDirection.z);
camera.getWorldDirection(viewDirection);

const uniforms = {
    uTime: {type: 'f', value: 0.0},
    uRotation: {value: rotationMatrix},
    numStripes: {value: controlData.numStripes},
    cakeHeight: {value: controlData.height},
    primColor: {value: controlData.primary},
    secoColor: {value: controlData.secondary},
};

//Scene objects
const cake = new THREE.CylinderGeometry(2, 2, 1.5);
const cakeMaterial = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
let cakeMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: cakeVert(),
    fragmentShader: cakeFrag(),
});
cakeMaterial.userData.numStripes = {value: controlData.numStripes};
cakeMaterial.userData.cakeHeight = {value: controlData.height};
cakeMaterial.userData.primColor = {value: controlData.primary};
cakeMaterial.userData.secoColor = {value: controlData.secondary};
cakeMaterial.onBeforeCompile = shader => {
    shader.uniforms.numStripes = cakeMaterial.userData.numStripes;
    shader.uniforms.cakeHeight = cakeMaterial.userData.cakeHeight;
    shader.uniforms.primColor = cakeMaterial.userData.primColor;
    shader.uniforms.secoColor = cakeMaterial.userData.secoColor;
    shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `varying vec3 cakePos;
        
        void main() {
            cakePos = position;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `varying vec3 cakePos;
        uniform float numStripes;
        uniform float cakeHeight;
        uniform vec3 primColor;
        uniform vec3 secoColor;
        
        void main() {
            float r = sqrt(cakePos.x * cakePos.x + cakePos.z * cakePos.z);
            float angle = asin(cakePos.x / r);
            float offset = cakeHeight / numStripes;
        `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4(secoColor / 255., 1);

        for (float i = -numStripes / 2.0; i < numStripes / 2.0; i+=2.0) {
            float botBound = cos(angle * 10.0) * 0.1 + i * offset;
            float topBound = cos(angle * 10.0) * 0.1 + (i + 1.0) * offset;
            if (i == -numStripes / 2.0) {
                botBound = -cakeHeight / 2.0;
                if (cakePos.y <= botBound + 0.01 && cakePos.y >= botBound - 0.01) {
                    diffuseColor = vec4(primColor / 255., 1);
                }
            }
            if (i == numStripes / 2.0 - 1.0) {
                topBound = cakeHeight / 2.0;
                if (cakePos.y <= topBound + 0.01 && cakePos.y >= topBound - 0.01) {
                    diffuseColor = vec4(primColor / 255., 1);
                }
            }
            if (cakePos.y >= botBound && cakePos.y <= topBound) {
                diffuseColor = vec4(primColor / 255., 1);
            }
        }
        `
    );
//     // if (typeof cakeMaterial.onBeforeCompile === 'function') {
//     //     cakeMaterial.onBeforeCompile(shader);
//     // }
}
const cakeMesh = new THREE.Mesh(cake, cakeMaterial);
// cakeMesh.rotation.set(10, 0, 0);
scene.add(cakeMesh);

// const light = new THREE.PointLight(0xFFFFFF, 1, 100);
// light.position.set(0, 0, 4);
// scene.add(light);
const lights = [];
const lightValues = [
    {color: 0xFFFFFF, intensity: 5, dist: 100, x: -5, y: 0, z: 0},
    {color: 0xFFFFFF, intensity: 5, dist: 100, x: 5, y: 0, z: 0},
    {color: 0xFFFFFF, intensity: 5, dist: 100, x: 0, y: 0, z: 5},
    {color: 0xFFFFFF, intensity: 5, dist: 100, x: 0, y: 0, z: -5},
    {color: 0xFFFFFF, intensity: 7.5, dist: 100, x: 0, y: 5, z: 0},
    {color: 0xFFFFFF, intensity: 5, dist: 100, x: 0, y: -5, z: 0},
];
for (let i = 0; i < lightValues.length; i++) {
    lights[i] = new THREE.PointLight(
        lightValues[i]['color'], 
        lightValues[i]['intensity'], 
        lightValues[i]['dist']);
    lights[i].position.set(
        lightValues[i]['x'], 
        lightValues[i]['y'], 
        lightValues[i]['z']);
    // lights[i].castShadow = true;
    scene.add(lights[i]);
}

const ambiLight = new THREE.AmbientLight(0xE5E5E5, 2.75); // soft white light
scene.add(ambiLight);

const controller = new TrackballControls(camera, renderer.domElement);
// const controller = new OrbitControls(camera, renderer.domElement);
controller.rotateSpeed = 2;
controller.dynamicDampingFactor = 0.15;

function regenerateCake() {
    const newCake = new THREE.CylinderGeometry(
        controlData.radius,
        controlData.radius,
        controlData.height
    )
    cakeMesh.geometry.dispose();
    cakeMesh.geometry = newCake;
    regenerateCandles();
    uniforms.numStripes.value = controlData.numStripes;
    uniforms.cakeHeight.value = controlData.height;
    uniforms.primColor.value = controlData.primary;
    uniforms.secoColor.value = controlData.secondary;

    cakeMaterial.userData.numStripes.value = controlData.numStripes;
    cakeMaterial.userData.cakeHeight.value = controlData.height;
    cakeMaterial.userData.primColor.value = controlData.primary;
    cakeMaterial.userData.secoColor.value = controlData.secondary;
}

let prevCakeHeight = controlData.height;
let prevCakeRadius = controlData.radius;
let prevScale = 1;

let prevMinHeight = controlData.minCandleHeight;
let prevMaxHeight = controlData.maxCandleHeight;
function regenerateCandles() {
    if (prevCakeHeight != controlData.height || prevCakeRadius != controlData.radius) {
        // candles.forEach((candle) => {
        //     let oldPos = candle.position;
        //     console.log(oldPos);
        //     // const newCandle = 
        //     let candleHeight = 2 * oldPos.y - prevCakeHeight;
        //     candle.position.set(oldPos.x, (controlData.height + candleHeight) / 2, oldPos.z);
        //     // candle.position.set(oldPos.x, 2, oldPos.z);
        // });
        for (let i = 0; i < candles.length; i++) {
            const candle = candles.at(i);
            const wick = wicks.at(i);
            let oldPos = candle.position;
            let oldWick = wick.position;
            let candleHeight = 2 * oldPos.y - prevCakeHeight;
            candle.position.set(oldPos.x / prevCakeRadius * controlData.radius, (controlData.height + candleHeight) / 2, oldPos.z / prevCakeRadius * controlData.radius);
            wick.position.set(oldWick.x / prevCakeRadius * controlData.radius, (2 * oldWick.y - prevCakeHeight + controlData.height) / 2, oldWick.z / prevCakeRadius * controlData.radius);
            // console.log(candle.scale.set(prevScale * controlData.radius / prevCakeRadius, 1, prevScale * controlData.radius / prevCakeRadius));
            if (i < fires.length) {
                const fire = fires.at(i);
                let oldFire = fire.position;
                fire.position.set(oldFire.x / prevCakeRadius * controlData.radius, (2 * oldFire.y - prevCakeHeight + controlData.height) / 2, oldFire.z / prevCakeRadius * controlData.radius);
            }
        }
        prevScale *= controlData.radius / prevCakeRadius;
        prevCakeHeight = controlData.height;
        prevCakeRadius = controlData.radius;
    }
    // if (prevCakeRadius != controlData.radius) {
    //     for (let i = 0; i < candles.length; i++) {
    //         const candle = candles.at(i);
    //         // const wick = wicks.at(i);
    //         // let oldPos = candle.position;
    //         // let oldWick = wick.position;
    //         // let candleHeight = 2 * oldPos.y - prevCakeHeight;
    //         // candle.position.set(oldPos.x, (controlData.height + candleHeight) / 2, oldPos.z);
    //         // wick.position.set(oldWick.x, (2 * oldWick.y - prevCakeHeight + controlData.height) / 2, oldWick.z);
    //         // if (i < fires.length) {
    //         //     const fire = fires.at(i);
    //         //     let oldFire = fire.position;
    //         //     fire.position.set(oldFire.x, (2 * oldFire.y - prevCakeHeight + controlData.height) / 2, oldFire.z);
    //         // }
    //         console.log(candle.scale.set(2, 1, 2));
    //     }
    // }

    if (prevMinHeight != controlData.minCandleHeight || prevMaxHeight != controlData.maxCandleHeight) {
        if (prevMinHeight != controlData.minCandleHeight) {
            controlData.maxCandleHeight = Math.max(controlData.maxCandleHeight, controlData.minCandleHeight);
            prevMaxHeight = controlData.maxCandleHeight;
            gui.updateDisplay();
        }
        else if (prevMaxHeight != controlData.maxCandleHeight) {
            controlData.minCandleHeight = Math.min(controlData.maxCandleHeight, controlData.minCandleHeight);
            prevMinHeight = controlData.minCandleHeight;
            gui.updateDisplay();
        }
        for (let i = 0; i < candles.length; i++) {
            const candle = candles.at(i);
            const wick = wicks.at(i);
            let oldPos = candle.position;
            let oldWick = wick.position;
            let oldCandleHeight = 2 * oldPos.y - prevCakeHeight;
            let oldExtra = ((oldCandleHeight - prevMinHeight) === 0.0) ? 0.0 : (oldCandleHeight - prevMinHeight); 
            let oldDiff = ((prevMaxHeight - prevMinHeight) === 0.0) ? 1.0 : (prevMaxHeight - prevMinHeight); 
            // let newDiff = ((controlData.maxCandleHeight - controlData.minCandleHeight) === 0.0) ? 1.0 : (controlData.maxCandleHeight - controlData.minCandleHeight); 
            let newCandleHeight = (oldExtra / oldDiff) * (controlData.maxCandleHeight - controlData.minCandleHeight) + controlData.minCandleHeight;

            const newCandle = new THREE.CylinderGeometry(0.1, 0.1, newCandleHeight);
            candle.geometry.dispose();
            candle.geometry = newCandle; 
            candle.scale.set(prevScale, 1, prevScale);

            candle.position.set(oldPos.x, (controlData.height + newCandleHeight) / 2, oldPos.z);
            wick.position.set(oldWick.x, (controlData.wickHeight + 2 * newCandleHeight + controlData.height) / 2, oldWick.z);
            // console.log(oldWick.x, (controlData.wickHeight + 2 * newCandleHeight + controlData.height) / 2, oldWick.z);
            if (i < fires.length) {
                const fire = fires.at(i);
                let oldFire = fire.position;
                fire.position.set(oldFire.x, (controlData.wickHeight + 2 * newCandleHeight + controlData.height + 0.2) / 2, oldFire.z);
            }
        }
        prevMinHeight = controlData.minCandleHeight;
        prevMaxHeight = controlData.maxCandleHeight;
    }

    for (let i = 0; i < candles.length; i++) {
        let candle = candles.at(i);
        candle.material.emissive.set(controlData.candleColor);
    }
    
}

const gui = new GUI();
const cakeControls = gui.addFolder('Cake Controls');
// cakeControls.add(cakeMesh.scale, 'y', 1, 4);
cakeControls.add(controlData, 'radius', 1, 5).onChange(regenerateCake);
cakeControls.add(controlData, 'height', 1, 3).onChange(regenerateCake);
cakeControls.add(controlData, 'numStripes', 1, 10, 1).onChange(regenerateCake);
cakeControls.addColor(controlData, 'primary').onChange(regenerateCake);
cakeControls.addColor(controlData, 'secondary').onChange(regenerateCake);
// cakeControls.open();
const candleControls = gui.addFolder('Candle Controls');
candleControls.addColor(controlData, 'candleColor').onChange(regenerateCandles);
candleControls.add(controlData, 'minCandleHeight', 0.1, 2.0, 0.01).onChange(regenerateCandles);
candleControls.add(controlData, 'maxCandleHeight', 0.1, 2.0, 0.01).onChange(regenerateCandles);
gui.add(controlData, 'numCandles', 0, 123, 1).onFinishChange(updateCandles);
gui.add({ 'Add a Candle': addSingularCandle }, 'Add a Candle');
gui.add({ removeCandle: removeSingularCandle }, 'removeCandle');
gui.add({ 'Light All Candles': light }, 'Light All Candles');
gui.add({ 'Reset': reset }, 'Reset');

const candles = [];
const fires = [];
const firePos = [];
const thresholds = [];
const wicks = [];
const wickUniforms = [];
const wickMaterials = [];

function addCandle() {
    if (controlData.numCandles > 123) {
        return;
    }
    const candleRadius = 0.1;
    const candleHeight = (controlData.maxCandleHeight - controlData.minCandleHeight) * Math.random() + controlData.minCandleHeight;
    const candle = new THREE.CylinderGeometry(candleRadius, candleRadius, candleHeight);
    const candleMaterial = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
    candleMaterial.emissive.set('#E5E5E5');
    candleMaterial.emissiveIntensity = 0.5;
    const candleMesh = new THREE.Mesh(candle, candleMaterial);
    candleMesh.scale.set(prevScale, 1, prevScale);

    let placed = false;
    let tries = 0;

    while (!placed && tries < 1000) {
        tries++;
        let intersecting = false;
        const R = (controlData.radius - 2 * 0.1) * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        candleMesh.position.set(R * Math.cos(theta), (controlData.height + candleHeight) / 2, R * Math.sin(theta));
        let candleBbox = new THREE.Box3().setFromObject(candleMesh);
        candles.forEach(element => {
            let bigElement = element.clone();
            bigElement.scale.set(1.2, 4, 1.2);
            let bbox = new THREE.Box3().setFromObject(bigElement);
            // console.log(bbox.getSize());
            let checkIntersect = candleBbox.intersectsBox(bbox);
            intersecting = intersecting || checkIntersect;
            if (intersecting) {
                return;
            }
        });
        placed = !intersecting;
    }
    // if (tries > 100) {
       console.log(tries); 
    // }
    // console.log(candleMesh.position);
    // candleMesh.rotation.set(10, 0, 0);
    candles.push(candleMesh);
    scene.add(candleMesh);
    // controlData.numCandles++;
    // prevNumCandles = controlData.numCandles;
    // gui.updateDisplay();

    const wickUniform = {
        burnPos: {type: 'f', value: 0.08},
    };
    wickUniforms.push(wickUniform);
    const wickRadius = 0.01;
    const wick = new THREE.CylinderGeometry(wickRadius, wickRadius, controlData.wickHeight);
    const wickMaterial = new THREE.MeshLambertMaterial({color: [222, 223, 205]});
    wickMaterial.userData.burnPos = wickUniforms.at(wickUniforms.length - 1).burnPos;
    wickMaterial.onBeforeCompile = shader => {
        shader.uniforms.burnPos = wickMaterial.userData.burnPos;
        shader.vertexShader = shader.vertexShader.replace(
            'void main() {',
            `varying vec3 wickPos;
            
            void main() {
                wickPos = position;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            `varying vec3 wickPos;
            uniform float burnPos;
    
            void main() {    
            `
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            `vec4 diffuseColor = vec4(255. / 255., 253. / 255., 188. / 229., 1);
            if (wickPos.y > burnPos) {
                diffuseColor = vec4(16. / 255., 13. / 255., 20. / 255., 1);
            }
            `
        );
    }
    wickMaterials.push(wickMaterial);

    let wickMat = new THREE.ShaderMaterial({
        uniforms: wickUniforms.at(wickUniforms.length - 1),
        vertexShader: wickVert(),
        fragmentShader: wickFrag(),
    })
    const wickMesh = new THREE.Mesh(wick, wickMaterial);
    wickMesh.position.set(candleMesh.position.x, candleMesh.position.y + (candleHeight + controlData.wickHeight) / 2, candleMesh.position.z);
    wicks.push(wickMesh);
    scene.add(wickMesh);

    thresholds.push(-1.0);
}

function removeCandle() {
    if (candles.length == 0) {
        return;
    }
    scene.remove(candles.pop());
    firePos.pop();
    scene.remove(wicks.pop());
    if (thresholds.pop() != -1.0) {
        scene.remove(fires.pop());
    }
    // controlData.numCandles--;
    // prevNumCandles = controlData.numCandles;
    // gui.updateDisplay();
}

function addSingularCandle() {
    addCandle();
    controlData.numCandles++;
    controlData.numCandles = Math.min(controlData.numCandles, 123);
    prevNumCandles = controlData.numCandles;
    gui.updateDisplay();
}

function removeSingularCandle() {
    removeCandle();
    controlData.numCandles--;
    controlData.numCandles = Math.max(controlData.numCandles, 0);
    prevNumCandles = controlData.numCandles;
    gui.updateDisplay();
}

let prevNumCandles = 0;
function updateCandles() {
    if (prevNumCandles != controlData.numCandles) {
        if (controlData.numCandles < prevNumCandles) {
            for (let i = controlData.numCandles; i < prevNumCandles; i++) {
                removeCandle();
            }
        } else {
            for (let i = prevNumCandles; i < controlData.numCandles; i++) {
                addCandle();
            }
        }
        prevNumCandles = controlData.numCandles;
    }
}

function light() {
    // candles.foreach(element => {
    //     let bbox = new THREE.Box3().setFromObject(element);
    //     let checkIntersect = candleBbox.intersectsBox(bbox);
    //     intersecting = intersecting || checkIntersect;
    //     if (intersecting) {
    //         return;
    //     }
    // });
    for(let i = 0; i < thresholds.length; i++) {
        if (thresholds[i] == 0.0) {
            scene.add(fires.at(i));
            const threshold = 35 + Math.random() * 20;
            thresholds[i] = threshold;
        }
    // }
    // for(let i = thresholds.length; i < candles.length; i++) {
        else if (thresholds[i] == -1.0) {
            let center = candles.at(i).position;
            let candleHeight = center.y * 2 - controlData.height;
            const fire = new THREE.SphereGeometry(0.1);
            const fireMaterial = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
            let fireMat = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vertexShader(),
                fragmentShader: fragmentShader(),
                transparent: true,
            });
            const fireMesh = new THREE.Mesh(fire, fireMat);
            fireMesh.position.set(center.x, center.y + candleHeight / 2 + 0.1 + 0.15 / 2, center.z);
            // console.log(center);
            // console.log(fireMesh.position);
            fires.push(fireMesh);
            scene.add(fireMesh);
            const threshold = 35 + Math.random() * 20;
            // thresholds.push(threshold);
            thresholds[i] = threshold;
        }
        // else {
        //     scene.add(fires.at(i));
        // }
    }
}

// function updateWicks() {

// }

function reset() {
    controlData.radius = 2;
    controlData.height = 1.5;
    controlData.numStripes = 3.0;
    controlData.numCandles = 0;
    controlData.primary = [232, 113, 177];
    controlData.secondary = [254, 254, 228];
    controlData.minCandleHeight = 0.5;
    controlData.maxCandleHeight = 1.2;
    controlData.candleColor = '#E5E5E5';
    // scene.rotation.set(degToRad(15), 0, 0);
    controller.reset();
    regenerateCake();
    updateCandles();
    gui.updateDisplay();
}

const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true, noiseSuppression: false });
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(stream);
const analyser = audioContext.createAnalyser();
source.connect(analyser);
analyser.fftSize = 2048 * 4; //2048 * 16
const pcm = new Float32Array(analyser.fftSize / 2);
const soundData = new Uint8Array(analyser.frequencyBinCount);
const freqData = new Uint8Array(analyser.frequencyBinCount);
let soundCount = 0;

const rendering = function() {
    // analyser.getFloatTimeDomainData(pcm);
    // analyser.getFloatFrequencyData(pcm);
    analyser.getByteTimeDomainData(soundData);
    analyser.getByteFrequencyData(freqData);
    let sum = 0.0;
    // console.log(soundData);
    // console.log(pcm);
    // for (const amp of pcm) {
    //     sum += amp * amp;
    // }
    for (const amp of freqData) {
        sum += amp;
    }
    // let soundLvl = Math.sqrt(sum / pcm.length);
    let soundLvl = sum / freqData.length;
    // console.log(soundLvl); //5-15 blowing, talking is 20+
    const maxAmp = Math.max(...soundData);
    // console.log(maxAmp); 
    const maxFreq = Math.max(...freqData);
    // console.log(maxFreq); 
    for (let i = 0; i < fires.length; i++) {
        if (thresholds.at(i) == 0) {
            continue;
        }
        // if (maxAmp > 135 && soundLvl > 10) {
        // if (maxAmp > 140 && soundLvl > 10 && maxFreq > 150) {
            // console.log("talking");
        // } else if (maxAmp < 130 && soundLvl > 1.5) {
        if (maxAmp > 128 && maxAmp <= 136 && soundLvl > 5 && soundLvl < 15 && maxFreq > 100 && maxFreq < 150) {
            // console.log("blow");
            thresholds[i] = Math.max(0, thresholds.at(i) - 1);
            if (thresholds.at(i) == 0) {
                scene.remove(fires.at(i));
            }
            // console.log(thresholds);
        }
        wickUniforms.at(i).burnPos.value -= 0.00005 * Math.random() * Math.random();
    }
    if (maxAmp > 128 && maxAmp <= 136 && soundLvl > 5 && soundLvl < 15 && maxFreq > 100 && maxFreq < 150) { //1.5
        console.log("blow");
    }
    else if (maxAmp > 140 && soundLvl > 10 && maxFreq > 150) { //10
        console.log("talking");
    }
    // console.log(thresholds);
    // if (maxAmp > 135 && soundLvl > 20) {
    //     console.log("talking");
    // } else if (maxAmp < 130 && soundLvl > 5) {
    //     console.log("blow");
    // }
    // if (maxAmp > 180) {
    //     console.log("talking detected");
    // }
    // else if (maxAmp > 100) {
    //     console.log("blowing detected");
    // }
    // if (soundLvl > 0.005) {
    // if (soundLvl < 75) {
    //     fires.forEach((fire) => scene.remove(fire));
    //     fires.length = 0;
    // }

    requestAnimationFrame(rendering);

    // scene.rotation.z -= 0.005;
    // scene.rotation.x -= 0.01;
    // scene.rotation.x = degToRad(15);
    scene.rotation.x = Math.PI / 180. * 15.;
    renderer.render(scene, camera);
    // console.log(prevNumCandles);
    // console.log(candles);
    // gui.updateDisplay();
    controller.update();
    // console.log("ran");
    // time++;
    uniforms.uTime.value++;
    camera.updateMatrixWorld();
    // console.log(camera.matrixWorldInverse);
    camera.getWorldDirection(viewDirection);
    // console.log(viewDirection);
    // const viewMatrix = camera.matrixWorld; // Your view matrix
    // const viewDirection = new THREE.Vector3();
    // viewMatrix.extractBasis(new THREE.Vector3(), viewDirection, new THREE.Vector3());
    const projectedDirection = new THREE.Vector3(viewDirection.x, 0, viewDirection.z);
    rotationMatrix = new THREE.Matrix3();
    rotationMatrix.set(viewDirection.x, 0, viewDirection.z, 0, 1, 0, -viewDirection.z, 0, viewDirection.x);
    // rotationMatrix.set(
    //     0, -viewDirection.z, viewDirection.y,
    //     viewDirection.z, 0, -viewDirection.x,
    //     -viewDirection.y, viewDirection.x, 0
    // );
    // rotationMatrix.transpose();
    // rotationMatrix.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2)
    uniforms.uRotation.value = rotationMatrix;
}

// function getAudio() {
//     if (navigator.mediaDevices) {
//         navigator.mediaDevices.getUserMedia({ video: false, audio: true })
//         .then((stream) => {
//             const audio = audioContext.createMediaElementSource(stream);
//             const analyser = audioContext.createAnalyser();
//             audio.connect(analyser);
//             const pcm = new Float32Array(analyser.fftSize);
//         })
//         .catch((err) => {
//             console.error(`Following Error Occurred: ${err}`);
//         });
//     }
// }

// getAudio();

rendering();