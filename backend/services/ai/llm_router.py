"""
LangChain multi-provider router.

Accepts a provider name and API key, returns the correct ChatModel instance.
Supported providers: openai | anthropic | groq | gemini
"""

from typing import Literal

from langchain_core.language_models.chat_models import BaseChatModel

Provider = Literal["openai", "anthropic", "groq", "gemini"]

# Default model IDs per provider
_MODELS: dict[str, str] = {
    "openai":    "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-20241022",
    "groq":      "llama-3.3-70b-versatile",
    "gemini":    "gemini-1.5-flash",
}


def get_chat_model(provider: str, api_key: str) -> BaseChatModel:
    """
    Returns a LangChain chat model for the given provider + key.
    Raises ValueError for unknown providers or missing keys.
    """
    provider = provider.lower().strip()
    api_key  = api_key.strip()

    if not api_key:
        raise ValueError(f"No API key supplied for provider '{provider}'.")

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=_MODELS["openai"],
            api_key=api_key,
            streaming=True,
            temperature=0.7,
        )

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=_MODELS["anthropic"],
            api_key=api_key,
            streaming=True,
            temperature=0.7,
            max_tokens=2048,
        )

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=_MODELS["groq"],
            api_key=api_key,
            streaming=True,
            temperature=0.7,
        )

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=_MODELS["gemini"],
            google_api_key=api_key,
            streaming=True,
            temperature=0.7,
        )

    raise ValueError(
        f"Unknown provider '{provider}'. "
        "Valid options: openai, anthropic, groq, gemini."
    )
