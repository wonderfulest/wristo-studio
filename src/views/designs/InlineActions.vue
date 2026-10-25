<template>
  <details class="inline-actions">
    <summary>Design &amp; versions <span>＋</span></summary>
    <div class="secondary-actions"><slot /></div>
  </details>
</template>
<style scoped>
.inline-actions { width: 100%; border-top: 1px solid var(--studio-border); margin-top: 2px; }
summary { display: flex; align-items: center; justify-content: space-between; padding: 14px 2px 4px; list-style: none; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--studio-text-muted); }
summary::-webkit-details-marker { display: none; }
summary span { font-size: 15px; font-weight: 400; }
.inline-actions[open] summary span { transform: rotate(45deg); }
.secondary-actions { padding-top: 12px; }
summary:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 3px; }
</style>
