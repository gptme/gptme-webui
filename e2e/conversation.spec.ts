import { test, expect } from '@playwright/test';

test.describe('Conversation Flow', () => {
  test('should show demo conversations and connect to server', async ({ page }) => {
    // Go to the app
    await page.goto('/');

    // Should show demo conversations initially
    await expect(page.getByText('Introduction to gptme')).toBeVisible();

    // Should show connection status
    const connectionButton = page.getByRole('button', { name: /Connect/i });
    await expect(connectionButton).toBeVisible();

    // Click the demo conversation
    await page.getByText('Introduction to gptme').click();

    // Should show the conversation content
    await expect(page.getByText(/Hello! I'm gptme, your AI programming assistant/)).toBeVisible();
  });

  test('should be able to send a message', async ({ page }) => {
    await page.goto('/');

    // Type a message
    await page.getByRole('textbox').fill('Hello');
    await page.keyboard.press('Enter');

    // Should show the message in the conversation
    // Look specifically for the user's message in a user message container
    await expect(page.locator('.role-user', { hasText: 'Hello' })).toBeVisible();
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    // Start with server unavailable
    await page.goto('/');

    // Should still show demo conversations
    await expect(page.getByText('Introduction to gptme')).toBeVisible();

    // Click connect button and try to connect to non-existent server
    const connectionButton = page.getByRole('button', { name: /Connect/i });
    await connectionButton.click();

    // Fill in invalid server URL and try to connect
    await page.getByLabel('Server URL').fill('http://localhost:1');
    await page.getByRole('button', { name: /^(Connect|Reconnect)$/ }).click();

    // Wait for error toast to appear
    await expect(page.getByText('Could not connect to gptme instance')).toBeVisible({
      timeout: 10000,
    });

    // Close the connection dialog by clicking outside
    await page.keyboard.press('Escape');

    // Verify connection button is in disconnected state
    await expect(connectionButton).toBeVisible();
    await expect(connectionButton).not.toHaveClass(/text-green-600/);
  });

  test('should create a new conversation', async ({ page }) => {
    await page.goto('/');

    // Click the "New Conversation" button (plus icon)
    await page.locator('button svg.lucide-plus').click();

    // Should navigate to a new conversation with timestamp query parameter
    await expect(page).toHaveURL(/\?conversation=\d+$/);

    // Type a message to start a new conversation
    await page.getByRole('textbox').fill('This is a new conversation');
    await page.keyboard.press('Enter');

    // Wait for the message to appear in the conversation
    await expect(
      page.locator('.role-user', { hasText: 'This is a new conversation' })
    ).toBeVisible();

    // The URL should remain the same after sending the message
    const url = page.url();
    await expect(page).toHaveURL(url);
  });

  test('should load API conversations on initial load', async ({ page }) => {
    await page.goto('/');

    // Should show demo conversations immediately
    await expect(page.getByText('Introduction to gptme')).toBeVisible();

    // Wait for successful connection
    await expect(page.getByRole('button', { name: /Connect/i })).toHaveClass(/text-green-600/, {
      timeout: 10000,
    });

    // Wait for success toast to confirm API connection
    await expect(page.getByText('Connected to gptme server')).toBeVisible();

    // Wait for conversations to load
    // Should show both demo conversations and connected conversations
    await expect(page.getByText('Introduction to gptme')).toBeVisible();

    // Wait for loading state to finish
    await expect(page.getByText('Loading conversations...')).toBeHidden();

    // Get the conversation list
    const conversationList = page.getByTestId('conversation-list');

    // Get all conversation titles
    const conversationTitles = await conversationList
      .locator('[data-testid="conversation-title"]')
      .allTextContents();
    console.log('Conversation titles:', conversationTitles);

    // Should have both demo and API conversations
    const demoConversations = conversationTitles.filter((title) => title.includes('Introduction'));
    const apiConversations = conversationTitles.filter((title) => /^\d+$/.test(title));

    expect(demoConversations.length).toBeGreaterThan(0);
    expect(apiConversations.length).toBeGreaterThan(0);

    // Verify timestamps
    const timestamps = await conversationList.getByRole('button').locator('time').allTextContents();
    console.log('Timestamps:', timestamps);

    // There should be some timestamps that aren't "just now"
    const nonJustNowTimestamps = timestamps.filter((t) => t !== 'just now');
    expect(nonJustNowTimestamps.length).toBeGreaterThan(0);
  });
});
