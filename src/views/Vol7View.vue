<script setup lang="ts">
import NativeWebGLCanvas from "@/components/webgl/NativeWebGLCanvas.vue";
import Vol7Scene from "@/webgl/scenes/Vol7Scene.js";
</script>

<template>
  <NativeWebGLCanvas :scene-class="Vol7Scene" />
</template>
