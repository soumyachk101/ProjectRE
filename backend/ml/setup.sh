#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt
python train.py
echo ""
echo "ML service ready. Run: source venv/bin/activate && python -m uvicorn service:app --port 8001"
