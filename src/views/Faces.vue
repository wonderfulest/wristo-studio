<template>
  <div class="faces-page">
    <GlobalHeader />

    <main>
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-copy">
            <p class="eyebrow">MADE FOR YOUR GARMIN</p>
            <h1>
              Find your next
              <br />
              watch face.
            </h1>
            <p class="intro">
              Discover watch faces made by independent creators.
              <br class="desktop-break" />
              Find your favorite, or bring your own idea to life.
            </p>
            <form class="search" role="search" @submit.prevent="search">
              <label class="sr-only" for="face-search">Search watch faces</label>
              <input id="face-search" v-model="draft" type="search" placeholder="Search watch faces…" />
              <button type="submit">
                Search
                <span aria-hidden="true">↗</span>
              </button>
            </form>
            <div v-if="popularDevices.length" class="popular">
              <span>POPULAR</span>
              <button v-for="item in popularDevices" :key="item.id" :class="{ selected: device === String(item.id) }" @click="chooseDevice(item.id)">{{ item.displayName }}</button>
            </div>
            <p class="create-link">
              Something uniquely yours?
              <RouterLink to="/design">Open Wristo Studio →</RouterLink>
            </p>
          </div>
          <div class="hero-faces" aria-label="Featured watch faces">
            <RouterLink v-for="face in featured" :key="face.appId" :to="faceDetailsUrl(face.appId)" :aria-label="face.name"><img :src="faceImage(face)" :alt="face.name" @error="hideBrokenImage" /></RouterLink>
            <div v-if="!featured.length" class="hero-message">
              <span>
                YOUR WATCH.
                <br />
                YOUR STYLE.
              </span>
              <small>Explore the collection below ↓</small>
            </div>
          </div>
        </div>
      </section>

      <section class="catalog" aria-labelledby="catalog-title" :aria-busy="loading">
        <div class="catalog-toolbar">
          <div>
            <p class="eyebrow">THE WRISTO COLLECTION</p>
            <h2 id="catalog-title">{{ keyword ? `Results for “${keyword}”` : sort === 'download:desc' ? 'Popular watch faces' : 'Fresh from our creators' }}</h2>
            <p class="result-count">{{ loading ? 'Finding your next favorite…' : `${total.toLocaleString()} watch faces` }}</p>
          </div>
          <div class="filters">
            <label>
              Device
              <select v-model="device" @change="resetPage">
                <option value="">All devices</option>
                <option v-for="item in devices" :key="item.id" :value="String(item.id)">{{ item.displayName }}</option>
              </select>
            </label>
            <label>
              Sort
              <span v-if="keyword">Relevance</span>
              <select v-else v-model="sort" @change="resetPage">
                <option value="download:desc">Most popular</option>
                <option value="createdAt:desc">Newest</option>
              </select>
            </label>
          </div>
        </div>
        <div v-if="error" class="empty" role="alert">
          <h3>We couldn’t load the collection.</h3>
          <p>{{ error }}</p>
          <button @click="refresh">Try again</button>
        </div>
        <div v-else-if="loading" class="face-grid">
          <div v-for="n in 10" :key="n" class="skeleton">
            <div></div>
            <span></span>
          </div>
        </div>
        <div v-else-if="!faces.length" class="empty">
          <h3>No faces found.</h3>
          <p>Try another search or choose a different device.</p>
          <button @click="clearFilters">Browse all faces</button>
        </div>
        <div v-else class="face-grid">
          <article v-for="face in faces" :key="face.appId" class="face-card">
            <RouterLink :to="faceDetailsUrl(face.appId)" class="face-art">
              <img v-if="faceImage(face)" :src="faceImage(face)" :alt="face.name" loading="lazy" @error="hideBrokenImage" />
              <span v-else class="image-placeholder">Preview unavailable</span>
            </RouterLink>
            <div class="face-info">
              <RouterLink :to="faceDetailsUrl(face.appId)" class="face-name">{{ face.name }}</RouterLink>
              <div class="face-meta">
                <span>{{ face.price === 0 ? 'Free' : face.price == null ? 'View pricing' : `$${face.price.toFixed(2)}` }}</span>
                <span v-if="face.download != null">↓ {{ face.download.toLocaleString() }}</span>
                <span v-if="face.ratingCount">★ {{ (face.averageRating || 0).toFixed(1) }}</span>
              </div>
            </div>
          </article>
        </div>
        <div v-if="!loading && !error && pages > 1" class="pagination">
          <button :disabled="page === 1" @click="changePage(-1)">← Previous</button>
          <span>Page {{ page }} of {{ pages }}</span>
          <button :disabled="page >= pages" @click="changePage(1)">Next →</button>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="footer-main">
        <div class="footer-intro">
          <RouterLink to="/faces" class="footer-brand">
            <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="" width="28" height="28" />
            <span>Wristo Studio</span>
          </RouterLink>
          <p>Create and share watch faces for Garmin devices — no coding needed.</p>
          <small>Not affiliated with Garmin Ltd.</small>
        </div>
        <nav aria-label="Footer tools" class="footer-column">
          <h2>Tools</h2>
          <RouterLink to="/design">Wristo Studio</RouterLink>
          <RouterLink to="/fonts/bitmap-maker">Bitmap Font Maker</RouterLink>
          <RouterLink to="/prg-installer">Installer</RouterLink>
        </nav>
        <nav aria-label="Footer resources" class="footer-column">
          <h2>Resources</h2>
          <RouterLink to="/wiki">Wiki & FAQ</RouterLink>
          <RouterLink to="/FAQ">Help &amp; FAQ</RouterLink>
          <a href="https://wiki.wristo.io/" target="_blank" rel="noopener noreferrer">Wristo Wiki</a>
        </nav>
        <nav aria-label="Footer account" class="footer-column">
          <h2>Account</h2>
          <RouterLink to="/profile">My account</RouterLink>
          <RouterLink to="/pricing" class="footer-premium">Premium plans <span aria-hidden="true">✦</span></RouterLink>
          <a href="mailto:support@wristo.io">Contact us</a>
        </nav>
      </div>
      <div class="footer-bottom">
        <p>© {{ new Date().getFullYear() }} Wristo. All rights reserved.</p>
        <nav aria-label="Legal">
          <a href="https://wristo.io/terms-and-conditions">Terms and Conditions</a>
          <a href="https://wristo.io/privacy-policy">Privacy Policy</a>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import '@fontsource/roboto-condensed/latin-700.css'
