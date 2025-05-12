# LLM Handler

A Python-based LLM handler for the Davos MVP project.

## Installation

```bash
pip install -r requirements.txt
```

## Development

For development:

```bash
pip install -e ".[dev]"
```

## Usage

```python
from llm_handler.parser import parse_query

result = parse_query("prompt_id", "Your input query")
print(result)
```
