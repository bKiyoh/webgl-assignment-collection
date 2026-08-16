<script setup lang="ts">
import ThreeSceneCanvas from "@/components/webgl/ThreeSceneCanvas.vue";
import Vol3Scene from "@/webgl/scenes/Vol3Scene.js";
</script>

<template>
  <ThreeSceneCanvas
    :scene-class="Vol3Scene"
    load-before-render
  />
</template>
