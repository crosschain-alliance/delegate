#!/usr/bin/env python
"""
Command-line tool to test guardrails against Garak's attack vectors.

Usage:
    python test_guardrails_cli.py --guard content --attacks prompt_injection --limit 5
    
Options:
    --guard      Type of guardrail to test (content, security, api, voting)
    --attacks    Type of attacks to test (prompt_injection, dangerstring, dlp)
    --limit      Maximum number of attacks to test (default: 10)
"""

import sys
import argparse
import garak
from garak.harnesses.dangerstring import get_dangerstring
from garak.harnesses.prompt_injection import get_prompt_injection
from garak.detectors.prompt_injection import JailbreakDetector
from garak.detectors.harmful import MalwareTechniques, Violence
from garak.detectors.data_leakage import PII
from garak.generators.prompt_libraries import PromptLibrary

from llm_handler.guardrails import create_guard, guard_response
from llm_handler.guardrail_configs import (
    create_content_moderation_guard,
    create_api_response_guard,
    create_voting_guard,
    create_security_guard
)

# Map command-line arguments to guardrail creation functions
GUARD_TYPES = {
    "content": create_content_moderation_guard,
    "security": create_security_guard,
    "api": create_api_response_guard,
    "voting": lambda gid: create_voting_guard(gid, ["yes", "no", "abstain"])
}

# Map command-line arguments to attack types
ATTACK_TYPES = {
    "prompt_injection": lambda: get_prompt_injection(),
    "dangerstring": lambda: get_dangerstring(),
    "dlp": lambda: PromptLibrary().get_prompts("dlp")
}

def evaluate_attack(guard, attack_text):
    """
    Evaluate if a guardrail effectively blocks an attack.
    
    Args:
        guard: The guardrail to evaluate
        attack_text: The attack text to test
        
    Returns:
        tuple: (blocked, original, result) where blocked is a boolean
    """
    try:
        result = guard(attack_text)
        return result != attack_text, attack_text, result
    except Exception as e:
        # If the guard raises an exception, it technically blocked the attack
        return True, attack_text, f"[ERROR: {str(e)}]"

def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Test guardrails against Garak attack vectors")
    parser.add_argument("--guard", required=True, choices=GUARD_TYPES.keys(), 
                        help="Type of guardrail to test")
    parser.add_argument("--attacks", required=True, choices=ATTACK_TYPES.keys(),
                        help="Type of attacks to test")
    parser.add_argument("--limit", type=int, default=10, help="Maximum number of attacks to test")
    args = parser.parse_args()
    
    # Create the requested guardrail
    guard_creator = GUARD_TYPES[args.guard]
    guard_id = f"cli-test-{args.guard}-guard"
    guard = guard_creator(guard_id)
    
    # Get the requested attacks
    attack_generator = ATTACK_TYPES[args.attacks]
    attacks = attack_generator()
    
    # Apply limit to the number of attacks
    if args.limit and args.limit > 0:
        attacks = attacks[:args.limit]
    
    # Run the tests and collect results
    results = []
    blocked_count = 0
    
    print(f"\nTesting {args.guard} guardrail against {len(attacks)} {args.attacks} attacks:\n")
    
    for i, attack_info in enumerate(attacks, 1):
        # Extract the attack text (handle both dictionary and string formats)
        attack_text = attack_info["prompt"] if isinstance(attack_info, dict) else attack_info
        
        # Evaluate the attack
        blocked, original, result = evaluate_attack(guard, attack_text)
        
        if blocked:
            blocked_count += 1
            status = "BLOCKED"
        else:
            status = "ALLOWED"
        
        # Print the results
        print(f"Attack {i}/{len(attacks)} - {status}")
        print(f"  Original: {original[:80]}..." if len(original) > 80 else f"  Original: {original}")
        print(f"  Result  : {result[:80]}..." if len(result) > 80 else f"  Result  : {result}")
        print()
        
        results.append((blocked, original, result))
    
    # Print summary
    print("\n===== SUMMARY =====")
    print(f"Total attacks: {len(attacks)}")
    print(f"Blocked: {blocked_count} ({blocked_count/len(attacks)*100:.1f}%)")
    print(f"Allowed: {len(attacks) - blocked_count} ({(len(attacks) - blocked_count)/len(attacks)*100:.1f}%)")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
