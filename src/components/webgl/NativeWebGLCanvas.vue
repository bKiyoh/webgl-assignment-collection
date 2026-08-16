<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

type NativeScene = {
  init: () => void;
  load: () => Promise<unknown>;
  setupGeometry: () => void;
  setupLocation: () => void;
  start: () => void;
  dispose: () => void;
};

type NativeSceneConstructor = new (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) => NativeScene;

const props = defineProps<{
  sceneClass: NativeSceneConstructor;
}>();

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const loading = ref(true);
const errorMessage = ref("");
let scene: NativeScene | undefined;
let active = true;

onMounted(async () => {
  if (!canvas.value) return;

  try {
    scene = new props.sceneClass(
      canvas.value,
      window.innerWidth,
      window.innerHeight,
    );
    scene.init();
    await scene.load();
    if (!active) return;
    scene.setupGeometry();
    scene.setupLocation();
    scene.start();
    loading.value = false;
  } catch (error) {
    if (!active) return;
    console.error(error);
    errorMessage.value = "WebGLシーンの読み込みに失敗しました。";
    loading.value = false;
    scene?.dispose();
  }
});

onBeforeUnmount(() => {
  active = false;
  scene?.dispose();
});
</script>

<template>
  <section class="webgl-view">
    <canvas
      ref="canvas"
      class="webgl-canvas"
    />
    <v-progress-circular
      v-if="loading"
      indeterminate
      color="primary"
    />
    <v-alert
      v-if="errorMessage"
      class="scene-error"
      type="error"
    >
      {{ errorMessage }}
    </v-alert>
  </section>
</template>
