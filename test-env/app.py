import os

from flask import Flask, request, jsonify
from dotenv import load_dotenv


load_dotenv('/app/.env')
app = Flask(__name__)

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
                            "id": "daotest.eth",
                            "name": "DAO_test"
                        }
                    }
                ]
            }
        })
    return jsonify({"error": "Invalid request"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)