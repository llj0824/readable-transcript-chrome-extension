// popup/popup.js

import { LLM_API_Utils } from './llm_api_utils.js';
import { YoutubeTranscript } from 'youtube-transcript';

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
const SEGMENT_DURATION = 20 * 60; // 20 minutes in seconds

const llmUtils = new LLM_API_Utils();

// Initialize the popup
document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  try {
    await llmUtils.loadApiKeys();
    loadApiKeysIntoUI();
    const videoId = await getCurrentVideoId();
    if (videoId) {
      await fetchTranscript(videoId);
      parseTranscript(transcript);
      paginateTranscript();
      displaySegment();
      updatePaginationButtons();
    } else {
      console.error('Video ID not found.');
      transcriptDisplay.textContent = 'Unable to retrieve video ID.';
    }
    setupTabs();
    setupPagination();
    setupProcessButton();
    setupSaveKeysButton();
  } catch (error) {
    console.error('Error initializing popup:', error);
    transcriptDisplay.textContent = 'Error initializing popup.';
  }
}

// Retrieve the current video ID from the active tab
async function getCurrentVideoId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        resolve(null);
        return;
      }
      const tab = tabs[0];
      const url = new URL(tab.url);
      const videoId = url.searchParams.get('v');
      resolve(videoId);
    });
  });
}

// Load API keys from storage and populate the UI
function loadApiKeysIntoUI() {
  openaiApiKeyInput.value = llmUtils.openai_api_key || '';
  anthropicApiKeyInput.value = llmUtils.anthropic_api_key || '';
}

// Save API keys to storage
function setupSaveKeysButton() {
  saveKeysBtn.addEventListener('click', async () => {
    const openaiKey = openaiApiKeyInput.value.trim();
    const anthropicKey = anthropicApiKeyInput.value.trim();

    try {
      await LLM_API_Utils.saveApiKeys(openaiKey, anthropicKey);
      await llmUtils.loadApiKeys(); // Reload the keys into the instance
      alert('API Keys saved successfully!');
    } catch (error) {
      console.error('Error saving API keys:', error);
      alert('Failed to save API Keys.');
    }
  });
}

// Function to fetch and process the transcript
async function fetchTranscript(videoId) {
  try {
    const fetchedTranscript = await YoutubeTranscript.fetchTranscript(videoId);
    transcript = fetchedTranscript.map(item => `[${formatTimestamp(item.start)}] ${item.text}`).join('\n');
    console.log(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    transcriptDisplay.textContent = 'Error fetching transcript.';
  }
}

// Parse the raw transcript into an array of objects with timestamp and text
function parseTranscript(rawTranscript) {
  transcript = rawTranscript.split('\n').map(line => {
    const match = line.match(/\[(\d+):(\d+)\]\s*(.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
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
  let segmentStartIndex = 0;

  while (segmentStartIndex < transcript.length) {
    const segmentEndTime = transcript[segmentStartIndex].timestamp + SEGMENT_DURATION;
    let endIndex = transcript.findIndex(item => item.timestamp > segmentEndTime, segmentStartIndex);
    if (endIndex === -1) endIndex = transcript.length;

    const segment = transcript.slice(segmentStartIndex, endIndex)
      .map(item => `[${formatTime(item.timestamp)}] ${item.text}`)
      .join('\n');
    segments.push(segment);
    segmentStartIndex = endIndex;
  }

  if (segments.length === 0) {
    segments.push("No transcript available.");
  }

  currentSegmentIndex = 0;
  updateSegmentInfo();
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
      const tabContent = document.getElementById(tab);
      if (tabContent) {
        tabContent.classList.remove('hidden');
      }
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
      console.error('LLM processing error:', error);
    } finally {
      loader.classList.add('hidden');
    }
  });
}

// Format timestamp in seconds to mm:ss
function formatTimestamp(startSeconds) {
  const mins = Math.floor(startSeconds / 60);
  const secs = Math.floor(startSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}