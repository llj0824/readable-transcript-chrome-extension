// llm_api_utils.js

import fs from 'fs';

// Class definition remains the same

class LLM_API_Utils {
  constructor() {
    const config = this.loadConfig();
    this.anthropic_api_key = config.anthropic_api_key || '';
    this.openai_api_key = config.openai_api_key || '';
    this.openai_endpoint = "https://api.openai.com/v1/chat/completions";
    this.anthropic_endpoint = "https://api.anthropic.com/v1/complete";
  }

  loadConfig() {
    try {
      const data = fs.readFileSync('config.json', 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading config file:", error);
      return {};
    }
  }

  async loadApiKeys() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['openai_api_key', 'anthropic_api_key'], (result) => {
        this.openai_api_key = result.openai_api_key || this.openai_api_key;
        this.anthropic_api_key = result.anthropic_api_key || this.anthropic_api_key;
        resolve();
      });
    });
  }

  static async saveApiKeys(openaiKey, anthropicKey) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({
        openai_api_key: openaiKey,
        anthropic_api_key: anthropicKey
      }, () => {
        resolve();
      });
    });
  }

  async call_gpt4(system_role, prompt, model = "chatgpt-4o-latest", max_tokens = 1000, temperature = 0.7) {
    if (!this.openai_api_key) {
      throw new Error("OpenAI API key is not set.");
    }

    const payload = {
      model: model,
      messages: [
        { role: "system", content: system_role },
        { role: "user", content: prompt }
      ],
      temperature: temperature,
      max_tokens: max_tokens
    };

    const response = await fetch(this.openai_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.openai_api_key}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async call_claude(system_role, prompt, model = "claude-3-5-sonnet-20240620", max_tokens = 4000, temperature = 0.5) {
    if (!this.anthropic_api_key) {
      throw new Error("Anthropic API key is not set.");
    }

    const headers = {
      "x-api-key": this.anthropic_api_key,
      "Content-Type": "application/json",
      "Anthropic-Version": "2023-06-01"
    };

    const payload = {
      model: model,
      prompt: `${system_role}\n\n${prompt}`,
      max_tokens_to_sample: max_tokens,
      temperature: temperature
    };

    const response = await fetch(this.anthropic_endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.completion.trim();
  }

  async call_llm(model_name, system_role, prompt, max_tokens = 4000, temperature = 0.5) {
    try {
      if (model_name.toLowerCase().startsWith("claude")) {
        return await this.call_claude(system_role, prompt, model_name, max_tokens, temperature);
      } else {
        return await this.call_gpt4(system_role, prompt, model_name, max_tokens, temperature);
      }
    } catch (error) {
      console.error("LLM API call error:", error);
      return "An error occurred while processing your request.";
    }
  }
}

// Export the LLM_API_Utils class
export { LLM_API_Utils };