"use client";
import Image from "next/image";
import React, { useState, useCallback, useEffect } from "react";
import {
  VscFiles,
  VscSearch,
  VscSourceControl,
  VscDebugAlt,
  VscRemote,
  VscSync,
  VscExtensions,
  VscCode,
  VscClose,
} from "react-icons/vsc";
import { useDropzone } from "react-dropzone";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import dynamic from "next/dynamic";
import { useDebouncedSave } from "@/hooks/useDebounce";
import { FileItem } from "@/types/type";
import { ImportModal } from "@/components/ImportModal";
import toast from "react-hot-toast";
import {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  LOCAL_STORAGE_KEY,
  MAX_RECENT_FILES,
  IconSize,
} from "@/constants/constants";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const notify = {
  error: (message: string) => toast.error(message),
  success: (message: string) => toast.success(message),
};
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

export interface FileValidationError {
  code: string;
  message: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>;
    }
    return this.props.children;
  }
}

const Home: React.FC = () => {
  const hasStoredFiles =
    typeof window !== "undefined" && !!localStorage.getItem(LOCAL_STORAGE_KEY);

  const [showImportModal, setShowImportModal] = useState(hasStoredFiles);
  const [files, setFiles] = useState<FileItem[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved && hasStoredFiles ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  console.log(recentFiles);
  const handleFileClick = useCallback(
    (file: FileItem) => {
      // Don't re-open if already active
      if (activeFile?.name === file.name) {
        return;
      }

      // Update active file
      setActiveFile({
        ...file,
        lastOpened: new Date(),
      });

      // Update recent files list
      setRecentFiles((prev) => {
        const filtered = prev.filter((f) => f !== file.name);
        return [file.name, ...filtered].slice(0, MAX_RECENT_FILES);
      });

      // Trigger syntax highlighting after state update
      requestAnimationFrame(() => {
        Prism.highlightAll();
      });
    },
    [activeFile]
  );

  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
    }
  }, [files]);

  const validateFile = useCallback(
    (file: File) => {
      const errors = [];

      if (file.size > MAX_FILE_SIZE) {
        errors.push("File exceeds 5MB limit");
      }

      if (!ALLOWED_FILE_TYPES.some((type) => file.name.endsWith(type))) {
        errors.push(
          `File type not allowed. Supported: ${ALLOWED_FILE_TYPES.join(", ")}`
        );
      }

      if (files.some((f) => f.name === file.name)) {
        errors.push("File with same name already exists");
      }

      if (errors.length) {
        throw new Error(errors.join("\n"));
      }

      return true;
    },
    [files]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      try {
        acceptedFiles.forEach((file) => {
          validateFile(file);
          const reader = new FileReader();
          reader.onload = () => {
            const content = reader.result as string;
            // Remove DOMPurify to preserve code content
            setFiles((prev) => [
              ...prev,
              {
                name: file.name,
                content: content,
                type: file.type,
                lastOpened: new Date(),
              },
            ]);
          };
          reader.readAsText(file);
        });
      } catch (error) {
        console.error("File validation failed:", error);
        notify.error(
          error instanceof Error ? error.message : "File validation failed"
        );
      }
    },
    [validateFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleImportChoice = useCallback(
    (choice: boolean) => {
      try {
        if (choice && hasStoredFiles) {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            setFiles(JSON.parse(saved));
          }
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setFiles([]);
        }
      } catch (error) {
        console.error("Error handling import choice:", error);
      }
      setShowImportModal(false);
    },
    [hasStoredFiles]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!activeFile) return;

      const updatedFile = {
        ...activeFile,
        content: content,
      };
      setActiveFile(updatedFile);
      setFiles((prev) =>
        prev.map((f) => (f.name === activeFile.name ? updatedFile : f))
      );
    },
    [activeFile]
  );

  const debouncedSave = useDebouncedSave();

  const handleSave = useCallback(
    (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key === "s") || !activeFile) return;

      e.preventDefault();
      setIsSaving(true);

      debouncedSave(() => {
        try {
          const updatedFiles = files.map((f) =>
            f.name === activeFile.name ? activeFile : f
          );
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedFiles));
        } catch (error) {
          console.error("Save failed:", error);
        } finally {
          setIsSaving(false);
        }
      });
    },
    [activeFile, files, debouncedSave]
  );

  useEffect(() => {
    if (activeFile) {
      Prism.highlightAll();
    }
  }, [activeFile]);

  useEffect(() => {
    window.addEventListener("keydown", handleSave);
    return () => window.removeEventListener("keydown", handleSave);
  }, [handleSave]);

  const handleDownload = useCallback((file: FileItem) => {
    // Create blob from file content
    const blob = new Blob([file.content], { type: "text/plain" });

    // Create download URL
    const url = window.URL.createObjectURL(blob);

    // Create temporary link element
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    notify.success(`Downloading ${file.name}`);
  }, []);

  return (
    <ErrorBoundary>
      {showImportModal && <ImportModal onChoice={handleImportChoice} />}

      <div>
        <div className="flex bg-black items-center justify-between px-4">
          <div className="w-1/3 bg-black flex items-center space-x-8">
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

          <div className="w-1/3 bg-black flex justify-center">
            <input
              type="text"
              className="w-[800px] bg-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search..."
            />
          </div>

          <div className="w-1/3">{/* Reserved for future use */}</div>
        </div>
        <div className="flex bg-black h-screen">
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
          <div className="flex bg-black border-t-2 w-full">
            <div className="w-64 border-r-2 text-gray-300 ">
              <div className="w-64 border-r-2 text-gray-300 ">
                <div className="px-4 py-2 border-b-2 uppercase text-xs font-semibold tracking-wide">
                  Explorer
                </div>
                {files.length === 0 ? (
                  <div
                    {...getRootProps()}
                    className={`p-4 h-full flex  items-center justify-center border-2 border-dashed m-4 rounded ${
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
                    {files.map((file) => (
                      <ContextMenu key={file.name}>
                        <ContextMenuTrigger asChild>
                          <div>
                            <div
                              key={file.name}
                              onClick={() => handleFileClick(file)}
                              className={`flex items-center py-1 border-b-2 cursor-pointer hover:bg-[#2a2d2e] ${
                                activeFile?.name === file.name
                                  ? "bg-[#37373d]"
                                  : ""
                              }`}
                            >
                              <VscCode className="mr-2" size={16} />
                              <span>{file.name}</span>
                            </div>

                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            inset
                            onClick={() => handleDownload(file)}
                          >
                            Download
                          </ContextMenuItem>
                          <ContextMenuItem
                            inset
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeFile?.name === file.name) {
                                setActiveFile(null);
                              }
                              setFiles((prev) =>
                                prev.filter((f) => f.name !== file.name)
                              );
                              localStorage.setItem(
                                LOCAL_STORAGE_KEY,
                                JSON.stringify(
                                  files.filter((f) => f.name !== file.name)
                                )
                              );
                            }}                          >
                            Close
                          </ContextMenuItem>

                        </ContextMenuContent>
                      </ContextMenu>
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
                  <div className="flex items-center px-3 border-r-2 border-white py-1  text-white text-sm min-w-[120px] max-w-[200px] group">
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
              <div className="h-screen w-full overflow-auto relative bg-[#1e1e1e]">
                {activeFile ? (
                  <Editor file={activeFile} onChange={handleContentChange} />
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
    </ErrorBoundary>
  );
};

export default React.memo(Home);
