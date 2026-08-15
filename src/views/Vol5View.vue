<script setup lang="ts">
import NativeWebGLCanvas from "@/components/webgl/NativeWebGLCanvas.vue";
import Vol5Scene from "@/webgl/scenes/Vol5Scene.js";
</script>

<template>
  <NativeWebGLCanvas :scene-class="Vol5Scene" />
</template>
