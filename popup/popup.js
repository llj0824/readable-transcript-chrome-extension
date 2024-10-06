// popup/popup.js

import { LLM_API_Utils } from './llm_api_utils.js';

const transcriptDisplay = document.getElementById('transcript-display');
const processedDisplay = document.getElementById('processed-display');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const segmentInfo = document.getElementById('segment-info');
const processBtn = document.getElementById('process-btn');
const loader = document.getElementById('loader');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

const openaiApiKeyInput = document.getElementById('openai-api-key');
const anthropicApiKeyInput = document.getElementById('anthropic-api-key');
const saveKeysBtn = document.getElementById('save-keys-btn');
const modelSelect = document.getElementById('model-select');

let transcript = [];
let segments = [];
let currentSegmentIndex = 0;
const segmentDuration = 20 * 60; // 20 minutes in seconds

let llmUtils = new LLM_API_Utils();

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  await llmUtils.loadApiKeys();
  loadApiKeysIntoUI();
  fetchTranscript();
  setupTabs();
  setupPagination();
  setupProcessButton();
  setupSaveKeysButton();
});

// Load API keys from storage and populate the UI
function loadApiKeysIntoUI() {
  openaiApiKeyInput.value = llmUtils.openai_api_key;
  anthropicApiKeyInput.value = llmUtils.anthropic_api_key;
}

// Save API keys to storage
function setupSaveKeysButton() {
  saveKeysBtn.addEventListener('click', async () => {
    const openaiKey = openaiApiKeyInput.value.trim();
    const anthropicKey = anthropicApiKeyInput.value.trim();

    await LLM_API_Utils.saveApiKeys(openaiKey, anthropicKey);
    await llmUtils.loadApiKeys(); // Reload the keys into the instance

    alert('API Keys saved successfully!');
  });
}

// Fetch transcript from the content script
function fetchTranscript() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "getTranscript" }, (response) => {
      if (response && response.transcript) {
        parseTranscript(response.transcript);
        paginateTranscript();
        displaySegment();
        updatePaginationButtons();
      } else {
        transcriptDisplay.textContent = "Transcript not available.";
      }
    });
  });
}

// Parse the raw transcript into an array of objects with timestamp and text
function parseTranscript(rawTranscript) {
  const lines = rawTranscript.split('\n');
  transcript = lines.map(line => {
    const match = line.match(/\[(\d+):(\d+)\]\s*(.*)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const timeInSeconds = minutes * 60 + seconds;
      return {
        timestamp: timeInSeconds,
        text: match[3]
      };
    }
    return null;
  }).filter(item => item !== null);
}

// Paginate the transcript into 20-minute segments
function paginateTranscript() {
  segments = [];
  let segmentStart = 0;
  let segmentEnd = segmentDuration;

  while (segmentStart < transcript.length) {
    let endIndex = transcript.findIndex(item => item.timestamp > segmentEnd, segmentStart);
    if (endIndex === -1) {
      endIndex = transcript.length;
    }
    const segment = transcript.slice(segmentStart, endIndex).map(item => `[${formatTime(item.timestamp)}] ${item.text}`).join('\n');
    segments.push(segment);
    segmentStart = endIndex;
    segmentEnd += segmentDuration;
  }

  if (segments.length === 0) {
    segments.push("No transcript available.");
  }

  currentSegmentIndex = 0;
  segmentInfo.textContent = `Segment ${currentSegmentIndex + 1} of ${segments.length}`;
}

// Format time from seconds to mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Display the current segment
function displaySegment() {
  transcriptDisplay.textContent = segments[currentSegmentIndex];
  processedDisplay.textContent = "Processed output will appear here.";
}

// Update pagination buttons
function updatePaginationButtons() {
  prevBtn.disabled = currentSegmentIndex === 0;
  nextBtn.disabled = currentSegmentIndex === segments.length - 1;
}

// Setup pagination button events
function setupPagination() {
  prevBtn.addEventListener('click', () => {
    if (currentSegmentIndex > 0) {
      currentSegmentIndex--;
      displaySegment();
      updatePaginationButtons();
      updateSegmentInfo();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentSegmentIndex < segments.length - 1) {
      currentSegmentIndex++;
      displaySegment();
      updatePaginationButtons();
      updateSegmentInfo();
    }
  });
}

// Update segment info display
function updateSegmentInfo() {
  segmentInfo.textContent = `Segment ${currentSegmentIndex + 1} of ${segments.length}`;
}

// Setup tab switching
function setupTabs() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Hide all tab contents
      tabContents.forEach(content => content.classList.add('hidden'));
      // Add active class to clicked button
      button.classList.add('active');
      // Show corresponding tab content
      const tab = button.getAttribute('data-tab');
      document.getElementById(tab).classList.remove('hidden');
    });
  });
}

// Setup process button event
function setupProcessButton() {
  processBtn.addEventListener('click', async () => {
    const selectedModel = modelSelect.value;
    const systemRole = "You are an assistant that summarizes and analyzes YouTube video transcripts.";

    const currentSegment = segments[currentSegmentIndex];
    if (!currentSegment || currentSegment === "No transcript available.") {
      alert('No transcript segment to process.');
      return;
    }

    loader.classList.remove('hidden');
    processedDisplay.textContent = "Processing...";

    try {
      const processedOutput = await llmUtils.call_llm(selectedModel, systemRole, currentSegment);
      processedDisplay.textContent = processedOutput;
    } catch (error) {
      processedDisplay.textContent = "Error processing with LLM.";
      console.error(error);
    } finally {
      loader.classList.add('hidden');
    }
  });
}