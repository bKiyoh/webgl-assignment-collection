<script setup lang="ts">
import ThreeSceneCanvas from "@/components/webgl/ThreeSceneCanvas.vue";
import Vol1Scene from "@/webgl/scenes/Vol1Scene.js";
</script>

<template>
  <ThreeSceneCanvas :scene-class="Vol1Scene" />
</template>
