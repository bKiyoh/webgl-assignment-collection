<script setup lang="ts">
import ThreeSceneCanvas from "@/components/webgl/ThreeSceneCanvas.vue";
import HomeScene from "@/webgl/scenes/HomeScene.js";
</script>

<template>
  <ThreeSceneCanvas :scene-class="HomeScene" />
</template>
