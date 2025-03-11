import { useEffect } from "react";
import Modal from "../../base/Modal"

const VotesModal = ({ isOpen, onClose, votes = [] }) => {


  useEffect(() => {
    if (isOpen) {
      console.log(votes);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <table className="w-full text-sm text-gray-600">
            <thead>
                <tr className="border-b border-gray-200">
                    <th className="py-2 text-left font-medium">Proposal ID</th>
                    <th className="py-2 text-left font-medium">Support</th>
                </tr>
            </thead>
            <tbody>
                {votes.map(({ args }) => (
                    <tr key={args.proposalId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-2">{args.proposalId}</td>
                        <td className="py-2">{args.support ? 'Yes' : 'No'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </Modal>
  );
};

export default VotesModal;