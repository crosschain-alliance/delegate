#!/usr/bin/env python
"""
Test the LLM API with Garak adversarial prompts, using the REST generators.
Reference: https://reference.garak.ai/en/latest/garak.generators.rest.html
"""

import json
import os
import argparse
import requests
import logging
import time
from typing import List, Dict, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("garak_api_tester")

# Try to import garak
try:
    import garak
    from garak.harnesses.base import Harness
    from garak.detectors.base import Detector
    
    # Import REST-specific generators
    from garak.generators.rest import RESTAPIEndpointGenerator
    from garak.generators.prompt_injection import PromptInjectionAttack

    # Import relevant detectors
    import garak.detectors.prompt_injection as prompt_injection_detectors
    import garak.detectors.harmful as harmful_detectors
    import garak.detectors.toxicity as toxicity_detectors
    
    # Report generation
    from garak.evaluators.base import EvaluationReport
except ImportError as e:
    logger.error(f"Garak import error: {e}")
    logger.error("Make sure Garak is installed. Install with: pip install garak")
    raise

class CustomAPIModel:
    """Custom adapter for testing your API with Garak."""
    
    def __init__(self, 
                 api_url: str, 
                 prompt_id: str = "garak_test",
                 guard_id: Optional[str] = None, 
                 use_guardrails: bool = True):
        """
        Initialize the custom API model.
        
        Args:
            api_url: URL of your API endpoint
            prompt_id: ID to use for prompts
            guard_id: Optional specific guard to use
            use_guardrails: Whether to enable guardrails
        """
        self.api_url = api_url
        self.prompt_id = prompt_id
        self.guard_id = guard_id
        self.use_guardrails = use_guardrails
        self.session = requests.Session()
        self.model_name = f"Custom API ({api_url})"
    
    def generate(self, prompt_text: str) -> List[str]:
        """
        Generate a response from your API for the given prompt.
        
        Args:
            prompt_text: The text to send to the API
            
        Returns:
            List containing the API response
        """
        payload = {
            "prompt_id": self.prompt_id,
            "input_text": prompt_text,
            "guard_id": self.guard_id,
            "use_guardrails": self.use_guardrails
        }
        
        try:
            logger.info(f"Sending request to {self.api_url}")
            response = self.session.post(
                f"{self.api_url}/query", 
                json=payload,
                timeout=60  # Longer timeout for LLM processing
            )
            
            if response.status_code != 200:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return [f"[ERROR] Status code: {response.status_code}"]
            
            data = response.json()
            return [data.get("response", "")]
            
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            return [f"[ERROR] {str(e)}"]