import '@fontsource/yantramanav/latin-400.css'
import '@fontsource/yantramanav/latin-700.css'
import GlobalHeader from '@/components/layout/GlobalHeader.vue'
import { faceDetailsUrl, faceImage, loadFaces, loadFaceDevices, type PublishedFace, type FaceDevice } from './faces/catalog'
const faces = ref<PublishedFace[]>([])
const featured = ref<PublishedFace[]>([])
const devices = ref<FaceDevice[]>([])
const draft = ref(''),
  keyword = ref(''),
  device = ref(String(useRoute().query.device || '')),
  sort = ref('createdAt:desc')
const page = ref(1),
  pages = ref(0),
  total = ref(0),
  loading = ref(true),
  error = ref('')
let request = 0
const popularDevices = computed(() => {
  const picks = [
    { pattern: /fēnix.*7X/, label: 'fēnix 7X' },
    { pattern: /epix.*\(Gen 2\)/, label: 'epix (Gen 2)' },
    { pattern: /Forerunner.*965/, label: 'Forerunner 965' },
    { pattern: /Venu.*3$/, label: 'Venu 3' }
  ]
  return picks.flatMap((pick) => {
    const item = devices.value.find((device) => pick.pattern.test(device.displayName))
    return item ? [{ ...item, displayName: pick.label }] : []
  })
})
async function refresh() {
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const result = await loadFaces({ keyword: keyword.value, device: device.value, sort: sort.value, page: page.value })
    if (current !== request) return
    faces.value = result.list || []
    total.value = result.total
    pages.value = result.pages
    if (!featured.value.length) featured.value = faces.value.filter((face) => faceImage(face)).slice(0, 3)
  } catch (cause) {
    if (current === request) error.value = cause instanceof Error ? cause.message : 'Please try again.'
  } finally {
    if (current === request) loading.value = false
  }
}
function resetPage() {
  page.value = 1
  void refresh()
}
function search() {
  keyword.value = draft.value.trim()
  resetPage()
}
function chooseDevice(id: number) {
  device.value = device.value === String(id) ? '' : String(id)
  resetPage()
}
function clearFilters() {
  draft.value = ''
  keyword.value = ''
  device.value = ''
  resetPage()
}
function changePage(delta: number) {
  page.value += delta
  void refresh()
  document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth' })
}
function hideBrokenImage(event: Event) {
  ;(event.target as HTMLImageElement).style.visibility = 'hidden'
}
onMounted(() => {
  void refresh()
  void loadFaceDevices()
    .then((result) => {
      devices.value = result
    })
    .catch(() => {
      /* Catalog remains usable if devices are unavailable. */
    })
})
</script>

