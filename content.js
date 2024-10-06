function extractTranscript() {
  const transcriptLines = document.querySelectorAll('ytd-transcript-segment-renderer');
  const transcriptArray = [];

  transcriptLines.forEach((line) => {
    const timestampElement = line.querySelector('.segment-timestamp');
    const textElement = line.querySelector('.segment-text');

    const timestamp = timestampElement ? timestampElement.innerText.trim() : '';
    const words = textElement ? textElement.innerText.trim() : '';

    if (timestamp && words) {
      transcriptArray.push(`[${timestamp}] ${words}`);
    }
  });

  // Join the array into a single block of text with newlines
  return transcriptArray.join('\n');
}

// Listen for messages from the popup to send the transcript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTranscript") {
    const transcript = extractTranscript();
    sendResponse({ transcript });
  }
});