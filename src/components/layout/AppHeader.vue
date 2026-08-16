<script setup lang="ts">
defineProps<{
  pageName: string;
  hasAction: boolean;
}>();

defineEmits<{
  toggleNavigation: [];
}>();
</script>

<template>
  <v-app-bar
    density="compact"
    color="surface"
  >
    <v-btn
      icon
      variant="text"
      aria-label="ナビゲーションを開く"
      @click="$emit('toggleNavigation')"
    >
      <span
        class="menu-icon"
        aria-hidden="true"
      >☰</span>
    </v-btn>
    <v-app-bar-title class="app-title">
      WebGL Assignment Collection
      <span class="page-name">- {{ pageName }}</span>
    </v-app-bar-title>
    <span
      v-if="hasAction"
      class="action-hint"
    >Press Space Key</span>
  </v-app-bar>
</template>

<style scoped>
.menu-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.app-title {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
}

.page-name {
  font-weight: 700;
}

.action-hint {
  padding-inline-end: 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}

@media (max-width: 720px) {
  .page-name,
  .action-hint {
    display: none;
  }
}
</style>
