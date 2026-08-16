<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import ShaderShadingScene from "@/webgl/scenes/Vol6Scene.js";

const props = defineProps<{
  label: string;
  vertexShaderPath: string;
  fragmentShaderPath: string;
}>();

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const loading = ref(true);
const errorMessage = ref("");
let scene: InstanceType<typeof ShaderShadingScene> | undefined;
let active = true;

onMounted(async () => {
  if (!canvas.value) return;

  try {
    scene = new ShaderShadingScene(
      canvas.value,
      window.innerWidth,
      window.innerHeight,
      props.vertexShaderPath,
      props.fragmentShaderPath,
    );
    scene.init();
    await scene.load();
    if (!active) return;
    scene.setupGeometry();
    scene.setupLocation();
    scene.setCulling(true);
    scene.setDepthTest(true);
    scene.setRotation(true);
    scene.start();
    loading.value = false;
  } catch (error) {
    if (!active) return;
    console.error(error);
    errorMessage.value = "シェーダーの読み込みに失敗しました。";
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
  <section class="shader-panel">
    <h2>{{ label }}</h2>
    <div class="shader-canvas-wrapper">
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
    </div>
  </section>
</template>

<style scoped>
.shader-panel {
  display: grid;
  min-width: 0;
  place-items: center;
}

.shader-panel h2 {
  margin: 0 0 8px;
  font-size: 0.875rem;
  font-weight: 400;
}

.shader-canvas-wrapper {
  position: relative;
  display: grid;
  width: 100%;
  place-items: center;
}
</style>
