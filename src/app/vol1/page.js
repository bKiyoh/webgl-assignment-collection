"use client";
import { useEffect } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";

export default function Page() {
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    if (wrapper) {
      const app = new ThreeApp(wrapper, width, height);
      app.render();
    } else {
      console.error("wrapper element not found");
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

// ThreeApp クラスの定義
class ThreeApp {
  static CAMERA_PARAM = {
    fovy: 60,
    // aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 10.0,
    position: new THREE.Vector3(0.0, 2.0, 5.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  static RENDERER_PARAM = {
    clearColor: 0x666666,
    // width: window.innerWidth - 120,
    // height: window.innerHeight - 120,
  };

  static MATERIAL_PARAM = {
    color: 0x3399ff,
  };

  constructor(wrapper, width, height) {
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(width - 120, height - 120);
    wrapper.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      width / height,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    this.geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.material = new THREE.MeshBasicMaterial(ThreeApp.MATERIAL_PARAM);

    this.box = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.box);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
