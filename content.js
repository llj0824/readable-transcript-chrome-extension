
function extractTranscript() {
  const transcriptLines = document.querySelectorAll('ytd-transcript-segment-renderer');
  let transcriptArray = [];

  transcriptLines.forEach((line) => {
    let timestampElement = line.querySelector('.segment-timestamp');
    let textElement = line.querySelector('.segment-text');

    // Safeguard to avoid null errors
    let timestamp = timestampElement ? timestampElement.innerText : '';
    let words = textElement ? textElement.innerText : '';

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