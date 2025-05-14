import asyncio
import json
import re
import os

from config import FORUMS, PROPOSAL_ANALYSIS_TEMPLATE, SENTIMENT_ANALYSIS_TEMPLATE
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from playwright.async_api import async_playwright


env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    print(f"[INFO] Loading .env file from: {env_path}")
    load_dotenv(dotenv_path=env_path)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key or api_key == "api-key":
    print("[ERROR] OPENAI_API_KEY not found or is placeholder. Please set it in your .env file or environment.")
else:
    os.environ["OPENAI_API_KEY"] = api_key
    print("[INFO] OpenAI API Key loaded.")

async def get_browser_page(playwright):
    """Create and return a browser page with stealth mode"""
    print("[INFO] Launching browser...")
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    )
    page = await context.new_page()
    print("[INFO] Browser launched successfully.")
    return page, browser

async def get_last_proposal_url(page, forum):
    """Get the URL of the LATEST (typically first non-pinned) proposal from the landing page"""
    try:
        landing_page_url = forum["base"] + forum["landing_page"]
        print(f"[INFO] Navigating to landing page: {landing_page_url}")
        await page.goto(landing_page_url, timeout=60000)
        await page.wait_for_load_state("domcontentloaded", timeout=60000)
        print("[INFO] Landing page loaded successfully.")

        latest_proposal_selector = "table.topic-list tbody tr:not(.pinned):first-child a.title"
        print(f"[DEBUG] Waiting for LATEST proposal selector: {latest_proposal_selector}")
        
        try:
            await page.wait_for_selector(latest_proposal_selector, state="visible", timeout=30000)
        except Exception as e_selector:
            print(f"[ERROR] Could not find LATEST proposal selector. Page HTML might have changed or no unpinned topics found.")
            all_topic_links_selector = "a.title.raw-link.raw-topic-link"
            print(f"[DEBUG] Attempting to find any topic link with selector: {all_topic_links_selector}")
            links = await page.query_selector_all(all_topic_links_selector)
            if links:
                print(f"[DEBUG] Found {len(links)} potential topic links. Taking the first one.")
                latest_proposal_url = await links[0].get_attribute("href")
                if not latest_proposal_url.startswith("http"):
                    latest_proposal_url = forum["base"] + latest_proposal_url
                print(f"[INFO] Fallback - LATEST proposal URL found: {latest_proposal_url}")
                return latest_proposal_url
            else:
                print(f"[ERROR] No topic links found with fallback selector either.")
                raise e_selector

        print("[DEBUG] Selector for LATEST proposal found. Extracting URL...")
        latest_proposal_url = await page.eval_on_selector(
            latest_proposal_selector,
            "el => el.href"
        )
        if not latest_proposal_url.startswith("http"):
            latest_proposal_url = forum["base"] + latest_proposal_url
            
        print(f"[INFO] LATEST proposal URL found: {latest_proposal_url}")
        return latest_proposal_url
    except Exception as e:
        print(f"[ERROR] Failed to get LATEST proposal URL: {e}")
        raise