def test_with_garak(api_url: str, 
                   prompt_id: str = "garak_test",
                   guard_id: Optional[str] = None,
                   use_guardrails: bool = True,
                   generators: Optional[List[str]] = None,
                   detectors: Optional[List[str]] = None,
                   report_path: Optional[str] = None):
    """
    Test the API with Garak.
    
    Args:
        api_url: The API endpoint URL
        prompt_id: ID to use for prompts
        guard_id: Optional specific guard to use
        use_guardrails: Whether to enable guardrails
        generators: List of generator names to use
        detectors: List of detector names to use
        report_path: Path to save the report to
    """
    # Create the custom model
    model = CustomAPIModel(
        api_url=api_url,
        prompt_id=prompt_id,
        guard_id=guard_id,
        use_guardrails=use_guardrails
    )
    
    # Set up harness
    harness = Harness()
    harness.set_target_model(model)
    
    # Load generators and detectors
    if not generators:
        generators = ["prompt_injection", "political"]
    
    if not detectors:
        detectors = ["prompt_injection", "toxicity"]
    
    # Configure harness
    for gen_name in generators:
        gen_module = f"garak.generators.{gen_name}"
        try:
            generator_module = __import__(gen_module, fromlist=["*"])
            for gen_class in garak.generators.base.get_generator_classes(generator_module):
                harness.add_generator(gen_class())
                logger.info(f"Added generator: {gen_class.__name__}")
        except (ImportError, AttributeError) as e:
            logger.error(f"Failed to load generator {gen_name}: {e}")
    
    for det_name in detectors:
        det_module = f"garak.detectors.{det_name}"
        try:
            detector_module = __import__(det_module, fromlist=["*"])
            for det_class in garak.detectors.base.get_detector_classes(detector_module):
                harness.add_detector(det_class())
                logger.info(f"Added detector: {det_class.__name__}")
        except (ImportError, AttributeError) as e:
            logger.error(f"Failed to load detector {det_name}: {e}")
    
    # Run the tests
    logger.info(f"Starting Garak tests against {api_url}")
    logger.info(f"Using guardrails: {use_guardrails}")
    harness.run()
    
    # Generate report
    report = Report()
    evaluations = report.evaluate_from_harness(harness)
    
    # Print summary
    logger.info("\n=== TEST RESULTS SUMMARY ===")
    total_tests = sum(len(detector.results) for detector in harness.detectors)
    logger.info(f"Total tests run: {total_tests}")
    
    vulnerability_count = 0
    for evaluation in evaluations:
        if hasattr(evaluation, 'tag'):
            logger.info(f"Detector: {evaluation.tag}")
            if hasattr(evaluation, 'vulnerabilities'):
                vuln_count = len(evaluation.vulnerabilities)
                vulnerability_count += vuln_count
                logger.info(f"  Vulnerabilities found: {vuln_count}")
                
                # Show some examples of vulnerabilities
                for i, vuln in enumerate(evaluation.vulnerabilities[:3]):  # Show max 3 examples
                    logger.info(f"  Example {i+1}: {vuln.get('prompt', 'N/A')[:50]}...")
    
    logger.info(f"Total vulnerabilities found: {vulnerability_count}")
    
    # Save report if requested
    if report_path:
        with open(report_path, 'w') as f:
            # Convert report to JSON
            report_data = {
                "summary": {
                    "total_tests": total_tests,
                    "total_vulnerabilities": vulnerability_count,
                    "guardrails_enabled": use_guardrails
                },
                "evaluations": []
            }
            
            for evaluation in evaluations:
                if hasattr(evaluation, 'tag') and hasattr(evaluation, 'vulnerabilities'):
                    eval_data = {
                        "detector": evaluation.tag,
                        "vulnerability_count": len(evaluation.vulnerabilities),
                        "examples": [
                            {
                                "prompt": v.get("prompt", ""),
                                "output": v.get("output", [""])[0][:200],  # Limit long outputs
                                "score": v.get("score", 0)
                            }
                            for v in evaluation.vulnerabilities[:5]  # Limit to 5 examples
                        ]
                    }
                    report_data["evaluations"].append(eval_data)
                    
            json.dump(report_data, f, indent=2)
            logger.info(f"Report saved to {report_path}")

def main():
    """Run the Garak API tester."""
    parser = argparse.ArgumentParser(description="Test an LLM API with Garak.")
    parser.add_argument("--url", default="http://localhost:8000", help="URL of the API server")
    parser.add_argument("--prompt-id", default="garak_test", help="ID to use for prompts")
    parser.add_argument("--guard-id", help="Specific guard ID to use")
    parser.add_argument("--no-guardrails", action="store_true", help="Disable guardrails")
    parser.add_argument("--report", help="Path to save the report to")
    parser.add_argument("--generators", nargs="*", default=["prompt_injection"], 
                        help="Generator plugins to use")
    parser.add_argument("--detectors", nargs="*", default=["prompt_injection", "toxicity"], 
                        help="Detector plugins to use")
    args = parser.parse_args()
    
    # Run the tests
    test_with_garak(
        api_url=args.url,
        prompt_id=args.prompt_id,
        guard_id=args.guard_id,
        use_guardrails=not args.no_guardrails,
        generators=args.generators,
        detectors=args.detectors,
        report_path=args.report
    )

if __name__ == "__main__":
    main()