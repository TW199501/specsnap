export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard API unavailable (non-secure context or unsupported browser)');
  }
  await navigator.clipboard.writeText(text);
}
