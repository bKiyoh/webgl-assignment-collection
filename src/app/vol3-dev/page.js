"use client";
import { useEffect, useRef } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";
import { EffectComposer } from "@/lib/threeJs/EffectComposer.js";
import { RenderPass } from "@/lib/threeJs/RenderPass.js";
import { UnrealBloomPass } from "@/lib/threeJs/UnrealBloomPass.js";

export default function Page() {
  const initializedRef = useRef(false);
  const initAndLoad = async (app) => {
    await app.load();
    app.init();
    app.render();
  };

  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    if (wrapper && !initializedRef.current) {
      const app = new ThreeApp(wrapper, width, height);
      initAndLoad(app);
      initializedRef.current = true;
    }

    return () => {
      if (wrapper) {
        while (wrapper.firstChild) {
          wrapper.removeChild(wrapper.firstChild);
        }
      }
    };
  }, []);

  return <div id="webgl" />;
}

class ThreeApp {
  static MOON_SCALE = 0.27;
  static MOON_DISTANCE = 1.0;
  static SATELLITE_SPEED = 0.05;
  static SATELLITE_TURN_SCALE = 0.1;
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(2, 1, 8),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  static RENDERER_PARAM = {
    clearColor: 0x000000,
    rendererRatio: 120,
  };
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.3,
  };
  static MATERIAL_PARAM = {
    color: 0x80cbc4,
  };
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 20.0,
  };

  wrapper;
  width;
  height;
  renderer;
  scene;
  camera;
  directionalLight;
  ambientLight;
  controls;
  axesHelper;
  isDown;
  clock;
  sphereGeometry;
  earth;
  earthMaterial;
  earthTexture;
  moon;
  moonMaterial;
  moonTexture;
  initialMoonPositions;
  satellite;
  satelliteMaterial;
  satelliteDirection;
  group;
  composer;
  renderPass;
  glitchPass;
  mArray;

  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;

    this.render = this.render.bind(this);

    window.addEventListener(
      "keydown",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
            break;
          default:
        }
      },
      false
    );
    window.addEventListener(
      "keyup",
      () => {
        this.isDown = false;
      },
      false
    );

    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = this.aspect;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  load() {
    return new Promise((resolve) => {
      const earthPath = "/earth.jpg";
      const moonPath = "/1.jpg";
      const loader = new THREE.TextureLoader();
      loader.load(earthPath, (earthTexture) => {
        this.earthTexture = earthTexture;
        loader.load(moonPath, (moonTexture) => {
          this.moonTexture = moonTexture;
          resolve();
        });
      });
    });
  }

  init() {
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(
      this.width - ThreeApp.RENDERER_PARAM.rendererRatio,
      this.height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    this.wrapper.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

    this.aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      this.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    this.directionalLight = new THREE.PointLight(0xffffff, 100);
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);

    this.ambientLight = new THREE.HemisphereLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);

    this.earthMaterial = new THREE.MeshBasicMaterial({ color: 0x95ccff });
    this.earthMaterial.map = this.moonTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    this.mArray = [];
    this.initialMoonPositions = [];

    const moonCount = 20;
    const angleStep = (2 * Math.PI) / moonCount;

    for (let i = 0; i < moonCount; i++) {
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.7, Math.random() * 1 + 0.05);

      this.moonMaterial = new THREE.MeshBasicMaterial({ color: color });
      this.moonMaterial.map = this.moonTexture;
      this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
      this.moon.scale.setScalar(ThreeApp.MOON_SCALE);

      const angle = i * angleStep;
      const xPosition = Math.cos(angle) * ThreeApp.MOON_DISTANCE;
      const zPosition = Math.sin(angle) * ThreeApp.MOON_DISTANCE;

      this.moon.position.set(xPosition, 0.0, zPosition);
      this.initialMoonPositions.push(this.moon.position.clone());
      const m = {
        m: this.moon,
        distance: ThreeApp.MOON_DISTANCE,
        direction: true,
      };
      this.mArray.push(m);
      this.scene.add(this.moon);
    }

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.add(this.moon);

    this.satelliteMaterial = new THREE.MeshBasicMaterial(
      ThreeApp.MATERIAL_PARAM
    );
    this.satellite = new THREE.Mesh(
      this.sphereGeometry,
      this.satelliteMaterial
    );
    this.scene.add(this.satellite);
    this.satellite.scale.setScalar(0.1);
    this.satellite.position.set(0.0, 0.0, ThreeApp.MOON_DISTANCE);
    this.satelliteDirection = new THREE.Vector3(0.0, 0.0, 1.0).normalize();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);

    const params = {
      threshold: 0,
      strength: 2.5,
      radius: 1,
      exposure: 1.5,
    };

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight)
    );
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(bloomPass);

    this.isDown = false;

    this.clock = new THREE.Clock();
  }

  render() {
    requestAnimationFrame(this.render);

    this.controls.update();

    const subVector = new THREE.Vector3().subVectors(
      this.moon.position,
      this.satellite.position
    );
    subVector.normalize();
    this.satelliteDirection.add(
      subVector.multiplyScalar(ThreeApp.SATELLITE_TURN_SCALE)
    );
    this.satelliteDirection.normalize();
    const direction = this.satelliteDirection.clone();
    this.satellite.position.add(
      direction.multiplyScalar(ThreeApp.SATELLITE_SPEED)
    );

    const time = this.clock.getElapsedTime();
    this.mArray.forEach((item, index) => {
      const angle = time + index * ((2 * Math.PI) / this.mArray.length);
      item.m.position.x = Math.cos(angle) * ThreeApp.MOON_DISTANCE;
      item.m.position.z = Math.sin(angle) * ThreeApp.MOON_DISTANCE;
    });

    this.composer.render();
  }
}
