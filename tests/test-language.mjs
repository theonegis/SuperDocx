// Tests use isolated profiles; do not rely on the Linux host's locale.
export async function useTestLanguage(page, language = 'zh') {
  await page.waitForFunction(() => document.querySelector('.save-button')?.disabled === false, { timeout: 60000 });
  if (await page.evaluate(() => document.documentElement.lang) === (language === 'zh' ? 'zh-CN' : 'en')) return;
  await page.evaluate(language => localStorage.setItem('superdocx.language', language), language);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.save-button')?.disabled === false, { timeout: 60000 });
}
