/** Public editorial content shared by the browser and static HTML build. */
export interface SearchPage {
  path: string
  title: string
  heading: string
  description: string
  sections: Array<{ heading: string; text: string }>
}
export const searchPages: SearchPage[] = [
  {
    path: '/',
    title: 'Garmin Watch Face Builder | Wristo Studio',
    heading: 'Your watch. Your design.',
    description: 'Create a Garmin watch face with Wristo Studio’s visual editor. Arrange time, dates, data and images, then build for your supported Connect IQ device.',
    sections: [
      { heading: 'Make a watch face without writing code', text: 'Use the visual canvas to position time, date, data fields, icons and images. Choose a supported device before refining your layout so that the design fits its screen.' },
      { heading: 'Start with a design you can make your own', text: 'Browse the public gallery for inspiration. Where a creator has enabled remixing, use the available copy action to start from that design. Public visibility does not automatically grant permission to remix.' },
      { heading: 'From canvas to your Garmin', text: 'Save your design, create or select its app, and choose a supported device for a PRG build. Download the completed build for device testing. IQ packaging is a separate step for the Connect IQ publishing workflow.' },
      { heading: 'Check the details before you build', text: 'Device compatibility, available data fields and build access depend on your selected device, design and account. Check the current options shown in Studio. A successful build should still be tested on the target watch.' },
    ],
  },
  {
    path: '/guides/create-garmin-watch-face',
    title: 'How to Create a Garmin Watch Face Without Coding | Wristo Studio',
    heading: 'Make your first Garmin watch face.',
    description: 'A practical guide to choosing a device, arranging your watch face, saving a design and building it in Wristo Studio.',
    sections: [
      { heading: '1. Sign in and choose your starting point', text: 'Open the guided creation flow or browse the public gallery. Start a new design, or copy a public design if its creator has enabled remixing. Keep the source creator’s permissions in mind when reusing a design.' },
      { heading: '2. Select the watch you are designing for', text: 'Choose a supported device in Studio. Screen size and available features vary between Garmin models. Design for the target device rather than assuming one layout will work on every watch.' },
      { heading: '3. Arrange time, date and useful data', text: 'Add the elements you need and position them on the canvas. For a 454 × 454 design, start with data text around 36 pixels and date text and icons around 30 pixels; scale these for other resolutions. Improve spacing before shrinking important information.' },
      { heading: '4. Save and review', text: 'Save the design and reopen it to review the layout. Check contrast, long values and spacing around the screen edge. Limit decorative elements if they compete with the time or the data you check most often.' },
      { heading: '5. Build for your selected device', text: 'From your saved design, create or select an app and request a PRG build for a supported device. Wait for the build to complete, then download it. If the build fails, review its log and correct the reported issue before trying again.' },
      { heading: '6. Test on the watch', text: 'Follow the installation guide and check the actual display on your target watch. Verify the time, data updates and readability in daily use. A preview or completed build does not replace device testing.' },
    ],
  },
  {
    path: '/guides/install-garmin-watch-face',
    title: 'PRG Testing and IQ Packaging for Garmin Watch Faces | Wristo Studio',
    heading: 'Take your design to your watch.',
    description: 'Understand the difference between a device-specific PRG build, installing a test watch face and IQ packaging for Connect IQ publishing.',
    sections: [
      { heading: 'PRG: a build for a specific device', text: 'Select the target device when requesting a PRG build. Download the file only after the task completes successfully. Do not assume that a PRG compiled for one model is compatible with another.' },
      { heading: 'Use the guided PRG installer', text: 'Sign in to Studio and open the PRG installation guide for the current transfer steps and installer options. Connect the selected Garmin watch with a data-capable USB cable. Device storage access differs by watch model and operating system, so follow the instructions for your setup.' },
      { heading: 'Verify the installed face', text: 'After transferring the build and safely disconnecting the watch, select the face on the device. Check that it loads, that the time and data update, and that labels remain readable. If installation fails, first confirm the selected build device matches the watch.' },
      { heading: 'IQ: packaging for publishing', text: 'IQ packaging produces an artifact for the Connect IQ publishing workflow. Downloading an IQ file does not publish it to the store. Publishing requires the appropriate Garmin developer account and completion of Garmin’s submission and review process.' },
      { heading: 'Build access and troubleshooting', text: 'Use the current build controls in your account to check access and supported devices. For a failed task, inspect the build log before rebuilding. Keep the design and task details when contacting support.' },
    ],
  },
]
export function studioOrigin(value = 'https://studio.wristo.io'): string {
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid Studio origin')
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return 'https://studio.wristo.io'
  return url.origin
}
export const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
function renderPublicFooter(): string {
  return `<footer class="public-footer"><div class="public-footer-inner">
    <div class="public-footer-main">
      <div class="public-footer-brand"><a class="public-brand" href="/" aria-label="Wristo Studio home"><img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" width="36" height="36" alt="">Wristo<span class="public-brand-dot">.</span><span class="public-brand-label">Studio</span></a><p>A little more you, on your wrist.</p><div class="public-social"><a href="https://www.facebook.com/profile.php?id=61595658354976" target="_blank" rel="noopener noreferrer">Facebook ↗</a><a href="https://www.facebook.com/groups/wristo" target="_blank" rel="noopener noreferrer">Facebook Group ↗</a></div></div>
      <nav class="public-footer-links" aria-label="Quick links"><h2>Quick links</h2><a href="https://www.wristo.io/terms-and-conditions">Terms of use</a><a href="https://www.wristo.io/privacy-policy">Privacy policy</a><a href="https://www.wristo.io/contact">Contact us</a></nav>
      <div class="public-footer-contact"><h2>Contact us</h2><a class="public-email" href="mailto:support@wristo.io">support@wristo.io ↗</a><address><strong>WuKong OÜ</strong>Harju maakond, Tallinn, Kesklinna linnaosa,<br>Ahtri tn 12, 15551, Estonia</address></div>
    </div><div class="public-footer-bottom"><p>© ${new Date().getFullYear()} WuKong OÜ. All rights reserved.</p><a href="https://www.wristo.io/">Explore the Wristo Store ↗</a></div>
  </div></footer>`
}

