import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const requireBackend = createRequire(`${process.cwd()}/../chatbot-mvp/package.json`);
const { Client } = requireBackend('pg');
const password = 'BrowserTestPassword123!';

test('cadastro, confirmação, login, onboarding persistente e cobrança', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.test`;
  await page.goto('/signup');
  await page.getByLabel('Seu nome', { exact: true }).fill('Pessoa E2E');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Nome da empresa', { exact: true }).fill('Empresa E2E');
  await page.locator('input[type=password]').nth(0).fill(password);
  await page.getByLabel('Confirme a senha').fill(password);
  await page.getByRole('checkbox').nth(0).check(); await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: /Criar/ }).click();
  await expect(page).toHaveURL(/verification=pending/);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/Confirme seu e-mail antes/)).toBeVisible();
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  let link: string;
  try {
    const { rows } = await db.query('SELECT html FROM email_jobs WHERE recipient=$1 ORDER BY created_at DESC LIMIT 1', [email]);
    link = /href="([^"]*verify-email[^"]*)"/.exec(rows[0].html)![1].replace(/&amp;/g, '&');
  } finally { await db.end(); }
  await page.goto(link);
  await expect(page.getByText('E-mail confirmado. Sua conta está pronta para entrar.')).toBeVisible();
  await page.getByRole('link', { name: 'Ir para o login' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByLabel('Nome da empresa', { exact: true }).fill('Empresa E2E');
  await page.getByLabel('Segmento', { exact: true }).fill('Serviços');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Passo 2 de 6')).toBeVisible();
  await page.reload();
  const begin = page.getByRole('button', { name: 'Começar', exact: true });
  await expect(begin).toBeVisible();
  await begin.click();
  await expect(page.getByText('Passo 2 de 6')).toBeVisible();
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Conta e plano' })).toBeVisible();
  await page.getByRole('button', { name: 'Selecionar este plano' }).first().click();
  await expect(page.getByText('Solicitação registrada. Veja abaixo como concluir o pagamento.')).toBeVisible();
});

test('visitante não acessa operação e cliente não recebe dados de outra empresa', async ({ page, browser }) => {
  await page.goto('/operations'); await expect(page).toHaveURL(/login/);
  // Duas contas reais, sem mock do backend, com dados distintos no banco isolado.
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const hash = await requireBackend('argon2').hash(password);
  const ids: string[] = [];
  try {
    for (const suffix of ['A', 'B']) {
      const companyId = randomUUID(), userId = randomUUID(), email = `isolation-${randomUUID()}@example.test`;
      ids.push(email);
      await db.query(`INSERT INTO companies(id,name,whatsapp_phone_number_id,updated_at) VALUES($1,$2,$3,NOW())`, [companyId, `Empresa exclusiva ${suffix}`, `e2e-${companyId}`]);
      await db.query(`INSERT INTO users(id,company_id,name,email,password_hash,status,email_verified_at,company_role,updated_at) VALUES($1,$2,$3,$4,$5,'ACTIVE',NOW(),'OWNER',NOW())`, [userId, companyId, suffix, email, hash]);
    }
  } finally { await db.end(); }
  for (const [index, email] of ids.entries()) {
    const context = await browser.newContext(); const tab = await context.newPage();
    await tab.goto('http://127.0.0.1:3101/login');
    await tab.getByLabel('Email', { exact: true }).fill(email); await tab.getByLabel('Senha', { exact: true }).fill(password);
    await tab.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(tab).toHaveURL('http://127.0.0.1:3101/');
    await tab.goto('http://127.0.0.1:3101/account');
    await expect(tab.getByRole('heading', { name: 'Conta e plano' })).toBeVisible();
    await expect(tab.getByText(email, { exact: false })).toBeVisible();
    await expect(tab.getByText(ids[index ? 0 : 1], { exact: false })).toHaveCount(0);
    await tab.goto('http://127.0.0.1:3101/operations'); await expect(tab).toHaveURL('http://127.0.0.1:3101/');
    await context.close();
  }
});
