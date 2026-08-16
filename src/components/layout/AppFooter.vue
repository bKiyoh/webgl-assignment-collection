<template>
  <v-footer
    app
    height="44"
    color="surface"
    class="app-footer"
  >
    <span>By bKiyoh</span>
    <v-btn
      href="https://x.com/bKiyoh"
      target="_blank"
      rel="noopener noreferrer"
      icon
      size="small"
      variant="text"
      aria-label="bKiyohのXプロフィールを開く"
    >
      <img
        src="/x_logo.svg"
        alt=""
        width="13"
        height="24"
      >
    </v-btn>
  </v-footer>
</template>

<style scoped>
.app-footer {
  justify-content: flex-end;
  gap: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
}
</style>
