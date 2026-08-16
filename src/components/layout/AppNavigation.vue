<script setup lang="ts">
import { LINK_DATA } from "@/constants/linkData";

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <v-navigation-drawer
    :model-value="modelValue"
    temporary
    color="surface"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-list-item
      class="navigation-title"
      title="WebGL School"
    />
    <v-divider />
    <v-list
      nav
      density="comfortable"
    >
      <v-list-item
        v-for="link in LINK_DATA"
        :key="link.path"
        :to="link.path"
        :title="link.name"
        color="primary"
        rounded="lg"
        @click="emit('update:modelValue', false)"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
.navigation-title {
  min-height: 56px;
  font-weight: 700;
}
</style>
