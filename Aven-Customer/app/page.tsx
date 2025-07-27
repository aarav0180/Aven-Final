"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, X, ArrowRight, MessageCircle, Zap, Shield, Moon, Sun, Play } from "lucide-react"
import Link from "next/link"
import { getStoredTheme, setStoredTheme } from "@/lib/theme"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false); // Always default to false for SSR

  useEffect(() => {
    setIsDarkMode(getStoredTheme());
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    setStoredTheme(newTheme)
  }

  const themeClasses = isDarkMode
    ? "bg-gradient-to-b from-[#0B0B0B] to-[#141414] text-white"
    : "bg-gradient-to-b from-white to-gray-50 text-gray-900"

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses}`}>
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? `${isDarkMode ? "bg-black/80" : "bg-white/80"} backdrop-blur-md border-b ${isDarkMode ? "border-white/10" : "border-gray-200"}`
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white" : "bg-black"}`}
              >
                <span className={`font-bold text-sm ${isDarkMode ? "text-black" : "text-white"}`}>A</span>
              </div>
              <span className="text-xl font-bold font-['Canela','Georgia','serif']">Aven</span>
            </div>

            {/* Desktop Navigation */}
            <nav
              className={`hidden md:flex items-center space-x-8 transition-opacity duration-300 ${
                isScrolled ? "opacity-100" : "opacity-0"
              }`}
            >
              <a
                href="#features"
                className={`text-sm font-medium transition-colors ${
                  isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Features
              </a>
              <a
                href="#pricing"
                className={`text-sm font-medium transition-colors ${
                  isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pricing
              </a>
              <a
                href="#about"
                className={`text-sm font-medium transition-colors ${
                  isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                About
              </a>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={`${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              {!isScrolled && (
                <Link href="/chat">
                  <Button
                    className={`${
                      isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                    } rounded-full px-6`}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={`${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              {!isScrolled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
                >
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && !isScrolled && (
          <div
            className={`md:hidden ${isDarkMode ? "bg-black/95" : "bg-white/95"} backdrop-blur-md border-t ${isDarkMode ? "border-white/10" : "border-gray-200"}`}
          >
            <div className="px-4 py-4 space-y-4">
              <a
                href="#features"
                className={`block text-sm font-medium ${
                  isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Features
              </a>
              <a
                href="#pricing"
                className={`block text-sm font-medium ${
                  isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pricing
              </a>
              <a
                href="#about"
                className={`block text-sm font-medium ${
                  isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                About
              </a>
              <Link href="/chat">
                <Button
                  className={`w-full ${
                    isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                  } rounded-full`}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl font-bold font-['Canela','Georgia','serif'] leading-tight mb-8 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              AI Support That
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Actually Helps
              </span>
            </h1>

            <p
              className={`text-xl sm:text-2xl mb-12 leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              Experience intelligent customer support powered by advanced AI. Get instant, accurate answers and seamless
              human handoffs when you need them.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/chat">
                <Button
                  size="lg"
                  className={`${
                    isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                  } rounded-full px-8 py-6 text-lg font-medium`}
                >
                  Start Chatting
                  <MessageCircle className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="lg"
                className={`rounded-full px-8 py-6 text-lg font-medium ${
                  isDarkMode
                    ? "border-white/20 text-white hover:bg-white/10"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Chat Preview */}
            <div className="relative max-w-4xl mx-auto">
              <Card
                className={`${
                  isDarkMode
                    ? "bg-white/5 border-white/10 backdrop-blur-sm"
                    : "bg-white/80 border-gray-200 backdrop-blur-sm"
                } shadow-2xl`}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Chat Header */}
                    <div className="flex items-center space-x-3 pb-4 border-b border-gray-200 dark:border-white/10">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-600 text-white">AI</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          Aven AI Assistant
                        </h3>
                        <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Online • Responds instantly
                        </p>
                      </div>
                    </div>

                    {/* Sample Messages */}
                    <div className="space-y-4">
                      <div className="flex justify-start">
                        <div
                          className={`max-w-xs px-4 py-3 rounded-2xl rounded-bl-md ${
                            isDarkMode ? "bg-white/10 border border-white/20 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">
                            Hi! I'm here to help you with any questions about our platform. What can I assist you with
                            today?
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="max-w-xs px-4 py-3 rounded-2xl rounded-br-md bg-blue-600 text-white">
                          <p className="text-sm">How do I integrate your API with my existing system?</p>
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div
                          className={`max-w-xs px-4 py-3 rounded-2xl rounded-bl-md ${
                            isDarkMode ? "bg-white/10 border border-white/20 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">
                            Great question! I can walk you through our API integration process. We have REST and GraphQL
                            endpoints available...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Typing Indicator */}
                    <div className="flex justify-start">
                      <div
                        className={`px-4 py-3 rounded-2xl rounded-bl-md ${
                          isDarkMode ? "bg-white/10 border border-white/20" : "bg-gray-100"
                        }`}
                      >
                        <div className="flex space-x-1">
                          <div
                            className={`w-2 h-2 rounded-full animate-bounce ${
                              isDarkMode ? "bg-white/60" : "bg-gray-400"
                            }`}
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className={`w-2 h-2 rounded-full animate-bounce ${
                              isDarkMode ? "bg-white/60" : "bg-gray-400"
                            }`}
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className={`w-2 h-2 rounded-full animate-bounce ${
                              isDarkMode ? "bg-white/60" : "bg-gray-400"
                            }`}
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className={`text-4xl sm:text-5xl font-bold font-['Canela','Georgia','serif'] mb-6 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Powerful Features
            </h2>
            <p className={`text-xl max-w-3xl mx-auto ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Everything you need to provide exceptional customer support with AI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card
              className={`${
                isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-gray-200 hover:shadow-lg"
              } transition-all duration-300`}
            >
              <CardContent className="p-8 text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    isDarkMode ? "bg-blue-500/20" : "bg-blue-50"
                  }`}
                >
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Instant Responses
                </h3>
                <p className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Get immediate answers to customer queries with our advanced AI that understands context and intent.
                </p>
              </CardContent>
            </Card>

            <Card
              className={`${
                isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-gray-200 hover:shadow-lg"
              } transition-all duration-300`}
            >
              <CardContent className="p-8 text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    isDarkMode ? "bg-green-500/20" : "bg-green-50"
                  }`}
                >
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Natural Conversations
                </h3>
                <p className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Engage in human-like conversations that feel natural and provide personalized assistance.
                </p>
              </CardContent>
            </Card>

            <Card
              className={`${
                isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-gray-200 hover:shadow-lg"
              } transition-all duration-300`}
            >
              <CardContent className="p-8 text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    isDarkMode ? "bg-purple-500/20" : "bg-purple-50"
                  }`}
                >
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Secure & Reliable
                </h3>
                <p className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Enterprise-grade security with 99.9% uptime guarantee to keep your support running smoothly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>TechCorp</div>
            <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>StartupXYZ</div>
            <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Enterprise Co</div>
            <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Innovation Labs</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className={`text-4xl sm:text-5xl font-bold font-['Canela','Georgia','serif'] mb-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Ready to Transform Your Support?
          </h2>
          <p className={`text-xl mb-8 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            Join thousands of companies already using Aven to provide exceptional customer experiences.
          </p>
          <Link href="/chat">
            <Button
              size="lg"
              className={`${
                isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
              } rounded-full px-8 py-6 text-lg font-medium`}
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`${isDarkMode ? "bg-black border-white/10" : "bg-gray-50 border-gray-200"} border-t py-12 px-4 sm:px-6 lg:px-8`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white" : "bg-black"}`}
              >
                <span className={`font-bold text-sm ${isDarkMode ? "text-black" : "text-white"}`}>A</span>
              </div>
              <span className="text-xl font-bold font-['Canela','Georgia','serif']">Aven</span>
            </div>
            <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              © 2024 Aven. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
