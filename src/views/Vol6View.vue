<script setup lang="ts">
import ShaderShadingCanvas from "@/components/webgl/ShaderShadingCanvas.vue";
</script>

<template>
  <div class="shader-comparison">
    <ShaderShadingCanvas
      label="VertexShaderShading"
      vertex-shader-path="/vol6/shader/VertexShaderShading/main.vert"
      fragment-shader-path="/vol6/shader/VertexShaderShading/main.frag"
    />
    <ShaderShadingCanvas
      label="FragmentShaderShading"
      vertex-shader-path="/vol6/shader/FragmentShaderShading/main.vert"
      fragment-shader-path="/vol6/shader/FragmentShaderShading/main.frag"
    />
  </div>
</template>

<style scoped>
.shader-comparison {
  display: grid;
  width: 100%;
  height: 100%;
  padding: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  place-items: center;
  overflow: auto;
}

@media (max-width: 900px) {
  .shader-comparison {
    grid-template-columns: 1fr;
    place-items: start center;
  }
}
</style>
