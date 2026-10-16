import sqlite3
import json

def verify_database():
    # Connect to the physical file we told Uvicorn to use
    conn = sqlite3.connect("insights.db")
    cursor = conn.cursor()
    
    # 1. Check raw events
    events_count = cursor.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    print(f"Total raw match events stored: {events_count}")
    
    # 2. Check AI insights
    cursor.execute("SELECT minute, body FROM insights ORDER BY minute")
    insights = cursor.fetchall()
    
    print(f"Total tactical insights generated: {len(insights)}")
    print("-" * 50)
    
    for minute, body_str in insights:
        body = json.loads(body_str)
        print(f"Minute {minute} | Tactical Pattern: {body['kind']}")
        if "narration" in body:
            print(f"Generated Script: {json.dumps(body['narration'], indent=2)}")
        print("-" * 50)

if __name__ == "__main__":
    verify_database()