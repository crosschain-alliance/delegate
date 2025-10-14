import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests


load_dotenv('/app/.env')
app = Flask(__name__)
CORS(app)


@app.route('/graphql', methods=['POST'])
def graphql():
    data = request.get_json()
    if data and 'query' in data:
        start = int(os.getenv('TEST_START_PROPOSAL', '1759272763'))
        end = int(os.getenv('TEST_END_PROPOSAL', '1759877563'))
        return jsonify({
            "data": {
                "proposals": [
                    {
                        "id": "0xa3bc9590fd3af9f59fbad1296886da60c90853e25f1fc53110d9ebc8bd0618b6",
                        "title": "some title",
                        "body": "# Summary\nTitle.\n\nSome sort of body explaining the proposal",
                        "choices": [
                            "For",
                            "Against",
                            "Abstain"
                        ],
                        "start": start,
                        "end": end,
                        "snapshot": 23478903,
                        "state": "active",
                        "scores": [
                            58323.69586072513,
                            31319.728700042833,
                            31.143677783570375
                        ],
                        "scores_by_strategy": [
                            [
                                8.78649368890468,
                                5002.5238769600155,
                                5972.444584339153,
                                47339.94090573705
                            ],
                            [
                                0,
                                4148.62139336,
                                151.03785714807887,
                                27020.069449534752
                            ],
                            [
                                0,
                                0,
                                31.143677783570375,
                                0
                            ]
                        ],
                        "scores_total": 89674.56823855152,
                        "scores_updated": 1759766664,
                        "author": "0x9136fD91Eb5D06f4e9aAE73e55835C6d3599dEFE",
                        "space": {
                            "id": "DAO_test",
                            "name": "DAO Test"
                        }
                    }
                ]
            }
        })
    return jsonify({"error": "Invalid request"})

@app.route('/api/proposals', methods=['GET'])
def get_proposals():
    source = request.args.get('source')
    identifier = request.args.get('identifier')

    if source == 'snapshot' and identifier == 'daotest.eth':
        start = int(os.getenv('TEST_START_PROPOSAL', '1759272763'))
        end = int(os.getenv('TEST_END_PROPOSAL', '1759877563'))
        return jsonify({
            "data": {
                "proposals": [
                    {
                        "id": "0xa3bc9590fd3af9f59fbad1296886da60c90853e25f1fc53110d9ebc8bd0618b6",
                        "title": "DAO Test",
                        "body": "# Summary\nTitle.\n\nBody explaining the proposal",
                        "choices": [
                            "For",
                            "Against",
                            "Abstain"
                        ],
                        "start": start,
                        "end": end,
                        "snapshot": 23478903,
                        "state": "active",
                        "scores": [
                            58323.69586072513,
                            31319.728700042833,
                            31.143677783570375
                        ],
                        "scores_by_strategy": [
                            [
                                8.78649368890468,
                                5002.5238769600155,
                                5972.444584339153,
                                47339.94090573705
                            ],
                            [
                                0,
                                4148.62139336,
                                151.03785714807887,
                                27020.069449534752
                            ],
                            [
                                0,
                                0,
                                31.143677783570375,
                                0
                            ]
                        ],
                        "scores_total": 89674.56823855152,
                        "scores_updated": 1759766664,
                        "author": "0x9136fD91Eb5D06f4e9aAE73e55835C6d3599dEFE",
                        "space": {
                            "id": "DAO_test",
                            "name": "DAO Test"
                        }
                    }
                ]
            }
        })
    return jsonify({"error": "Invalid request"}), 400

