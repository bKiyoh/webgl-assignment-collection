import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  { path: "/", component: () => import("@/views/HomeView.vue") },
  { path: "/vol1", component: () => import("@/views/Vol1View.vue") },
  { path: "/vol2", component: () => import("@/views/Vol2View.vue") },
  { path: "/vol3", component: () => import("@/views/Vol3View.vue") },
  { path: "/vol4", component: () => import("@/views/Vol4View.vue") },
  { path: "/vol5", component: () => import("@/views/Vol5View.vue") },
  { path: "/vol6", component: () => import("@/views/Vol6View.vue") },
  { path: "/vol7", component: () => import("@/views/Vol7View.vue") },
  { path: "/vol8", component: () => import("@/views/Vol8View.vue") },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach(() => {
  document.title = "WebGL Assignment Collection";
});
