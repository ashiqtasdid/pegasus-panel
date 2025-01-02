"use client";

import Image from "next/image";
import React from "react";
import {
  VscFiles,
  VscSearch,
  VscSourceControl,
  VscDebugAlt,
  VscRemote,
  VscSync,
  VscExtensions,
  VscChevronDown,
  VscCode,
  VscClose,
} from "react-icons/vsc";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import "prismjs/themes/prism-tomorrow.css";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/themes/prism-tomorrow.css";
import { useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

interface FileItem {
  name: string;
  content: string;
  type: string;
}

const ImportModal = ({ onChoice }: { onChoice: (choice: boolean) => void }) => {
  return (
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
};

const Home = () => {
  const IconSize = 35;
  const hasStoredFiles =
    typeof window !== "undefined" && !!localStorage.getItem("files");
  const [showImportModal, setShowImportModal] = useState(hasStoredFiles);

  const [files, setFiles] = useState<FileItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("files");
      if (saved && hasStoredFiles) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("files");
    if (saved && showImportModal) {
      setShowImportModal(true);
    } else {
      setFiles([]);
    }
  }, []);

  const handleImportChoice = (choice: boolean) => {
    try {
      if (choice && hasStoredFiles) {
        const saved = localStorage.getItem("files");
        if (saved) {
          const parsedFiles = JSON.parse(saved);
          setFiles(parsedFiles);
        }
      } else {
        // Only clear storage on explicit "No"
        localStorage.removeItem("files");
        setFiles([]);
      }
    } catch (error) {
      console.error("Error handling import choice:", error);
    }
    setShowImportModal(false);
  };

  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem("files", JSON.stringify(files));
    }
  }, [files]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            content: content,
            type: file.type,
          },
        ]);
      };
      reader.readAsText(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleFileClick = (file: FileItem) => {
    setActiveFile(file);
  };
  useEffect(() => {
    if (activeFile) {
      Prism.highlightAll();
    }
  }, [activeFile]);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const handleContentChange = (content: string) => {
    if (activeFile) {
      const updatedFile = { ...activeFile, content };
      setActiveFile(updatedFile);
      setFiles(
        files.map((f) => (f.name === activeFile.name ? updatedFile : f))
      );
    }
  };

  const handleSave = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeFile) {
          setIsSaving(true);
          // Save to localStorage
          const updatedFiles = files.map((f) =>
            f.name === activeFile.name ? activeFile : f
          );
          localStorage.setItem("files", JSON.stringify(updatedFiles));
          console.log("Saving file:", activeFile.name);

          setTimeout(() => {
            setIsSaving(false);
          }, 500);
        }
      }
    },
    [activeFile, files]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleSave);
    return () => window.removeEventListener("keydown", handleSave);
  }, [handleSave]);
  return (
    <>
      {showImportModal && <ImportModal onChoice={handleImportChoice} />}

      <div>
        <div className="flex items-center justify-between px-4">
          <div className="w-1/3 flex items-center space-x-8">
            <div className="-mx-2">
              <Image
                src={"/assets/logo.png"}
                height={50}
                width={50}
                alt="logo"
                className="brightness-0  invert"
              />{" "}
            </div>
            <div className="flex space-x-5">
              <ul>File</ul>
              <ul>Edit</ul>
              <ul>View</ul>
              <ul>Terminal</ul>
              <ul>Run</ul>
              <ul>Help</ul>
            </div>
          </div>

          <div className="w-1/3 flex justify-center">
            <input
              type="text"
              className="w-[800px] px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search..."
            />
          </div>

          <div className="w-1/3">{/* Reserved for future use */}</div>
        </div>
        <div className="flex h-screen">
          <div className="border-r-2 border-t-2 text-center p-5 justify-center flex w-16">
            <ul className="space-y-6 ">
              <li className="text-gray-400 hover:text-white cursor-pointer">
                <VscFiles size={IconSize} />
              </li>
              <li className="text-gray-400 hover:text-white cursor-pointer">
                <VscSearch size={IconSize} />
              </li>
              <li className="text-gray-400 hover:text-white cursor-pointer">
                <VscSourceControl size={IconSize} />
              </li>
              <li className="text-gray-400 hover:text-white cursor-pointer">
                <VscDebugAlt size={IconSize} />
              </li>
              <li className="text-gray-400 hover:text-white cursor-pointer">
                <VscRemote size={IconSize} />
              </li>
              <li className="text-gray-400 hover:text-white cursor-pointer">
                <VscSync size={IconSize} />
              </li>
              <li className="text-gray-400 hover:text-white cursor-pointer">
                <VscExtensions size={IconSize} />
              </li>
            </ul>
          </div>
          {/* File Manager */}
          <div className="flex border-t-2 w-full">
            <div className="w-64 border-r-2 text-gray-300 bg-[#252526]">
              <div className="w-64 border-r-2 text-gray-300 bg-[#252526]">
                <div className="px-4 py-2 uppercase text-xs font-semibold tracking-wide">
                  Explorer
                </div>
                {files.length === 0 ? (
                  <div
                    {...getRootProps()}
                    className={`p-4 h-full flex items-center justify-center border-2 border-dashed m-4 rounded ${
                      isDragActive ? "bg-[#2a2d2e]" : ""
                    }`}
                  >
                    <input {...getInputProps()} />
                    <p className="text-gray-500 text-sm text-center">
                      Drop files here
                      <br />
                      to start editing
                    </p>
                  </div>
                ) : (
                  <div className="p-4">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        onClick={() => handleFileClick(file)}
                        className="flex items-center py-1 cursor-pointer hover:bg-[#2a2d2e]"
                      >
                        <VscCode className="mr-2" size={16} />
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  {...getRootProps()}
                  className={`p-4 ${isDragActive ? "bg-[#2a2d2e]" : ""}`}
                >
                  <input {...getInputProps()} />
                </div>
              </div>
            </div>
            <div className="w-full">
              {/* Tabs */}
              <div className="flex border-b-2 h-9">
                {activeFile && (
                  <div className="flex items-center px-3 py-1 border-t border-[#007acc] text-white text-sm min-w-[120px] max-w-[200px] group">
                    <VscCode className="mr-1" size={20} />
                    <span className="truncate flex-1">{activeFile.name}</span>
                    {isSaving ? (
                      <span className="text-xs text-gray-400">Saving...</span>
                    ) : (
                      <VscClose
                        className="opacity-0 group-hover:opacity-100 hover:bg-[#333333] rounded"
                        size={16}
                        onClick={() => setActiveFile(null)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Code Content */}
              <div className="h-full w-full overflow-auto relative bg-[#1e1e1e]">
                {activeFile ? (
                  <div className="font-mono text-sm relative">
                    <textarea
                      ref={editorRef}
                      value={activeFile.content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      className="absolute top-0 left-0 w-full h-full bg-transparent text-transparent caret-white outline-none resize-none p-4 z-10"
                      spellCheck={false}
                    />
                    <pre className="pointer-events-none p-4">
                      <code
                        className={`language-${
                          activeFile.name.endsWith("ts") ||
                          activeFile.name.endsWith("tsx")
                            ? "typescript"
                            : "javascript"
                        }`}
                      >
                        {activeFile.content}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a file to view
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
