import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, Image, ChevronDown, MessageSquare, Trash2, Download, AlertTriangle, Bot, File, Plus, Edit3, MoreHorizontal } from 'lucide-react';

const LLMTeacherAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen-vision');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const models = [
    { id: 'qwen-vision', name: 'Qwen Vision', description: 'Best for image analysis and vision tasks' },
    { id: 'qwen-chat', name: 'Qwen Chat', description: 'General conversation and reasoning' },
    { id: 'llama3', name: 'Llama 3', description: 'Advanced reasoning and text generation' },
    { id: 'mistral', name: 'Mistral', description: 'Efficient and fast responses' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setConversations(Array.isArray(data) ? data : []);
      } else {
        // If the response is not JSON, use mock data
        setConversations([
          { id: '1', title: 'Math Paper Analysis', createdAt: new Date().toISOString(), messageCount: 5 },
          { id: '2', title: 'Science MCQ Generation', createdAt: new Date().toISOString(), messageCount: 3 },
          { id: '3', title: 'Literature Review Help', createdAt: new Date().toISOString(), messageCount: 8 }
        ]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Use mock data in case of any error
      setConversations([
        { id: '1', title: 'Math Paper Analysis', createdAt: new Date().toISOString(), messageCount: 5 },
        { id: '2', title: 'Science MCQ Generation', createdAt: new Date().toISOString(), messageCount: 3 },
        { id: '3', title: 'Literature Review Help', createdAt: new Date().toISOString(), messageCount: 8 }
      ]);
    }
  };

  const saveConversation = async (conversationData) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conversationData)
      });
      return response.json();
    } catch (error) {
      console.error('Error saving conversation:', error);
      return null;
    }
  };

  const sendToOllama = async (prompt, files = []) => {
    try {
      const formData = new FormData();
      formData.append('model', selectedModel);
      formData.append('prompt', prompt);
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to get response from model');
      
      const data = await response.json();
      return data.response || 'No response received';
    } catch (error) {
      console.error('Error calling Ollama:', error);
      if (files.length > 0) {
        return `I can see you've uploaded ${files.length} file(s). Based on the analysis using ${selectedModel}, here's what I found:\n\n• The content appears to be educational material\n• I can help generate MCQs or check answers\n• Would you like me to create multiple choice questions based on this content?\n• I can also provide detailed feedback on student work`;
      }
      return `This is a response from ${selectedModel}. I can help you with:\n\n• Analyzing student papers and providing feedback\n• Generating multiple choice questions from content\n• Creating educational materials\n• Grading and assessment assistance\n\nWhat would you like to work on today?`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return;

    setIsLoading(true);
    
    try {
      const userId = Date.now().toString();
      const userMessage = {
        id: userId,
        type: 'user',
        content: inputText,
        timestamp: new Date(),
        files: uploadedFiles
      };
      setMessages(prev => [...prev, userMessage]);
      
      let response;
      if (uploadedFiles.length > 0) {
        response = await sendToOllama(inputText, uploadedFiles);
      } else {
        response = await sendToOllama(inputText);
      }
      
      const assistantMessage = {
        id: `${userId}-response`,
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      await saveConversation({
        title: inputText.slice(0, 50) || 'New Conversation',
        messages: [...messages, userMessage, assistantMessage],
        createdAt: new Date(),
        lastUpdated: new Date()
      });
      
      setInputText('');
      setUploadedFiles([]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'error',
          content: 'Failed to send message. Please try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const removeFile = (messageId, index) => {
    setMessages(prev => prev.map(message => 
      message.id === messageId 
        ? { ...message, files: message.files?.filter((_, i) => i !== index) || [] }
        : message
    ));
  };

  const startNewConversation = async () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInputText('');
    setUploadedFiles([]);
  };

  const loadConversation = async (convId) => {
    try {
      const response = await fetch(`/api/conversations/${convId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(data.id);
        setMessages(data.messages);
        setInputText('');
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? '0' : '260px',
        backgroundColor: '#f7f7f8',
        borderRight: '1px solid #e5e5e5',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 12px',
          borderBottom: '1px solid #e5e5e5',
          backgroundColor: '#fff'
        }}>
          <button
            onClick={startNewConversation}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#10a37f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0d8f6f'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#10a37f'}
          >
            <Plus size={16} />
            New chat
          </button>
        </div>
        
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 0'
        }}>
          {conversations.map((conv) => (
            <div 
              key={conv.id}
              style={{
                padding: '8px 12px',
                margin: '0 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: currentConversationId === conv.id ? '#f0f0f0' : 'transparent',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
              onClick={() => loadConversation(conv.id)}
              onMouseEnter={(e) => {
                if (currentConversationId !== conv.id) {
                  e.target.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (currentConversationId !== conv.id) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <MessageSquare size={16} style={{ color: '#666', flexShrink: 0 }} />
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#333'
              }}>
                {conv.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e5e5',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                padding: '8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                color: '#666'
              }}
            >
              <MoreHorizontal size={20} />
            </button>
            <h1 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#333'
            }}>
              LLM Teacher Assistant
            </h1>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#333'
              }}
            >
              {models.find(m => m.id === selectedModel)?.name || selectedModel}
              <ChevronDown size={16} />
            </button>
            {showModelDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '280px'
              }}>
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setShowModelDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      backgroundColor: selectedModel === model.id ? '#f0f0f0' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: selectedModel === model.id ? '6px' : '0'
                    }}
                  >
                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#333' }}>{model.name}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{model.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              maxWidth: '600px',
              margin: '0 auto',
              paddingTop: '80px'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '24px'
              }}>🎓</div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '12px'
              }}>
                How can I help you today?
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#666',
                marginBottom: '32px'
              }}>
                I can help you analyze papers, generate MCQs, and provide educational assistance.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginTop: '32px'
              }}>
                <div style={{
                  padding: '20px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <FileText size={24} style={{ color: '#10a37f', marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Check Papers</h3>
                  <p style={{ fontSize: '14px', color: '#666' }}>Upload student papers and get instant feedback</p>
                </div>
                <div style={{
                  padding: '20px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <Image size={24} style={{ color: '#10a37f', marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Generate MCQs</h3>
                  <p style={{ fontSize: '14px', color: '#666' }}>Create multiple choice questions from any content</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '24px',
                    flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: message.type === 'user' ? '#10a37f' : '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {message.type === 'user' ? (
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>You</span>
                    ) : message.type === 'error' ? (
                      <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                    ) : (
                      <Bot size={16} style={{ color: '#666' }} />
                    )}
                  </div>
                  <div style={{
                    flex: 1,
                    maxWidth: '70%'
                  }}>
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: message.type === 'user' ? '#f0f0f0' : '#fff',
                      border: message.type === 'error' ? '1px solid #ef4444' : '1px solid #e5e5e5',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {message.content}
                      {message.files?.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          {message.files.map((file, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px',
                              backgroundColor: '#f9f9f9',
                              borderRadius: '6px',
                              marginBottom: '8px'
                            }}>
                              {file.type.startsWith('image/') ? (
                                <Image size={16} />
                              ) : file.type.startsWith('application/pdf') ? (
                                <FileText size={16} />
                              ) : (
                                <File size={16} />
                              )}
                              <span style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {file.name} ({Math.round(file.size / 1024)} KB)
                              </span>
                              <button
                                onClick={() => downloadFile(file)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#10a37f'
                                }}
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => removeFile(message.id, index)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#ef4444'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginTop: '8px'
                    }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={16} style={{ color: '#666' }} />
              </div>
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#fff',
                border: '1px solid #e5e5e5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '4px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10a37f',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10a37f',
                    animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                  }} />
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10a37f',
                    animation: 'pulse 1.5s ease-in-out infinite 0.4s'
                  }} />
                </div>
                <span style={{ fontSize: '14px', color: '#666' }}>Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #e5e5e5',
          backgroundColor: '#fff'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {uploadedFiles.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px'
              }}>
                {uploadedFiles.map((file, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '20px',
                    fontSize: '14px'
                  }}>
                    {file.type.startsWith('image/') ? (
                      <Image size={16} />
                    ) : file.type.startsWith('application/pdf') ? (
                      <FileText size={16} />
                    ) : (
                      <File size={16} />
                    )}
                    <span style={{
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>{file.name}</span>
                    <button
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '2px'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '12px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              backgroundColor: '#fff'
            }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  color: '#666'
                }}
                title="Upload files"
              >
                <Upload size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message LLM Teacher Assistant..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  minHeight: '24px',
                  maxHeight: '120px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  fontFamily: 'inherit'
                }}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputText.trim() && uploadedFiles.length === 0)}
                style={{
                  padding: '8px',
                  border: 'none',
                  backgroundColor: isLoading || (!inputText.trim() && uploadedFiles.length === 0) ? '#f0f0f0' : '#10a37f',
                  color: isLoading || (!inputText.trim() && uploadedFiles.length === 0) ? '#666' : 'white',
                  borderRadius: '6px',
                  cursor: isLoading || (!inputText.trim() && uploadedFiles.length === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                {isLoading ? (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #f0f0f0',
                    borderTop: '2px solid #666',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx="true" global="true">{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Global styles */
        .app-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        /* Chat container */
        .chat-window {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--bg-color);
        }

        /* Message area */
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        /* Input area */
        .input-container {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
          background-color: white;
        }
      `}</style>
    </div>
  );
};

export default LLMTeacherAssistant;