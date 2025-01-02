export interface FileItem {
  name: string;
  content: string;
  type: string;
  lastOpened?: Date;
}

export interface FileValidationError {
  code: string;
  message: string;
}