<style scoped>
.faces-page {
  --ink: #252b29;
  --muted: #707771;
  --line: #e4e7e1;
  --accent: #c9ed75;
  background: #fff;
  color: var(--ink);
  min-height: 100vh;
  font-family: 'Yantramanav', sans-serif;
  font-size: 16px;
}
a {
  color: inherit;
  text-decoration: none;
}
.hero {
  background: #f7f8f3;
  border-bottom: 1px solid var(--line);
}
.hero-inner {
  max-width: 1280px;
  margin: auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 35px;
  align-items: center;
  padding: 64px 24px 50px;
}
.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 0 0 15px;
  color: var(--muted);
}
h1 {
  font-family: 'Roboto Condensed', sans-serif;
  font-size: clamp(42px, 4vw, 62px);
  line-height: 1.02;
  letter-spacing: -1.8px;
  margin: 0 0 21px;
  font-weight: 750;
}
.intro {
  color: #606761;
  line-height: 1.5;
  margin: 0 0 25px;
  font-size: 18px;
}
.search {
  display: flex;
  border: 1px solid #d9ded1;
  border-radius: 9px;
  overflow: hidden;
  max-width: 570px;
  background: white;
  box-shadow: 0 8px 22px #252b2908;
}
.search input {
  min-width: 0;
  flex: 1;
  border: 0;
  padding: 17px 18px;
  font: inherit;
  background: transparent;
  color: var(--ink);
}
button {
  font: inherit;
  cursor: pointer;
  color: inherit;
}
.search button {
  background: var(--accent);
  border: 0;
  padding: 0 24px;
  font-weight: 700;
}
.search button span {
  margin-left: 15px;
}
.popular {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 16px;
}
.popular > span {
  font-size: 10px;
  letter-spacing: 1.5px;
  margin-right: 4px;
  color: var(--muted);
}
.popular button {
  background: transparent;
  border: 1px solid #d7dccf;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 12px;
}
.popular button.selected {
  background: var(--accent);
}
.create-link {
  font-size: 14px;
  color: var(--muted);
  margin: 24px 0 0;
}
.create-link a {
  color: var(--ink);
  border-bottom: 1px solid #a8b39d;
  margin-left: 4px;
}
.hero-faces {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
}
.hero-faces a {
  width: 34%;
  filter: drop-shadow(0 20px 15px #252b2920);
  transition: transform 0.2s;
}
.hero-faces a:nth-child(2) {
  width: 43%;
  margin: 0 -5%;
  z-index: 1;
  transform: translateY(-10px);
}
.hero-faces a:hover {
  transform: translateY(-8px);
}
.hero-faces img {
  width: 100%;
  max-height: 330px;
  object-fit: contain;
}
.hero-message {
  border: 1px solid #dbe2cf;
  border-radius: 50%;
  height: 260px;
  width: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 18px;
  background: #edf2e5;
  text-align: center;
}
.hero-message span {
  font-family: 'Roboto Condensed', sans-serif;
  font-weight: 700;
  font-size: 36px;
  line-height: 1;
}
.hero-message small {
  font-size: 12px;
  color: var(--muted);
}
.catalog {
  max-width: 1280px;
  margin: auto;
  padding: 38px 24px 64px;
}
.catalog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 26px;
}
.catalog-toolbar .eyebrow {
  margin-bottom: 8px;
}
h2 {
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 28px;
  margin: 0;
  line-height: 1.15;
}
.result-count {
  font-size: 13px;
  color: var(--muted);
  margin: 7px 0 0;
}
.filters {
  display: flex;
  gap: 12px;
}
.filters label {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 10px 12px;
  color: var(--muted);
  font-size: 13px;
}
.filters select {
  font: inherit;
  font-weight: 600;
  color: var(--ink);
  border: 0;
  background: white;
  max-width: 170px;
}
.face-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 22px 18px;
}
.face-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}
.face-card:hover {
  box-shadow: 0 8px 24px #252b2910;
  transform: translateY(-3px);
}
.face-art {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: #f4f5f0;
  padding: 12px;
}
.face-art img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.face-info {
  padding: 13px 14px;
}
.face-name {
  display: block;
  font-weight: 700;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.face-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--muted);
  margin-top: 8px;
}
.face-meta span:first-child {
  margin-right: auto;
}
.image-placeholder {
  font-size: 12px;
  color: var(--muted);
}
.empty {
  text-align: center;
  padding: 65px 15px;
  color: var(--muted);
}
.empty h3 {
  color: var(--ink);
}
.empty button,
.pagination button {
  background: #f1f4e9;
  border: 1px solid #dbe2cf;
  padding: 10px 18px;
  border-radius: 6px;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-top: 36px;
  font-size: 14px;
}
button:disabled {
  opacity: 0.4;
  cursor: default;
}
.skeleton {
  border: 1px solid var(--line);
  padding: 12px;
  border-radius: 10px;
}
.skeleton div {
  aspect-ratio: 1;
  background: #f0f2eb;
  border-radius: 7px;
}
.skeleton span {
  display: block;
  height: 15px;
  background: #f0f2eb;
  width: 70%;
  margin: 18px 0 6px;
}
.site-footer {
  border-top: 1px solid var(--line);
  background: #fff;
  color: #626963;
  font-size: 14px;
}
.footer-main {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 48px;
  padding: 36px 32px 30px;
}
.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 18px;
  font-weight: 700;
}
.footer-intro p {
  max-width: 290px;
  margin: 12px 0 8px;
  line-height: 1.6;
}
.footer-intro small { font-size: 12px; }
.footer-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.footer-column h2 {
  margin: 3px 0 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
}
.footer-column a { line-height: 1.6; }
.footer-column .footer-premium { color: #94651b; }
.site-footer a:hover {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px 32px;
  border-top: 1px solid #f0f1ee;
  padding: 16px 32px;
  font-size: 12px;
}
.footer-bottom p { margin: 0; }
.footer-bottom nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}
@media (max-width: 800px) {
  .footer-main {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px;
    padding: 28px 24px;
  }
  .footer-bottom { flex-wrap: wrap; padding: 16px 24px; }
}
@media (max-width: 520px) {
  .footer-main { gap: 24px 16px; padding: 28px 20px; }
  .footer-intro { grid-column: 1 / -1; }
  .footer-bottom { padding: 16px 20px; }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #608928;
  outline-offset: 3px;
}
@media (max-width: 1100px) {
  .face-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 800px) {
  .hero-inner {
    grid-template-columns: 1fr;
    padding: 36px 24px;
  }
  .hero-faces {
    display: none;
  }
  .catalog-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .face-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .filters {
    flex-wrap: wrap;
  }
  .hero-copy {
    max-width: 600px;
  }
}
@media (max-width: 520px) {
  .face-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 10px;
  }
  .face-info {
    padding: 11px;
  }
  .catalog {
    padding: 28px 16px 42px;
  }
  .hero-inner {
    padding: 34px 20px;
  }
  .intro {
    font-size: 16px;
  }
  .search button {
    padding: 0 18px;
  }
  .desktop-break {
    display: none;
  }
  .filters label {
    padding: 9px;
  }
  .filters select {
    max-width: 140px;
  }
  .pagination {
    gap: 12px;
  }
  .pagination button {
    padding: 8px 10px;
  }
}
</style>
