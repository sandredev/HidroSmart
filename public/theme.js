// Apply the saved theme before the page paints.
(() => {
  let preference = 'system'
  try {
    const saved = localStorage.getItem('hidrosmart-theme')
    if (['light', 'dark', 'system'].includes(saved)) preference = saved
  } catch { /* The system theme still works when storage is unavailable. */ }
  const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171e18' : '#f5f3e9')
})()
