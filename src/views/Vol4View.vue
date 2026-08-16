<script setup lang="ts">
import ThreeSceneCanvas from "@/components/webgl/ThreeSceneCanvas.vue";
import Vol4Scene from "@/webgl/scenes/Vol4Scene.js";
</script>

<template>
  <ThreeSceneCanvas
    :scene-class="Vol4Scene"
    load-before-render
  />
</template>
