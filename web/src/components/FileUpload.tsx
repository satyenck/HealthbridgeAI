import React, { useState } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

export function FileUpload({ onFilesSelected, maxFiles = 5 }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files).slice(0, maxFiles);
      setSelectedFiles(fileArray);
      onFilesSelected(fileArray);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'mov':
      case 'avi':
        return '🎥';
      case 'doc':
      case 'docx':
        return '📝';
      default:
        return '📎';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="file-upload">
      <div className="file-upload-zone">
        <input
          type="file"
          id="file-input"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <label htmlFor="file-input" className="file-upload-label">
          <div className="upload-icon">📁</div>
          <p>Click to upload files</p>
          <p className="upload-hint">
            Accepted: Images, Videos (up to 1 min), PDFs, Documents
          </p>
          <p className="upload-hint">Maximum {maxFiles} files</p>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="file-preview">
          <h4>Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-preview-item">
              <span className="file-icon">{getFileIcon(file.name)}</span>
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeFile(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
