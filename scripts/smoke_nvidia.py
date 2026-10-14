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
reply = client.chat.completions.create(
    model=model,
    messages=[{"role": "user", "content": "Say hi in one short sentence."}],
    max_tokens=30,
)
print("OK:", reply.choices[0].message.content)
