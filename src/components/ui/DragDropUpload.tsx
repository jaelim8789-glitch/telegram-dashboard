'use client';

import { useState, useRef, useCallback, DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Upload, File, Image, X, Check } from 'lucide-react';

interface FileWithPreview extends File {
  preview: string;
}

interface DragDropUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number; // bytes
  maxFiles?: number;
  className?: string;
}

export function DragDropUpload({
  onFilesSelected,
  accept = '*',
  multiple = true,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  className
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = (newFiles: File[]) => {
    const errors: string[] = [];
    const validFiles: FileWithPreview[] = [];

    // ?åÏùº ???úÌïú ?ïÏù∏
    if (!multiple && files.length + newFiles.length > 1) {
      errors.push('?®Ïùº ?åÏùºÎß??ÖÎ°ú?úÌï† ???àÏäµ?àÎã§.');
      setErrors(errors);
      return;
    }

    if (multiple && files.length + newFiles.length > maxFiles) {
      errors.push(`${maxFiles}Í∞úÍπåÏßÄ ?åÏùº???ÖÎ°ú?úÌï† ???àÏäµ?àÎã§.`);
      setErrors(errors);
      return;
    }

    // ?åÏùº Ï≤òÎ¶¨
    for (const file of newFiles) {
      // ?åÏùº ?¨Í∏∞ ?ïÏù∏
      if (file.size > maxFileSize) {
        errors.push(`"${file.name}" ?åÏùº???àÎ¨¥ ?ΩÎãà?? (${(file.size / 1024 / 1024).toFixed(2)}MB > ${(maxFileSize / 1024 / 1024).toFixed(2)}MB)`);
        continue;
      }

      // ?åÏùº ?ïÏãù ?ïÏù∏
      if (accept !== '*' && !accept.split(',').some(type => 
        type.trim() === file.type || 
        type.trim() === file.name.split('.').pop() ||
        type.trim() === `.${file.name.split('.').pop()}`
      )) {
        errors.push(`"${file.name}" ?åÏùº ?ïÏãù???àÏö©?òÏ? ?äÏäµ?àÎã§.`);
        continue;
      }

      // ÎØ∏Î¶¨Î≥¥Í∏∞ URL ?ùÏÑ±
      const previewUrl = URL.createObjectURL(file);
      validFiles.push(Object.assign(file, { preview: previewUrl }) as FileWithPreview);
    }

    if (validFiles.length > 0) {
      const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
      setFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    }

    if (errors.length > 0) {
      setErrors(errors);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
    
    // ÎØ∏Î¶¨Î≥¥Í∏∞ URL ?¥Ï†ú
    URL.revokeObjectURL(files[index].preview);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearAll = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setErrors([]);
    onFilesSelected([]);
  };

  return (
    <div className={cn("border-2 border-dashed rounded-lg p-6 text-center transition-colors", {
      'border-blue-500 bg-blue-50/50': isDragging,
      'border-gray-300 hover:border-gray-400': !isDragging,
    }, className)}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
      />

      <div
        className="cursor-pointer"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <Upload className="mx-auto w-12 h-12 text-gray-400 mb-3" />
        <p className="text-lg font-medium mb-1">?åÏùº???¨Í∏∞???åÏñ¥???ìÍ±∞???¥Î¶≠?òÏÑ∏??/p>
        <p className="text-sm text-gray-500 mb-3">
          {accept === '*' ? 'Î™®Îì† ?ïÏãù' : accept} ?åÏùº, ÏµúÎ? {(maxFileSize / 1024 / 1024).toFixed(0)}MB
          {multiple && `, ÏµúÎ? ${maxFiles}Í∞?}
        </p>
        <Button type="button" variant="outline">
          ?åÏùº ?†ÌÉù
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-destructive flex items-center gap-1">
              <X className="w-4 h-4" />
              {error}
            </p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">?†ÌÉù???åÏùº</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Î™®Îëê ÏßÄ?∞Í∏∞
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-muted rounded-md"
              >
                <div className="flex-shrink-0">
                  {file.type.startsWith('image/') ? (
                    <Image className="w-8 h-8 text-blue-500" />
                  ) : (
                    <File className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
