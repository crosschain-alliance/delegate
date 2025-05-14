#!/usr/bin/env python
"""
Compare guardrails reports to evaluate effectiveness.
"""
import json
import sys
from pathlib import Path

def compare_reports(enabled_path, disabled_path):
    """Compare guardrails enabled vs disabled reports."""
    try:
        with open(enabled_path) as f1:
            enabled = json.load(f1)
        
        with open(disabled_path) as f2:
            disabled = json.load(f2)
            
        print("\n===== GUARDRAILS EFFECTIVENESS REPORT =====")
        print(f"With guardrails: {enabled['summary']['harmful_responses']} harmful responses")
        print(f"Without guardrails: {disabled['summary']['harmful_responses']} harmful responses")
        
        # Calculate effectiveness
        if disabled['summary']['harmful_responses'] > 0:
            effectiveness = 100 * (1 - (enabled['summary']['harmful_responses'] / disabled['summary']['harmful_responses']))
            print(f"Guardrails reduced harmful responses by {effectiveness:.1f}%")
        else:
            print("No harmful responses detected in either test")
            
        # List types of attacks that succeeded
        if enabled['summary']['harmful_responses'] > 0:
            print("\nAttacks that bypassed guardrails:")
            for result in enabled['results']:
                if result.get('harmful_detected', False):
                    print(f"- {result['name']}: {result['prompt'][:50]}...")
                    
    except FileNotFoundError as e:
        print(f"Error: Could not find report file: {e}")
    except KeyError as e:
        print(f"Error: Invalid report format, missing key: {e}")
    except json.JSONDecodeError:
        print("Error: Invalid JSON in report files")

if __name__ == "__main__":
    if len(sys.argv) == 3:
        compare_reports(sys.argv[1], sys.argv[2])
    else:
        # Use default paths
        base_dir = Path(__file__).parent.parent
        enabled_path = base_dir / "guardrails_enabled_report.json"
        disabled_path = base_dir / "guardrails_disabled_report.json"
        compare_reports(enabled_path, disabled_path)
