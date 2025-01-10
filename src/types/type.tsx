export interface FileItem {
  id: string;
  name: string;
  content: string;
  type: string;
  path: string; 
  lastOpened?: Date;
  isBase64?: boolean;
}

export interface FileValidationError {
  code: string;
  message: string;
}

export interface FolderItem {
  name: string;
  path: string;
  isFolder: true;
}

export interface SidebarIcon {
  Icon: React.ComponentType<{ size: number }>;
  onClick: () => void;
  isActive?: boolean;
}

export interface FileValidationError {
  code: string;
  message: string;
}