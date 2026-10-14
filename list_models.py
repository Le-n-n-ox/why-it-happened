import os
from dotenv import load_dotenv
from openai import OpenAI

# Load the API key from your .env file
load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")
)

# Fetch and print all models your account is allowed to use
print("Available Models:")
for model in client.models.list().data:
    print(f"- {model.id}")