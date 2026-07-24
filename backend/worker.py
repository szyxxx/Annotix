import sys
import json
import traceback
from ai.engine import AnnotixEngine

engine = AnnotixEngine()

def handle_request(payload: dict) -> dict:
    image_path = payload.get("image_path")
    classes = payload.get("classes", [])
    
    if not image_path:
        raise ValueError("image_path is required")
        
    return engine.process(image_path, classes)

def main():
    # Keep the process alive, reading one line at a time from stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            payload = json.loads(line)
            response = handle_request(payload)
        except Exception as e:
            response = {
                "status": "error",
                "annotations": [],
                "image_size": [0,0],
                "message": f"Worker error: {str(e)}\n{traceback.format_exc()}"
            }
            
        # Send response as a single line JSON to stdout
        try:
            print(json.dumps(response), flush=True)
        except Exception as e:
            # If stdout fails, we are probably dead anyway
            pass

if __name__ == "__main__":
    main()