async def parse_proposal(page, url):
    """Parse a proposal using playwright"""
    try:
        print(f"[INFO] Navigating to proposal URL: {url}")
        await page.goto(url, timeout=60000)
        proposal_content_container_selector = "div.topic-post:first-child div.cooked"
        print(f"[DEBUG] Waiting for proposal content container selector: {proposal_content_container_selector}")
        await page.wait_for_selector(proposal_content_container_selector, state="visible", timeout=60000)
        print("[INFO] Proposal content container loaded successfully.")

        title_selector = "#topic-title h1 a"
        print(f"[INFO] Extracting proposal title using selector: {title_selector}")
        
        title_element = await page.query_selector(title_selector)
        if not title_element:
            title_selector_fallback = "#topic-title h1 span"
            print(f"[DEBUG] Primary title selector ('{title_selector}') not found. Trying fallback: '{title_selector_fallback}'")
            title_element = await page.query_selector(title_selector_fallback)
            if not title_element:
                title_selector_fallback_2 = "h1.header-title span.topic-title"
                print(f"[DEBUG] Fallback title selector ('{title_selector_fallback}') not found. Trying: '{title_selector_fallback_2}'")
                title_element = await page.query_selector(title_selector_fallback_2)
                if not title_element:
                    print(f"[ERROR] Title element not found with primary or fallback selectors. Defaulting title.")
                    title = "Unknown Title - Selector Not Found"
                else:
                    title = await title_element.text_content()
                    title = title.strip() if title else "Unknown Title - Empty Fallback 2"
            else:
                title = await title_element.text_content()
                title = title.strip() if title else "Unknown Title - Empty Fallback"
        else:
            title = await title_element.text_content()
            title = title.strip() if title else "Unknown Title - Empty Primary"

        print(f"[INFO] Proposal title extracted: {title}")

        proposal_selector = "div.topic-post:first-child div.cooked"
        print(f"[INFO] Extracting proposal text using selector: {proposal_selector}")
        proposal_text = await page.eval_on_selector(
            proposal_selector,
            "el => el.textContent.trim()"
        )
        print(f"[INFO] Proposal text extracted. Length: {len(proposal_text)} characters")

        comments_selector = "div.topic-post:not(:first-child) div.cooked"
        print(f"[INFO] Extracting comments using selector: {comments_selector}")
        
        comment_elements = await page.query_selector_all(comments_selector)
        comments = []
        if comment_elements:
            for el in comment_elements:
                text_content = await el.text_content()
                comments.append(text_content.strip() if text_content else "")
        
        print(f"[INFO] Comments extracted. Count: {len(comments)}")

        return title, proposal_text, comments
    except Exception as e:
        print(f"[ERROR] Failed to parse proposal at URL {url}: {e}")
        raise

async def analyze_proposal_with_llm(proposal_text):
    """Analyze the proposal using LangChain and LLM"""
    if not proposal_text:
        print("[WARN] Proposal text is empty. Skipping LLM analysis for proposal.")
        return {"error": "Proposal text is empty."}
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=4000,
        chunk_overlap=200
    )
    
    if len(proposal_text) > 12000:
        print(f"[INFO] Proposal text length ({len(proposal_text)}) is long. Splitting into chunks.")
        chunks = text_splitter.split_text(proposal_text)
        proposal_text_to_analyze = chunks[0]
        print(f"[INFO] Using first chunk of length {len(proposal_text_to_analyze)} for analysis.")
    else:
        proposal_text_to_analyze = proposal_text
    
    prompt = PromptTemplate(
        input_variables=["proposal_text"],
        template=PROPOSAL_ANALYSIS_TEMPLATE
    )
    
    chain = prompt | llm
    print("[INFO] Sending proposal text to LLM for analysis...")
    response = await chain.ainvoke({"proposal_text": proposal_text_to_analyze})
    print("[INFO] Received response from LLM for proposal analysis.")
    
    result_text = response.content
    json_match = re.search(r'```json\s*(.*?)\s*```', result_text, re.DOTALL)
    
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError as je:
            print(f"[ERROR] Failed to parse JSON from LLM response for proposal: {je}")
            print(f"[DEBUG] Raw LLM response for proposal: {result_text}")
            return {"error": "Failed to parse JSON response from LLM", "raw": result_text}
    else:
        print("[ERROR] No JSON block found in LLM response for proposal.")
        print(f"[DEBUG] Raw LLM response for proposal: {result_text}")
        return {"error": "No JSON found in LLM response", "raw": result_text}

async def analyze_comments_with_llm(comments):
    """Analyze comment sentiments using LangChain and LLM"""
    if not comments:
        print("[INFO] No comments to analyze.")
        return {
            "overall_sentiment": "N/A (No Comments)",
            "sentiment_score": 0.0,
            "comment_analysis": [],
            "key_concerns": [],
            "key_praises": []
        }
        
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    
    comments_to_analyze = []
    current_length = 0
    max_length = 10000

    for i, c in enumerate(comments[:10]):
        if not c or len(c.strip()) < 10:
            continue
        comment_entry = f"Comment {i+1}: {c[:500]}..."
        if current_length + len(comment_entry) > max_length:
            break
        comments_to_analyze.append(comment_entry)
        current_length += len(comment_entry)

    if not comments_to_analyze:
        print("[INFO] No suitable comments found for sentiment analysis after filtering.")
        return {
            "overall_sentiment": "N/A (No Suitable Comments)",
            "sentiment_score": 0.0,
            "comment_analysis": [],
            "key_concerns": [],
            "key_praises": []
        }

    comments_text = "\n\n".join(comments_to_analyze)
    print(f"[INFO] Analyzing {len(comments_to_analyze)} comments for sentiment. Total length: {len(comments_text)}")
    
    prompt = PromptTemplate(
        input_variables=["comments"],
        template=SENTIMENT_ANALYSIS_TEMPLATE
    )
    
    chain = prompt | llm
    print("[INFO] Sending comments to LLM for sentiment analysis...")
    response = await chain.ainvoke({"comments": comments_text})
    print("[INFO] Received response from LLM for sentiment analysis.")
    
    result_text = response.content
    json_match = re.search(r'```json\s*(.*?)\s*```', result_text, re.DOTALL)
    
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError as je:
            print(f"[ERROR] Failed to parse JSON from LLM response for comments: {je}")
            print(f"[DEBUG] Raw LLM response for comments: {result_text}")
            return {"error": "Failed to parse JSON response from LLM for comments", "raw": result_text}
    else:
        print("[ERROR] No JSON block found in LLM response for comments.")
        print(f"[DEBUG] Raw LLM response for comments: {result_text}")
        return {"error": "No JSON found in LLM response for comments", "raw": result_text}

