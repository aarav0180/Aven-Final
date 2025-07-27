"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Settings,
  Upload,
  File,
  FileText,
  ImageIcon,
  Trash2,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Eye,
  Moon,
  Sun,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { getStoredTheme, setStoredTheme } from "@/lib/theme"
import { getOrCreateUserId } from "@/lib/utils"

interface Document {
  id: string
  name: string
  type: string
  size: string
  uploadDate: Date
  preview?: string
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false); // Always default to false for SSR
  const [documents, setDocuments] = useState<Document[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Mock user ID - in a real app, this would come from authentication
  const userId = typeof window !== "undefined" ? getOrCreateUserId() : ""

  useEffect(() => {
    setIsDarkMode(getStoredTheme());
    loadDocuments();
    loadCustomPrompt();
  }, []);

  const themeClasses = isDarkMode
    ? "bg-gradient-to-b from-[#0B0B0B] to-[#141414] text-white"
    : "bg-gradient-to-b from-white to-gray-50 text-gray-900"

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    setStoredTheme(newTheme)
  }

  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/documents/list?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setDocuments(
          data.documents.map((doc: any) => ({
            ...doc,
            uploadDate: new Date(doc.uploadDate),
          })),
        )
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
    }
  }

  const loadCustomPrompt = async () => {
    try {
      const response = await fetch(`/api/settings/prompt?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setCustomPrompt(data.prompt)
      }
    } catch (error) {
      console.error("Failed to load custom prompt:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("userId", userId) // <-- use persistent userId

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (data.success) {
          toast({
            title: "Document uploaded",
            description: `${file.name} has been processed and added to your context.`,
          })
        } else {
          throw new Error(data.error)
        }
      }

      // Reload documents list
      await loadDocuments()
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeDocument = async (id: string) => {
    try {
      const response = await fetch("/api/documents/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId: id }),
      })

      const data = await response.json()

      if (data.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id))
        toast({
          title: "Document removed",
          description: "The document has been removed from your context.",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete failed",
        description: "There was an error removing the document. Please try again.",
        variant: "destructive",
      })
    }
  }

  const saveCustomPrompt = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/settings/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, prompt: customPrompt }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Settings saved",
          description: "Your custom prompt has been saved successfully.",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Save failed",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="text-red-500" size={20} />
    if (type.includes("image")) return <ImageIcon className="text-blue-500" size={20} />
    return <File className="text-gray-500" size={20} />
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses}`}>
      <div className="h-screen flex">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "w-64" : "w-16"} transition-all duration-300 ${
            isDarkMode ? "bg-black border-white/10" : "bg-white border-gray-200"
          } border-r flex flex-col`}
        >
          {/* Sidebar Header */}
          <div
            className={`p-4 border-b ${isDarkMode ? "border-white/10" : "border-gray-200"} flex items-center justify-between`}
          >
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white" : "bg-black"}`}
                >
                  <span className={`font-bold text-sm ${isDarkMode ? "text-black" : "text-white"}`}>A</span>
                </div>
                <span className="text-xl font-bold font-['Canela','Georgia','serif']">Aven</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-4">
            <div className="space-y-2">
              <Button
                variant="default"
                className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} p-3 ${
                  isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                <Settings size={20} />
                {sidebarOpen && <span className="ml-3">Settings</span>}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className={`p-4 border-t ${isDarkMode ? "border-white/10" : "border-gray-200"} space-y-2`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} p-3 ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
              }`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {sidebarOpen && <span className="ml-3">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
            </Button>
            <Link href="/chat">
              <Button
                variant="ghost"
                className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} p-3 ${
                  isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                }`}
              >
                <ArrowLeft size={20} />
                {sidebarOpen && <span className="ml-3">Back to Chat</span>}
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Settings Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1
                className={`text-3xl font-bold font-['Canela','Georgia','serif'] ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                Settings
              </h1>
              <p className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Manage your chat preferences and context documents
              </p>
            </div>

            {/* Document Context Section */}
            <Card className={`${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
              <CardHeader>
                <CardTitle className={`flex items-center space-x-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  <FileText size={24} />
                  <span>Context Documents</span>
                </CardTitle>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Upload documents to provide context for your AI conversations. These will help the AI understand your
                  specific needs and provide more accurate responses.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDarkMode ? "border-white/20 hover:border-white/30" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2
                        className={`mx-auto h-12 w-12 mb-4 animate-spin ${isDarkMode ? "text-gray-400" : "text-gray-400"}`}
                      />
                      <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        Processing Documents...
                      </h3>
                      <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Please wait while we process and vectorize your documents
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
                      <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        Upload Documents
                      </h3>
                      <p className={`mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Drag and drop files here, or click to browse
                        <br />
                        <span className="text-sm">Supports PDF, DOC, DOCX, TXT, and images</span>
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`${
                          isDarkMode
                            ? "bg-white text-black hover:bg-gray-200"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        Choose Files
                      </Button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </div>

                {/* Document List */}
                {documents.length > 0 && (
                  <div className="space-y-4">
                    <h4 className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Uploaded Documents ({documents.length})
                    </h4>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                            isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {getFileIcon(doc.type)}
                            <div>
                              <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{doc.name}</p>
                              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {doc.size} • Uploaded {doc.uploadDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${
                                isDarkMode
                                  ? "text-gray-400 hover:text-gray-300 hover:bg-white/10"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${
                                isDarkMode
                                  ? "text-gray-400 hover:text-gray-300 hover:bg-white/10"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              <Download size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(doc.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Preferences */}
            <Card className={`${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? "text-white" : "text-gray-900"}>Chat Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="response-style" className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    Response Style
                  </Label>
                  <select
                    id="response-style"
                    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option>Professional</option>
                    <option>Casual</option>
                    <option>Technical</option>
                    <option>Friendly</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context-prompt" className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    Custom Context Prompt
                  </Label>
                  <Textarea
                    id="context-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Add any specific context or instructions for the AI assistant..."
                    className={`min-h-[100px] ${
                      isDarkMode
                        ? "bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        : "bg-white border-gray-300"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card className={`${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? "text-white" : "text-gray-900"}>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    Display Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    className={`${
                      isDarkMode
                        ? "bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        : "bg-white border-gray-300"
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className={`${
                      isDarkMode
                        ? "bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        : "bg-white border-gray-300"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={saveCustomPrompt}
                disabled={isSaving}
                className={`px-8 ${
                  isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