@app.route('/setup-agent', methods=['POST'])
def setup_agent():
    """
    Mock setup-agent endpoint that simulates agent setup without external API calls
    """
    try:
        # Hardcoded test user address
        user_address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        space_id = "DAO_test"
        
        # Mock responses for the voter API endpoints
        # 1. Mock init-agent response
        predicted_agent_address = "0x8A9219e171Fa297840414df8689e4D7A0cE0d662"
        
        # 2. Mock get-kms response
        kms_address = "0x1234567890123456789012345678901234567890"
        
        # 3. Mock finalize-agent response
        finalize_agent_id = "mock_agent_id_123"
        
        # 4. Mock enable agent for space response
        
        return jsonify({
            "success": True,
            "userAddress": user_address,
            "spaceId": space_id,
            "predictedAgentAddress": predicted_agent_address,
            "kmsAddress": kms_address,
            "agentId": finalize_agent_id,
            "message": "Agent setup completed successfully in test mode"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add mock voter API endpoints for testing
@app.route('/init-agent', methods=['POST'])
def mock_init_agent():
    """Mock init-agent endpoint"""
    try:
        data = request.get_json()
        user_address = data.get('userAddress')
        space_id = data.get('spaceId')
        
        if not user_address or not space_id:
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400
        
        # Return mock agent address
        return jsonify({
            "success": True,
            "predictedAgentAddress": "0x8A9219e171Fa297840414df8689e4D7A0cE0d662",
            "isMatchingSpace": False,
            "isActive": False
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/get-kms', methods=['POST'])
def mock_get_kms():
    """Mock get-kms endpoint"""
    try:
        data = request.get_json()
        user_address = data.get('userAddress')
        
        if not user_address:
            return jsonify({
                "success": False,
                "error": "Missing userAddress parameter"
            }), 400
        
        # Return mock KMS address
        return jsonify({
            "success": True,
            "kmsAddress": "0x1234567890123456789012345678901234567890"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/finalize-agent', methods=['POST'])
def mock_finalize_agent():
    """Mock finalize-agent endpoint"""
    try:
        data = request.get_json()
        user_address = data.get('userAddress')
        space_id = data.get('spaceId')
        kms_address = data.get('kmsAddress')
        
        if not user_address or not space_id or not kms_address:
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400
        
        # Return mock agent ID
        return jsonify({
            "success": True,
            "id": "mock_agent_id_123",
            "address": "0x8A9219e171Fa297840414df8689e4D7A0cE0d662"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/spaces/<space_id>/agents', methods=['POST'])
def mock_enable_agent(space_id):
    """Mock enable agent for space endpoint"""
    try:
        data = request.get_json()
        agent_id = data.get('agentId')
        default_vote = data.get('defaultVote', True)
        
        if not agent_id:
            return jsonify({
                "success": False,
                "error": "Missing agentId parameter"
            }), 400
        
        # Return success response
        return jsonify({
            "success": True,
            "spaceId": space_id,
            "agentId": agent_id,
            "defaultVote": default_vote,
            "message": f"Agent {agent_id} enabled for space {space_id}"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/vote-details/<userAddress>/<proposalId>', methods=['GET'])
def get_vote_details(userAddress, proposalId):
    """
    Simulate the vote details endpoint
    Returns mock vote details for testing
    """
    try:
        # Mock vote details data structure matching the TypeScript interface
        vote_details = {
            "success": True,
            "data": {
                "userAddress": userAddress,
                "proposalId": proposalId,
                "spaceId": "dao_test.eth",
                "proposalTitle": "Test Proposal for DAO_test",
                "proposalText": "This is a test proposal for the DAO_test space. It contains sample content for testing purposes.",
                "proposalTextHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "lastUpdated": 1759272763,
                "aiResponse": "Based on the user's ethos and the proposal content, I recommend voting 'yes' as it aligns with the user's stated principles.",
                "aiVoteChoice": "yes",
                "userVoteChoice": None,
                "status": "pending",
                "createdAt": "2025-10-14T10:00:00Z",
                "updatedAt": "2025-10-14T10:00:00Z",
                "lastChecked": "2025-10-14T10:00:00Z"
            }
        }
        
        return jsonify(vote_details)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to get vote details",
            "message": str(e)
        }), 500

@app.route('/api/ai-request', methods=['POST'])
def ai_request():
    """
    Simulate the AI analysis request endpoint
    Returns mock AI response for testing
    """
    try:
        data = request.get_json()
        
        # Validate required parameters
        if not data or 'directive' not in data or 'proposal' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required parameters",
                "details": "Both directive and proposal are required"
            }), 400
        
        directive = data.get('directive')
        proposal = data.get('proposal')
        
        # Mock AI response - simulate what OpenAI would return
        mock_ai_response = """Based on the user's ethos and the proposal content, I recommend voting 'yes' for this proposal. 

The proposal appears to align with the user's stated principles of decentralization and community governance. 
The technical implementation seems sound and the benefits to the ecosystem outweigh the potential risks.

Key factors considered:
- Alignment with user's values
- Technical feasibility
- Community impact
- Risk assessment

Final recommendation: YES"""
        
        return jsonify({
            "success": True,
            "response": mock_ai_response
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to process request",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