async def main():
    async with async_playwright() as playwright:
        page, browser = await get_browser_page(playwright)
        results = {}

        for name, forum in FORUMS.items():
            try:
                print(f"\n[INFO] Processing {name.upper()} forum...")

                topic_url = await get_last_proposal_url(page, forum)
                print(f"[INFO] Target proposal URL for {name.upper()}: {topic_url}")

                title, proposal_text, comments = await parse_proposal(page, topic_url)
                print(f"[INFO] Proposal parsed successfully for {name.upper()}. Title: '{title}'")

                print("[INFO] Analyzing proposal with LLM...")
                proposal_analysis = await analyze_proposal_with_llm(proposal_text)
                print("[INFO] Proposal analysis completed.")

                print("[INFO] Analyzing comments with LLM...")
                sentiment_analysis = await analyze_comments_with_llm(comments)
                print("[INFO] Sentiment analysis completed.")

                results[name] = {
                    "title": title,
                    "url": topic_url,
                    "proposal_analysis": proposal_analysis,
                    "sentiment_analysis": sentiment_analysis
                }

                print(f"\n=== RESULT: {name.upper()} ===")
                print(f"Title: {title}")
                print(f"URL: {topic_url}")

                if proposal_analysis and "error" not in proposal_analysis:
                    print("\nObjective:")
                    print(f"  {proposal_analysis.get('objective', 'N/A')}")

                    print("\nKey Points:")
                    for i, point in enumerate(proposal_analysis.get("key_points", []), 1):
                        print(f"  {i}. {point}")

                    print("\nImpact:")
                    print(f"  {proposal_analysis.get('impact', 'N/A')}")

                    print("\nRequirements:")
                    print(f"  {proposal_analysis.get('requirements', 'N/A')}")
                else:
                    err_msg = proposal_analysis.get('error', 'Unknown error') if proposal_analysis else 'Analysis object is None'
                    print(f"\nError analyzing proposal: {err_msg}")
                    if proposal_analysis and 'raw' in proposal_analysis:
                         print(f"Raw LLM response for proposal: {proposal_analysis['raw'][:500]}...")

                if sentiment_analysis and "error" not in sentiment_analysis:
                    print("\nOverall Sentiment:")
                    print(f"  {sentiment_analysis.get('overall_sentiment', 'N/A')} (Score: {sentiment_analysis.get('sentiment_score', 'N/A')})")

                    if sentiment_analysis.get("key_praises"):
                        print("\nKey Praises:")
                        for praise in sentiment_analysis.get("key_praises", []):
                            print(f"  • {praise}")

                    if sentiment_analysis.get("key_concerns"):
                        print("\nKey Concerns:")
                        for concern in sentiment_analysis.get("key_concerns", []):
                            print(f"  • {concern}")
                else:
                    err_msg = sentiment_analysis.get('error', 'Unknown error') if sentiment_analysis else 'Analysis object is None'
                    print(f"\nError analyzing sentiments: {err_msg}")
                    if sentiment_analysis and 'raw' in sentiment_analysis:
                         print(f"Raw LLM response for comments: {sentiment_analysis['raw'][:500]}...")

            except Exception as e:
                print(f"[ERROR] Critical error processing {name.upper()} forum: {e}")
                import traceback
                traceback.print_exc()

        await browser.close()
        print("\n[INFO] Script finished.")
        return results

if __name__ == "__main__":
    asyncio.run(main())