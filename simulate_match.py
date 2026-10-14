import time
import requests

API_URL = "http://127.0.0.1:8000/events"

# Simulated sequence triggering high press and counter attack patterns
sample_match_stream = [
    # Sequence 1: High Press Turnover (Arsenal wins ball high x=68 and shoots)
    {"id": "sim_101", "minute": 18.0, "team": "Arsenal", "type": "interception", "x": 68.0, "y": 40.0},
    {"id": "sim_102", "minute": 18.1, "team": "Arsenal", "type": "pass", "x": 78.0, "y": 45.0},
    {"id": "sim_103", "minute": 18.2, "team": "Arsenal", "type": "shot", "x": 88.0, "y": 50.0},
    
    # Sequence 2: Counter Attack (Chelsea wins ball deep x=30 and scores in < 15s)
    {"id": "sim_201", "minute": 34.0, "team": "Chelsea", "type": "tackle", "x": 30.0, "y": 20.0},
    {"id": "sim_202", "minute": 34.1, "team": "Chelsea", "type": "pass", "x": 65.0, "y": 35.0},
    {"id": "sim_203", "minute": 34.2, "team": "Chelsea", "type": "goal", "x": 92.0, "y": 48.0},
]

def run_simulation():
    print("🚀 Starting live match simulation...\n")
    for event in sample_match_stream:
        try:
            res = requests.post(API_URL, json=event, timeout=5)
            if res.status_code == 200:
                data = res.json()
                print(f"[SENT] Event '{event['id']}' | {event['team']} {event['type']} @ {event['minute']}' | Queue Size: {data.get('queue_size')}")
            else:
                print(f"[FAILED {res.status_code}] {res.text}")
        except Exception as e:
            print(f"[CONNECTION ERROR] Server not reachable. Ensure uvicorn is running. Error: {e}")
            break
            
        time.sleep(2)  # Delay between pushes to simulate live play

if __name__ == "__main__":
    run_simulation()