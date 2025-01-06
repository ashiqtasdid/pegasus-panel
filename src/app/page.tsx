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
  MAX_OPEN_FILES,
  MAX_RECENT_FILES,
  IconSize,
} from "@/constants/constants";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { storage } from "@/lib/utils";
import { SidebarIcon } from "@/types/type";
import { FileValidationError } from "@/types/type";

const notify = {
  error: (message: string) => toast.error(message),
  success: (message: string) => toast.success(message),
};
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

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
  const [openFiles, setOpenFiles] = useState<FileItem[]>([]);
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  const [fileTreeWidth, setFileTreeWidth] = useState(() => {
    return storage.get("fileTreeWidth", 256);
  });

  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [isResizing, setIsResizing] = useState(false);

  const [isFileTreeVisible, setIsFileTreeVisible] = useState(() => {
    return storage.get("fileTreeVisible", true);
  });

  const toggleFileTree = (): void => {
    setIsFileTreeVisible((prev: boolean): boolean => {
      const newState: boolean = !prev;
      storage.set("fileTreeVisible", newState);
      return newState;
    });
  };
  console.log(recentFiles);

  const handleFileClick = useCallback((file: FileItem) => {
    // Create a new file instance with a unique ID and current timestamp
    const newFile = {
      ...file,
      id: `${file.name}-${Date.now()}`, // Add unique ID
      lastOpened: new Date(),
    };

    // Update open files list
    setOpenFiles((prev) => {
      // If we've reached max tabs, remove the oldest one
      if (prev.length >= MAX_OPEN_FILES) {
        return [...prev.slice(1), newFile];
      }
      // Otherwise just add the new file
      return [...prev, newFile];
    });

    // Make the new file active
    setActiveFile(newFile);

    // Update recent files list
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f !== file.name);
      return [file.name, ...filtered].slice(0, MAX_RECENT_FILES);
    });

    // Trigger syntax highlighting after state update
    requestAnimationFrame(() => {
      Prism.highlightAll();
    });
  }, []);

  const handleCloseTab = useCallback(
    (fileId: string) => {
      setOpenFiles((prev) => prev.filter((f) => f.id !== fileId));

      // If we're closing the active file, activate the last remaining file
      if (activeFile?.id === fileId) {
        setActiveFile((prev) => {
          const remainingFiles = openFiles.filter((f) => f.id !== fileId);
          return remainingFiles.length > 0
            ? remainingFiles[remainingFiles.length - 1]
            : null;
        });
      }
    },
    [activeFile, openFiles]
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
            const isText =
              file.type.startsWith("text/") ||
              file.name.match(/\.(txt|js|jsx|ts|tsx|md|css|html|json)$/i);

            if (isText) {
              // Handle text files as before
              setFiles((prev) => [
                ...prev,
                {
                  id: `${file.name}-${Date.now()}`, // Add unique ID
                  name: file.name,
                  content: reader.result as string,
                  type: file.type,
                  lastOpened: new Date(),
                  isBase64: false,
                },
              ]);
            } else {
              // Handle binary files with base64
              setFiles((prev) => [
                ...prev,
                {
                  id: `${file.name}-${Date.now()}`, // Add unique ID
                  name: file.name,
                  content: reader.result as string,
                  type: file.type,
                  lastOpened: new Date(),
                  isBase64: false,
                },
              ]);
            }
          };

          if (
            file.type.startsWith("text/") ||
            file.name.match(/\.(txt|js|jsx|ts|tsx|md|css|html|json)$/i)
          ) {
            reader.readAsText(file);
          } else {
            reader.readAsDataURL(file);
          }
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

      // Update active file
      setActiveFile(updatedFile);

      // Update open files
      setOpenFiles((prev) =>
        prev.map((f) => (f.name === activeFile.name ? updatedFile : f))
      );

      // Update all files
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
    let blob;

    if (file.isBase64) {
      // Handle binary files
      const base64Data = file.content.split(",")[1];
      blob = new Blob([Buffer.from(base64Data, "base64")], { type: file.type });
    } else {
      // Handle text files
      blob = new Blob([file.content], { type: file.type });
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    notify.success(`Downloading ${file.name}`);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 200), 600);

      setFileTreeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      storage.set("fileTreeWidth", fileTreeWidth);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };
  }, [isResizing, startX, startWidth, fileTreeWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(fileTreeWidth);
    e.preventDefault();
  };
  return (
    <ErrorBoundary>
      {showImportModal && <ImportModal onChoice={handleImportChoice} />}

      <div className="flex flex-col h-screen bg-[#1e1e1e]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[48px] border-b border-[#333333]">
          <div className="flex items-center space-x-8">
            <div className="flex items-center h-[48px] px-2">
              <Image
                src="/assets/logo.png"
                height={32}
                width={32}
                alt="logo"
                className="brightness-0 invert"
              />
            </div>
            <div className="flex space-x-6 text-[13px] text-gray-300">
              <button className="hover:text-white px-2 py-1">File</button>
              <button className="hover:text-white px-2 py-1">Edit</button>
              <button className="hover:text-white px-2 py-1">View</button>
              <button className="hover:text-white px-2 py-1">Terminal</button>
              <button className="hover:text-white px-2 py-1">Run</button>
              <button className="hover:text-white px-2 py-1">Help</button>
            </div>
          </div>

          <div className="flex-1 max-w-2xl px-4">
            <input
              type="text"
              className="w-full bg-[#252526] text-gray-300 px-4 py-1.5 text-sm rounded border border-[#3C3C3C] focus:outline-none focus:border-[#007ACC] transition-colors"
              placeholder="Search..."
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar Icons */}
          <div className="w-[48px] bg-[#252526] flex flex-col items-center py-2 border-r border-[#333333]">
            <div className="flex flex-col space-y-4">
              {[
                {
                  Icon: VscFiles,
                  onClick: () =>
                    setIsFileTreeVisible((prevState: boolean) => !prevState),
                  isActive: isFileTreeVisible,
                },
                { Icon: VscSearch, onClick: () => {}, isActive: false },
                { Icon: VscSourceControl, onClick: () => {}, isActive: false },
                { Icon: VscDebugAlt, onClick: () => {}, isActive: false },
                { Icon: VscRemote, onClick: () => {}, isActive: false },
                { Icon: VscSync, onClick: () => {}, isActive: false },
                { Icon: VscExtensions, onClick: () => {}, isActive: false },
              ].map(({ Icon, onClick, isActive }: SidebarIcon, i: number) => (
                <button
                  key={i}
                  onClick={onClick}
                  className={`p-2 transition-colors duration-200 ease-in-out ${
                    isActive
                      ? "text-white bg-[#37373D]"
                      : "text-gray-400 hover:text-white hover:bg-[#37373D]"
                  }`}
                >
                  <Icon size={24} />
                </button>
              ))}
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 bg-[#1e1e1e] flex flex-col">
            {/* Tabs */}
            <div className="h-[35px] flex items-center bg-[#252526] border-b border-[#333333] overflow-x-auto">
              {openFiles.map((file) => (
                <div
                  key={file.id} // Use id instead of name
                  className={`group flex items-center h-[35px] px-3 border-r border-[#333333] min-w-[120px] max-w-[200px] cursor-pointer ${
                    activeFile?.id === file.id // Compare ids instead of names
                      ? "bg-[#1e1e1e]"
                      : "bg-[#2d2d2d] hover:bg-[#2a2a2a]"
                  }`}
                  onClick={() => setActiveFile(file)}
                >
                  <VscCode className="mr-2 text-[#007ACC]" size={16} />
                  <span className="text-gray-300 text-sm truncate flex-1">
                    {file.name}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 hover:bg-[#333333] p-0.5 rounded transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(file.id); // Pass id instead of name
                    }}
                  >
                    <VscClose
                      className="text-gray-400 hover:text-white"
                      size={16}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto">
              {activeFile ? (
                <Editor file={activeFile} onChange={handleContentChange} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a file to view
                </div>
              )}
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className={`w-[1px] hover:w-[2px] bg-[#333333] hover:bg-[#007ACC] cursor-col-resize z-50 transition-all ${
              isResizing ? "w-[2px] bg-[#007ACC]" : ""
            }`}
            onMouseDown={handleMouseDown}
          />

          {/* File Explorer */}
          <div
            className={`bg-[#252526] border-l border-[#333333] transform transition-all duration-200 ease-in-out ${
              isFileTreeVisible ? "translate-x-0" : "translate-x-full opacity-0"
            }`}
            style={{
              width: isFileTreeVisible ? `${fileTreeWidth}px` : "0px",
              minWidth: isFileTreeVisible ? "200px" : "0px",
              maxWidth: isFileTreeVisible ? "600px" : "0px",
              transition:
                "width 200ms ease-in-out, transform 200ms ease-in-out, opacity 150ms ease-in-out",
            }}
          >
            <div className="px-4 py-2 text-xs font-medium text-gray-400 border-b border-[#333333] uppercase tracking-wide">
              Explorer
            </div>
            {files.length === 0 ? (
              <div
                {...getRootProps()}
                className={`m-4 p-6 border-2 border-dashed border-[#333333] rounded-lg transition-colors ${
                  isDragActive ? "bg-[#2a2d2e] border-[#007ACC]" : ""
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-gray-400 text-sm text-center">
                  Drop files here to start editing
                </p>
              </div>
            ) : (
              <div className="py-2">
                {files.map((file) => (
                  <ContextMenu key={file.name}>
                    <ContextMenuTrigger asChild>
                      <div
                        onClick={() => handleFileClick(file)}
                        className={`group flex items-center px-4 py-1.5 cursor-pointer transition-colors ${
                          activeFile?.name === file.name
                            ? "bg-[#37373D]"
                            : "hover:bg-[#2A2D2E]"
                        }`}
                      >
                        <VscCode className="mr-2 text-[#007ACC]" size={16} />
                        <span className="text-gray-300 text-sm">
                          {file.name}
                        </span>
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
                        }}
                      >
                        Close
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(Home);
