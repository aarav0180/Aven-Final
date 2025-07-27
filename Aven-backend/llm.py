import requests
import os
import logging
import google.generativeai as genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MODEL = "meta-llama/llama-3.2-3b-instruct:free"
GEMINI_FLASH_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent?key="

def call_llm(messages, stream=False):
    gemini_response, gemini_success = call_gemini(messages)
    if gemini_success:
        return gemini_response
    else:
        logger.info("Gemini failed, falling back to OpenRouter.")
        openrouter_response = call_openrouter(messages, stream=stream)
        return f"[Gemini failed: {gemini_response}]\n[OpenRouter fallback]: {openrouter_response}"


def call_gemini(messages):
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not set.")
        return "[Gemini API key not set]", False
    # Flatten all system/context/instructional prompts and chat history into a single user message
    system_prompts = []
    chat_turns = []
    user_query = None
    for msg in messages:
        if msg["role"] == "system":
            system_prompts.append(msg["content"])
        elif msg["role"] == "user":
            user_query = msg["content"]
        elif msg["role"] == "assistant":
            chat_turns.append(f"Assistant: {msg['content']}")
        elif msg["role"] == "user":
            chat_turns.append(f"User: {msg['content']}")
    # Compose a single prompt
    prompt_parts = []
    if system_prompts:
        prompt_parts.append("\n".join(system_prompts))
    if chat_turns:
        prompt_parts.append("\n".join(chat_turns))
    if user_query:
        prompt_parts.append(f"User: {user_query}")
    final_prompt = "\n".join(prompt_parts)
    logger.info(f"Gemini final prompt: {final_prompt}")
    # Use Gemini SDK if available
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(final_prompt)
        if hasattr(response, 'text') and response.text:
            return response.text, True
        logger.warning("Gemini SDK returned no text.")
        return "[Gemini SDK returned no text]", False
    except Exception as e:
        logger.error(f"Gemini SDK error: {e}", exc_info=True)
        # Fallback to HTTP API
        url = GEMINI_FLASH_URL + GEMINI_API_KEY
        payload = {"contents": [{"role": "user", "parts": [{"text": final_prompt}]}]}
        headers = {"Content-Type": "application/json"}
        logger.info(f"Calling Gemini Flash LLM with payload: {payload}")
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json()
            logger.info(f"Gemini LLM response: {result}")
            candidates = result.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"], True
            logger.warning("Gemini LLM returned no valid candidates.")
            return "[Gemini did not return a valid response]", False
        except Exception as e2:
            logger.error(f"Gemini LLM HTTP error: {e2}", exc_info=True)
            return f"[Gemini API call failed: {str(e2)}]", False

def call_openrouter(messages, stream=False):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
        "stream": stream
    }
    logger.info(f"Calling OpenRouter LLM with data: {data}")
    try:
        response = requests.post(url, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        logger.info(f"OpenRouter LLM response: {result}")
        if "choices" in result and result["choices"]:
            return result["choices"][0]["message"]["content"]
        logger.warning("OpenRouter LLM returned no choices.")
        return "Sorry, I couldn't generate a response."
    except Exception as e:
        logger.error(f"OpenRouter LLM error: {e}", exc_info=True)
        return f"[OpenRouter API call failed: {str(e)}]"
