<script setup lang="ts">
import NativeWebGLCanvas from "@/components/webgl/NativeWebGLCanvas.vue";
import Vol8Scene from "@/webgl/scenes/Vol8Scene.js";
</script>

<template>
  <NativeWebGLCanvas :scene-class="Vol8Scene" />
</template>
