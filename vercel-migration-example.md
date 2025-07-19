# Vercel Migration Example

## File Structure:
```
/
├── src/app/                 # Next.js frontend
├── api/                     # Vercel serverless functions
│   ├── generate.py         # Image generation
│   ├── evaluate.py         # Answer checking  
│   └── words.json          # Embedded word data
└── vercel.json             # Configuration
```

## vercel.json Configuration:
```json
{
  "functions": {
    "api/generate.py": {
      "runtime": "python3.9",
      "maxDuration": 60
    },
    "api/evaluate.py": {
      "runtime": "python3.9", 
      "maxDuration": 10
    }
  }
}
```

## api/evaluate.py (Lightweight - Good for Vercel):
```python
from http.server import BaseHTTPRequestHandler
import json
import os
from groq import Groq

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Your existing Groq evaluation logic
        # Usually completes in <5 seconds
        pass
```

## api/generate.py (Heavy - May timeout):
```python
from http.server import BaseHTTPRequestHandler  
import json
from gradio_client import Client

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # WARNING: This may exceed Vercel's 60s limit
        # Consider using async operations or caching
        pass
```

## Timeout Mitigation Strategies:

### 1. Background Jobs (Complex):
```javascript
// Trigger generation asynchronously
// Poll for results
// Store in temporary database
```

### 2. Caching Layer:
```javascript
// Pre-generate popular combinations
// Cache in Vercel KV or external Redis
```

### 3. Streaming Response:
```javascript
// Send partial updates as image generates
// Use Server-Sent Events
``` 