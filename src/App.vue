<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppFooter from "@/components/layout/AppFooter.vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppNavigation from "@/components/layout/AppNavigation.vue";
import { LINK_DATA } from "@/constants/linkData";

const route = useRoute();
const navigationOpen = ref(false);
const currentPage = computed(
  () => LINK_DATA.find((link) => link.path === route.path) ?? LINK_DATA[0],
);

watch(
  () => route.path,
  () => {
    navigationOpen.value = false;
  },
);
</script>

<template>
  <v-app>
    <AppHeader
      :page-name="currentPage.name"
      :has-action="currentPage.hasAction"
      @toggle-navigation="navigationOpen = !navigationOpen"
    />
    <AppNavigation v-model="navigationOpen" />

    <v-main class="app-main">
      <RouterView />
    </v-main>

    <AppFooter />
  </v-app>
</template>
