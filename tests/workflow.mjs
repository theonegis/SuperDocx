import { expect } from '@playwright/test';
export async function editAndComment(page) {
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled({ timeout: 60000 });
  const title = page.getByText('A LITTLE SPACE FOR BIG IDEAS', { exact: true });
  await title.click();
  await page.keyboard.insertText('OFFLINE_EDIT_2026 ');
  await expect(page.locator('#document-editor')).toContainText('OFFLINE_EDIT_2026', { timeout: 15000 });
  await expect(page.getByRole('status')).toContainText('未保存');
  const heading = page.getByText('一份文档，无限可能。', { exact: true });
  const box = await heading.boundingBox();
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.getByRole('tab', {name:'审阅',exact:true}).click();
  await page.getByRole('button', { name: '添加批注', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '批注内容' })).toBeVisible();
  await page.getByRole('textbox', { name: '批注内容' }).fill('离线批注验证：请核对标题。');
  await page.locator('form').getByRole('button', { name: '添加批注', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '批注内容' })).toHaveCount(0);
  await expect(page.locator('#document-editor')).toContainText('离线批注验证：请核对标题。', { timeout: 15000 });
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('button', { name: '添加批注', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(page.getByRole('button', { name: '添加批注', exact: true })).toBeEnabled();
}
