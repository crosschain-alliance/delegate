FORUMS = {
    "arbitrum": {
        "base": "https://forum.arbitrum.foundation",
        "landing_page": "/c/proposals/7"
    },
    "gnosis": {
        "base": "https://forum.gnosis.io",
        "landing_page": "/c/dao/20"
    }
}

PROPOSAL_ANALYSIS_TEMPLATE = (
    "Analyze the following DAO governance proposal text and extract:\n"
    "1. The main objective of the proposal\n"
    "2. Key points (maximum 5)\n"
    "3. Potential impact or benefits\n"
    "4. Requirements or conditions\n\n"
    "Proposal: {proposal_text}\n\n"
    "Respond with a structured analysis in this JSON format:\n"
    "```json\n"
    "{{\n"
    '  "objective": "brief statement of main goal",\n'
    '  "key_points": ["point 1", "point 2", ...],\n'
    '  "impact": "potential impact/benefits",\n'
    '  "requirements": "any conditions or requirements"\n'
    "}}\n"
    "```"
)

SENTIMENT_ANALYSIS_TEMPLATE = (
    "Analyze the sentiment in these comments about a DAO governance proposal.\n"
    "For each comment, determine if the sentiment is positive, negative, or neutral.\n"
    "Then provide an overall assessment of community sentiment.\n\n"
    "Comments: {comments}\n\n"
    "Respond with a structured analysis in this JSON format:\n"
    "```json\n"
    "{{\n"
    '  "overall_sentiment": "positive/negative/neutral/mixed",\n'
    '  "sentiment_score": 0.0,\n'
    '  "comment_analysis": [\n'
    "    {{\n"
    '      "excerpt": "brief excerpt...",\n'
    '      "sentiment": "positive/negative/neutral",\n'
    '      "confidence": 0.0\n'
    "    }}\n"
    "  ],\n"
    '  "key_concerns": ["concern 1", "concern 2"],\n'
    '  "key_praises": ["praise 1", "praise 2"]\n'
    "}}\n"
    "```"
)