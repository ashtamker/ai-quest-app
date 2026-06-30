import { chromium } from 'playwright';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const jobs = [
  ['workbook/ai-quest-student-60min-he.html', 'workbook/ai-quest-student-60min-he.pdf'],
  ['workbook/ai-quest-instructor-60min-he.html', 'workbook/ai-quest-instructor-60min-he.pdf'],
  ['workbook/ai-quest-student-60min-ar.html', 'workbook/ai-quest-student-60min-ar.pdf'],
  ['workbook/ai-quest-instructor-60min-ar.html', 'workbook/ai-quest-instructor-60min-ar.pdf'],
];

const browser = await chromium.launch({ headless: true });
try {
  for (const [input, output] of jobs) {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(resolve(root, input)).href, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      })));
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page.pdf({
      path: resolve(root, output),
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await page.close();
    console.log(`Wrote ${output}`);
  }
} finally {
  await browser.close();
}
