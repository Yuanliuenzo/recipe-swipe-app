// LLM Abstraction Layer
// Provides unified interface for different LLM providers with retry logic and error handling

export class LLMService {
  constructor(provider = "ollama", config = {}) {
    this.provider = provider;
    this.config = {
      timeout: 60000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  // Main completion method - the 30-line wrapper Claude mentioned
  async complete({ prompt, schema = null, timeout = null }) {
    const effectiveTimeout = timeout || this.config.timeout;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(
          `🔄 LLM attempt ${attempt}/${this.config.maxRetries} (${this.provider})`
        );

        const result = await this._executeProvider(
          prompt,
          schema,
          effectiveTimeout
        );
        console.log(`✅ LLM success on attempt ${attempt}`);

        return this._parseResponse(result, schema);
      } catch (error) {
        console.error(`❌ LLM attempt ${attempt} failed:`, error.message);

        if (attempt === this.config.maxRetries) {
          throw new Error(
            `LLM failed after ${this.config.maxRetries} attempts: ${error.message}`,
            { cause: error }
          );
        }

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Provider-specific implementations
  async _executeProvider(prompt, schema, timeout) {
    switch (this.provider) {
      case "ollama":
        return this._ollamaComplete(prompt, timeout);
      case "openai":
        return this._openaiComplete(prompt, schema, timeout);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  // Ollama implementation
  async _ollamaComplete(prompt, timeout) {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:latest",
        prompt,
        stream: false
      }),
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.response };
  }

  // OpenAI implementation (placeholder for future use)
  async _openaiComplete(_prompt, _schema, _timeout) {
    // Implementation for OpenAI API
    throw new Error("OpenAI provider not yet implemented");
  }

  // Response parsing with schema support
  _parseResponse(result, schema) {
    console.log(`🐛 LLM DEBUG: Raw result:`, result);
    console.log(`🐛 LLM DEBUG: Schema:`, schema);

    if (!schema) {
      console.log(`🐛 LLM DEBUG: No schema, returning raw text`);
      return result.text;
    }

    try {
      // Try to parse as JSON if schema expects structured data
      if (schema.type === "object") {
        console.log(`🐛 LLM DEBUG: Trying to parse as JSON...`);
        const parsed = JSON.parse(result.text);
        console.log(`🐛 LLM DEBUG: Parsed JSON:`, parsed);
        return this._validateSchema(parsed, schema);
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to parse structured response, returning raw text"
      );
      console.log(`🐛 LLM DEBUG: Parse error:`, error.message);
      console.log(
        `🐛 LLM DEBUG: Text that failed to parse:`,
        `${result.text?.substring(0, 500)}...`
      );

      // 🛠️ FIXED: For recipe generation, wrap raw text in expected format
      if (schema.required && schema.required.includes("recipe")) {
        console.log(
          `🐛 LLM DEBUG: Wrapping raw text in { recipe: text } format`
        );
        return { recipe: result.text };
      }

      return result.text;
    }

    return result.text;
  }

  // Basic schema validation
  _validateSchema(data, schema) {
    // Simple validation - can be enhanced with json-schema
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }
    return data;
  }

  // Convenience method for recipe generation
  async generateRecipe(prompt, options = {}) {
    return this.complete({
      prompt,
      schema: { type: "object", required: ["recipe"] },
      timeout: options.timeout
    });
  }

  // Convenience method for suggestions with structured output
  async generateSuggestions(prompt, count = 5, options = {}) {
    const fullPrompt = `${prompt}

Please respond with exactly ${count} suggestions in JSON format:
{
  "suggestions": [
    { "title": "Recipe Title 1", "description": "Brief explanation" },
    { "title": "Recipe Title 2", "description": "Brief explanation" }
  ]
}`;

    return this.complete({
      prompt: fullPrompt,
      schema: {
        type: "object",
        required: ["suggestions"],
        properties: {
          suggestions: { type: "array" }
        }
      },
      timeout: options.timeout
    });
  }
}

// Global instance
export const llmService = new LLMService();
