import { test, expect } from '@playwright/test';
import sharp from 'sharp';
test('ordinateur et téléphone : capture, synchronisation et absence de faux résultat IA', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login?register=1');
  await page.getByLabel('Nom de votre espace').fill('Société de test');
  await page.getByLabel('Adresse email').fill('browser@example.test');
  await page.getByLabel(/Mot de passe/).fill('test-password-long-123!');
  await page.getByRole('button', { name: 'Créer mon espace', exact: true }).click();
  await page.waitForURL('**/app');
  await expect(page.getByLabel('Espace actif')).toHaveValue(/.+/);
  await page.getByRole('button', { name: 'Scanner un courrier', exact: true }).click();
  const link = await page
    .getByRole('link', { name: 'Ouvrir la capture sur cet appareil' })
    .getAttribute('href');
  expect(link).toContain('/scan#');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await context.newPage();
  await phone.goto(link!);
  await expect(phone.getByText('Photographier la première page', { exact: true })).toBeVisible();
  expect(new URL(phone.url()).hash).toBe('');
  const image = await sharp({ create: { width: 20, height: 30, channels: 3, background: '#fff' } })
    .jpeg()
    .toBuffer();
  for (let n = 1; n <= 2; n++) {
    await phone
      .getByLabel('Photographier une page', { exact: true })
      .setInputFiles({ name: 'page.jpg', mimeType: 'image/jpeg', buffer: image });
    await expect(phone.getByText(`${n} / 20 pages transmises`)).toBeVisible();
  }
  await expect(page.getByText('2 page(s) reçue(s) · Téléphone connecté')).toBeVisible();
  await phone.getByRole('button', { name: 'Terminer et analyser' }).click();
  await expect(phone.getByRole('heading', { name: 'C’est dans la boîte.' })).toBeVisible();
  await page.getByRole('button', { name: 'Voir le courrier', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Détails du courrier' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le courrier' }).click();
  await expect(page.getByText('À relancer', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Nouveau courrier/ }).click();
  await expect(page.getByText('Mistral OCR non configuré.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le courrier' }).click();
  await page.getByRole('button', { name: /Calendrier & actions/ }).click();
  await expect(page.getByRole('heading', { name: 'Votre calendrier' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Préférences', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connexions' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
  await context.close();
});
