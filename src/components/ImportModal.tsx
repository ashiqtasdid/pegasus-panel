import { FC } from 'react';

interface ImportModalProps {
  onChoice: (choice: boolean) => void;
}

export const ImportModal: FC<ImportModalProps> = ({ onChoice }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-[#252526] p-6 rounded-lg shadow-lg max-w-md">
      <h2 className="text-xl text-white mb-4">Import Previous Session</h2>
      <p className="text-gray-300 mb-6">
        Would you like to import files from your last session?
      </p>
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => onChoice(false)}
          className="px-4 py-2 bg-[#333333] text-white rounded hover:bg-[#404040]"
        >
          No
        </button>
        <button
          onClick={() => onChoice(true)}
          className="px-4 py-2 bg-[#007acc] text-white rounded hover:bg-[#1a8ad4]"
        >
          Yes
        </button>
      </div>
    </div>
  </div>
);