/**
 * Opens the invoice HTML in a new browser window so the user can
 * interact with the toolbar (copy type, layout, notes, status) and
 * then click the built-in Print button.
 *
 * Uses document.write() instead of srcdoc/blob so the embedded
 * <script> tags execute correctly in all browsers.
 */
export function openInvoicePreview(html: string): void {
  if (typeof window === 'undefined') return;          // SSR guard

  const win = window.open(
    '',
    '_blank',
    'width=1000,height=780,scrollbars=yes,resizable=yes',
  );

  if (!win) {
    // Popup was blocked — fall back to a Blob URL tab (no toolbar interaction)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const tab  = window.open(url, '_blank');
    if (!tab) {
      alert(
        'Your browser blocked the invoice popup.\n' +
        'Please allow popups for this site and try again.',
      );
    }
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return;
  }

  // Write the full HTML and close the document so the browser
  // parses it completely — this is what makes <script> tags run.
  win.document.open();
  win.document.write(html);
  win.document.close();
}