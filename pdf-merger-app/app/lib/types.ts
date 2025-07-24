
export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  sizeFormatted: string
}

export type ProcessingState = 'idle' | 'merging' | 'complete' | 'error'

export interface PDFMergerError {
  message: string
  type: 'validation' | 'processing' | 'size_limit'
}

export const FILE_SIZE_LIMITS = {
  MAX_TOTAL_SIZE: 200 * 1024 * 1024, // 200MB
  SUPPORTED_TYPES: ['application/pdf']
} as const
