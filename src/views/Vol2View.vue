<script setup lang="ts">
import ThreeSceneCanvas from "@/components/webgl/ThreeSceneCanvas.vue";
import Vol2Scene from "@/webgl/scenes/Vol2Scene.js";
</script>

<template>
  <ThreeSceneCanvas :scene-class="Vol2Scene" />
</template>
