import {
    AmbientLight,
    BoxGeometry,
    BufferGeometry,
    Color,
    DirectionalLight,
    DoubleSide,
    Mesh,
    MeshStandardMaterial,
    PlaneGeometry,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
} from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';

import { Cloth, Node, Spring } from './cloth.js'
import './style.css'


const GRAVITY = new Vector3(0, -1, 0);
const WIND = new Vector3(0,0,0);

const beginScene = (container) => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 5;

    const renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    addEventListener('resize', (_) => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });


    const stats = new Stats();
    container.appendChild(stats.dom);

    const SIDELENGTH = 3;
    const DENSITY = 30;
    const cloth = new Cloth(SIDELENGTH, DENSITY, 10, 100, 0.05, 1.1);
    cloth.addForce(GRAVITY);
    cloth.addForce(node => {
        const wind = WIND.clone().sub(node.vel).dot(node.normal);
        return node.normal.clone().multiplyScalar(wind);
    });

    const material = new MeshStandardMaterial({
	color: new Color(0x55aaff),
	side: DoubleSide
    });
    const geom = new PlaneGeometry(SIDELENGTH, SIDELENGTH, DENSITY, DENSITY);
    const clothMesh = new Mesh(geom, material);
    scene.add(clothMesh);

    const ambientLight = new AmbientLight(0x404040);
    scene.add(ambientLight);
    const light = new DirectionalLight();
    light.target = clothMesh;
    light.position.set(0, 10, 10);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    (() => {
	const gui = new dat.GUI();
	const windFolder = gui.addFolder('Wind');
	windFolder.add(WIND, 'x', -10, 10); 
	windFolder.add(WIND, 'y', -10, 10); 
	windFolder.add(WIND, 'z', -10, 10); 
	windFolder.open();
    })();

    const dt = 2;
    let currTime = performance.now();
    let accumulator = 0;

    const MAX_FRAME_TIME = 17;
    const renderfn = () => {
        const newTime = performance.now();
        const frameTime = Math.min(newTime - currTime, MAX_FRAME_TIME);
        currTime = newTime;

        accumulator += frameTime;

        while (accumulator > 0) {
            const step = Math.min(accumulator, dt);
            cloth.update(step * 0.001);
            accumulator -= step;
        }

        cloth.updateGeometry(geom);

        stats.update();
        renderer.render(scene, camera);
        requestAnimationFrame(renderfn);
    }
    renderfn();

    renderer.domElement.classList.add('scene');
    container.appendChild(renderer.domElement);
}

addEventListener('load', (_) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    beginScene(container);
});
