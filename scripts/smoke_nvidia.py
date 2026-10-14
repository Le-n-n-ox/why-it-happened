"""Checks that your NVIDIA key and model work.  Run from the repo root:

    python scripts/smoke_nvidia.py
"""
import os
import sys

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
key, model = os.getenv("NVIDIA_API_KEY"), os.getenv("NVIDIA_MODEL")
if not key or not model:
    sys.exit("Set NVIDIA_API_KEY and NVIDIA_MODEL in your .env file first.")

client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=key)
extra_body = {"reasoning_effort": "low"}
if model == "nvidia/nemotron-3.5-lightning-30b-a3b":
    extra_body = {"chat_template_kwargs": {"enable_thinking": False}}

reply = client.chat.completions.create(
    model=model,
    messages=[{"role": "user", "content": "Say hi in one short sentence."}],
    # DeepSeek V4.1 may use output tokens for reasoning before it writes content.
    max_tokens=1024,
    extra_body=extra_body,
)
choice = reply.choices[0]
content = choice.message.content
if not content:
    sys.exit(f"Request succeeded but returned no visible text (finish_reason={choice.finish_reason}).")
print("OK:", content)
