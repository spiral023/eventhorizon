import os
import sys
import logging
from dotenv import load_dotenv

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load env
load_dotenv()

from app.services.ai_service import ai_service


def test_ai():
    print("Testing AI Service...")
    api_key = os.getenv("OPENROUTER_API_KEY")
    print(f"API Key present: {bool(api_key)}")
    if api_key:
        print(f"API Key prefix: {api_key[:10]}...")

    try:
        # Simple test
        response = ai_service._make_completion(
            model="deepseek/deepseek-v3.2",
            messages=[{"role": "user", "content": "Say 'Hello'"}],
            max_tokens=10,
        )
        print(f"Response: '{response}'")
    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_ai()
