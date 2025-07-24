
'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FilePlus2, 
  UploadCloud, 
  FileText, 
  X, 
  Download, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { PDFDocument } from 'pdf-lib'

interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  sizeFormatted: string
}

type ProcessingState = 'idle' | 'merging' | 'complete' | 'error'

export default function PDFMerger() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getTotalSize = useCallback(() => {
    return files?.reduce((total, file) => total + (file?.size ?? 0), 0) ?? 0
  }, [files])

  const MAX_SIZE = 200 * 1024 * 1024 // 200MB

  const validateFile = (file: File): string | null => {
    if (!file) return 'Invalid file'
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed'
    }
    if (file.size > MAX_SIZE) {
      return `File size exceeds 200MB limit`
    }
    return null
  }

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = []
    const errors: string[] = []

    Array.from(selectedFiles).forEach((file, index) => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file?.name ?? 'Unknown file'}: ${error}`)
        return
      }

      // Check if file already exists
      const exists = files?.some(f => f?.name === file?.name && f?.size === file?.size)
      if (exists) {
        errors.push(`${file?.name ?? 'Unknown file'}: Already added`)
        return
      }

      newFiles.push({
        id: `${Date.now()}-${index}`,
        file,
        name: file?.name ?? 'Unknown file',
        size: file?.size ?? 0,
        sizeFormatted: formatFileSize(file?.size ?? 0)
      })
    })

    // Check total size after adding new files
    const currentTotal = getTotalSize()
    const newTotal = currentTotal + newFiles.reduce((sum, f) => sum + (f?.size ?? 0), 0)
    
    if (newTotal > MAX_SIZE) {
      errors.push(`Total size would exceed 200MB limit`)
      toast.error('File size limit exceeded')
      return
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...(prev ?? []), ...newFiles])
      toast.success(`Added ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`)
    }
  }, [files, getTotalSize])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e?.dataTransfer?.files ?? null)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => (prev ?? []).filter(f => f?.id !== id))
    toast.success('File removed')
  }, [])

  const mergePDFs = async () => {
    if (!files || files.length < 2) {
      toast.error('Please select at least 2 PDF files')
      return
    }

    setProcessingState('merging')
    
    try {
      const mergedPdf = await PDFDocument.create()

      for (const fileItem of files) {
        if (!fileItem?.file) continue
        
        const arrayBuffer = await fileItem.file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        
        pages.forEach((page) => {
          mergedPdf.addPage(page)
        })
      }

      const pdfBytes = await mergedPdf.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      setMergedPdfUrl(url)
      setProcessingState('complete')
      toast.success('PDFs merged successfully!')
      
    } catch (error) {
      console.error('Error merging PDFs:', error)
      setProcessingState('error')
      toast.error('Failed to merge PDFs. Please try again.')
    }
  }

  const downloadMergedPDF = () => {
    if (!mergedPdfUrl) return
    
    const link = document.createElement('a')
    link.href = mergedPdfUrl
    link.download = 'merged-document.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Download started!')
  }

  const resetApp = () => {
    setFiles([])
    setProcessingState('idle')
    setMergedPdfUrl(null)
    if (fileInputRef?.current) {
      fileInputRef.current.value = ''
    }
    toast.success('Reset complete')
  }

  const totalSize = getTotalSize()
  const sizePercentage = (totalSize / MAX_SIZE) * 100
  const canMerge = files && files.length >= 2 && totalSize <= MAX_SIZE && processingState === 'idle'
  const isProcessing = processingState === 'merging'

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <FilePlus2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">PDF Combiner</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Combine multiple PDF files into a single document. Fast, secure, and processed entirely in your browser.
        </p>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef?.current?.click()}
        >
          <UploadCloud className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Drag and drop your PDFs here
          </h2>
          <p className="text-muted-foreground mb-4">
            or click to select files
          </p>
          <div className="btn-primary inline-flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            Select Files
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Maximum total size: <span className="font-medium">200 MB</span>
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={(e) => handleFileSelect(e?.target?.files)}
          className="hidden"
        />
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files && files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Selected Files ({files.length})
            </h3>
            
            <div className="space-y-3">
              {files.map((file, index) => (
                <motion.div
                  key={file?.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="file-item group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file?.name}</p>
                      <p className="text-sm text-muted-foreground">{file?.sizeFormatted}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file?.id ?? '')}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg transition-all duration-200"
                    aria-label={`Remove ${file?.name}`}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Size Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Total files: {files.length} | Total size: {formatFileSize(totalSize)}
                </span>
                <span className={`font-medium ${totalSize > MAX_SIZE ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formatFileSize(MAX_SIZE)} limit
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${totalSize > MAX_SIZE ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min(sizePercentage, 100)}%` }}
                />
              </div>
            </div>

            {totalSize > MAX_SIZE && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-destructive text-sm"
              >
                <AlertCircle className="h-4 w-4" />
                Total size exceeds 200MB limit. Please remove some files.
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <AnimatePresence>
        {files && files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={mergePDFs}
              disabled={!canMerge || isProcessing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
            >
              {processingState === 'merging' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <FilePlus2 className="h-4 w-4" />
                  Merge PDFs
                </>
              )}
            </button>

            {processingState === 'complete' && mergedPdfUrl && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={downloadMergedPDF}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Merged PDF
              </motion.button>
            )}

            <button
              onClick={resetApp}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Start Over
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {processingState === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center p-6 bg-success/10 border border-success/20 rounded-lg"
          >
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-success mb-1">Success!</h3>
            <p className="text-muted-foreground">
              Your PDFs have been merged successfully. Click the download button to save your file.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
