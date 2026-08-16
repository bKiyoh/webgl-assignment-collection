<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

type ThreeScene = {
  render: () => void;
  dispose: () => void;
  load?: () => Promise<unknown>;
  init?: () => void;
};

type ThreeSceneConstructor = new (
  wrapper: HTMLDivElement,
  width: number,
  height: number,
) => ThreeScene;

const props = withDefaults(
  defineProps<{
    sceneClass: ThreeSceneConstructor;
    loadBeforeRender?: boolean;
  }>(),
  {
    loadBeforeRender: false,
  },
);

const host = useTemplateRef<HTMLDivElement>("host");
const loading = ref(true);
const errorMessage = ref("");
let scene: ThreeScene | undefined;
let active = true;

onMounted(async () => {
  if (!host.value) return;

  try {
    scene = new props.sceneClass(
      host.value,
      window.innerWidth,
      window.innerHeight,
    );

    if (props.loadBeforeRender) {
      await scene.load?.();
      if (!active) return;
      scene.init?.();
    }

    scene.render();
    loading.value = false;
  } catch (error) {
    if (!active) return;
    console.error(error);
    errorMessage.value = "WebGLシーンの読み込みに失敗しました。";
    loading.value = false;
    scene?.dispose();
  }
});

onBeforeUnmount(() => {
  active = false;
  scene?.dispose();
  host.value?.replaceChildren();
});
</script>

<template>
  <section class="webgl-view">
    <div
      ref="host"
      class="webgl-host"
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
  </section>
</template>