export function renderSearchPage(page: SearchPage): string {
  const isHome = page.path === '/'
  const illustration = isHome ? `<figure class="public-hero-art"><div class="public-art-caption"><span class="public-status-dot"></span> A canvas for your everyday</div><img src="/studio-design-illustration.svg" width="620" height="430" alt="Design illustration: a mountain watch face with editable time and activity data." fetchpriority="high"><figcaption>YOUR IDEAS. YOUR TIME. YOUR WRIST.</figcaption></figure>` : ''
  return `<div class="studio-public ${isHome ? 'studio-public-home' : 'studio-public-guide'}">
    <a class="public-skip" href="#main-content">Skip to content</a>
    <header class="public-nav"><a class="public-brand" href="/" aria-label="Wristo Studio home"><img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" width="30" height="30" alt="">Wristo<span class="public-brand-dot">.</span><span class="public-brand-label">Studio</span></a><nav aria-label="Main navigation"><a href="/faces">Gallery</a><a href="/guides/create-garmin-watch-face">Learn</a><a class="public-nav-account" href="/designs">My designs <span aria-hidden="true">↗</span></a></nav></header>
    <main id="main-content"><section class="public-hero"><div class="public-hero-copy"><p class="public-eyebrow"><span class="public-status-dot"></span> GARMIN WATCH FACE STUDIO</p><h1>${escapeHtml(page.heading)}</h1><p class="public-lede">${escapeHtml(page.description)}</p><div class="public-actions"><a class="public-primary" href="/create-watch-face">Start designing <span aria-hidden="true">↗</span></a><a class="public-secondary" href="/faces">Explore the gallery <span aria-hidden="true">→</span></a></div>${isHome ? '<p class="public-hero-note">Visual design. No coding required.</p>' : ''}</div>${illustration}</section>
    ${isHome ? '<div class="public-workflow" aria-label="Creation workflow"><span><b>01</b> Choose your canvas</span><span><b>02</b> Make it yours</span><span><b>03</b> Build for your watch</span></div><header class="public-section-heading"><p class="public-eyebrow">MADE FOR MAKING</p><h2>A workspace for your next watch face.</h2><p>Start with the time. Add what matters to you.</p></header>' : ''}
    <div class="public-sections">${page.sections.map((section, index) => `<section><span class="public-step" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.text)}</p></div></section>`).join('')}</div>
    <aside class="public-guides" aria-label="Related guides"><div class="public-guides-heading"><p class="public-eyebrow">A LITTLE GUIDANCE</p><h2>From an idea<br>to your wrist.</h2><p>Take the next step with a practical guide.</p></div><div class="public-guide-links">${searchPages.filter(item => item.path !== page.path).map(item => `<a href="${item.path}"><span>${escapeHtml(item.title.replace(' | Wristo Studio', ''))}</span><span aria-hidden="true">↗</span></a>`).join('')}<a href="/prg-installer"><span>PRG installer guide <small>Sign in to continue</small></span><span aria-hidden="true">↗</span></a><a href="https://www.wristo.io/support"><span>Watch face support</span><span aria-hidden="true">↗</span></a></div></aside></main>${renderPublicFooter()}</div>`
}
export function searchPageSchema(page: SearchPage, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': page.path === '/' ? 'WebPage' : 'TechArticle',
    headline: page.title,
    description: page.description,
    url: origin + page.path,
    publisher: { '@type': 'Organization', name: 'Wristo', url: 'https://www.wristo.io' },
    ...(page.path === '/' ? {} : { author: { '@type': 'Organization', name: 'Wristo' } }),
  }
}
