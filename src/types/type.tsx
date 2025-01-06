export interface FileItem {
  id: string;
  name: string;
  content: string;
  type: string;
  lastOpened?: Date;
  isBase64?: boolean;
}

export interface FileValidationError {
  code: string;
  message: string;
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