import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { chatWithAI } from '../services/api';
import Layout from '../components/Layout';

function normalizeAssistantMarkdown(text) {
    if (typeof text !== 'string') return String(text ?? '');

    let t = text.trim();

    // 如果模型把 markdown 包在 ```markdown ... ``` 里，去掉外层代码围栏
    const fenceMatch = t.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch) {
        t = fenceMatch[1].trim();
    }

    // 处理常见转义：\#\#、\*\*、\n
    t = t
        .replace(/\\([#*_`[\]()])/g, '$1')
        .replace(/\\n/g, '\n');

    return t;
}

function ChatWithAI() {
    const { token } = useAuth();

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your AI career coach. You can chat with me naturally about career fair prep, resumes, companies, sponsorship, or recruiting strategy.\n\nIf you want structured tools, you can also use:\n\n**/match** → rank all companies by fit with your resume\n\n**/match [company]** → score your fit with one specific company\n\n**/pitch** → generate a tailored elevator pitch for a company\n\n**/optimize** → polish and strengthen your resume text\n\n**/visual** → upload a company logo to identify it and score your fit\n\nYou can also upload an image directly without any command and I'll treat it as /visual.",
            sendToBackend: false,
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageBase64, setSelectedImageBase64] = useState('');
    const [selectedImageMime, setSelectedImageMime] = useState('');
    const [selectedImagePreview, setSelectedImagePreview] = useState('');

    const sendMessage = async () => {
        const typedQuestion = input.trim();
        const hasImage = !!selectedImageBase64;

        if ((!typedQuestion && !hasImage) || loading) return;

        const question = typedQuestion || '/visual';

        const userMessageText = hasImage
            ? `${question}\n[Image uploaded: ${selectedImage?.name || 'company logo'}]`
            : question;

        const nextMessages = [...messages, { role: 'user', content: userMessageText }];
        const backendHistory = nextMessages
            .filter((msg) => msg.sendToBackend !== false)
            .map(({ role, content }) => ({ role, content }));
        setMessages(nextMessages);
        setInput('');
        setLoading(true);
        setError('');

        try {
            const result = await chatWithAI(
                token,
                question,
                backendHistory,
                'evt_umich_fall_2025',
                selectedImageBase64,
                selectedImageMime
            );

            if (result.error) {
                throw new Error(result.details || result.error);
            }

            const rawAnswer = result.answer || 'I could not generate a response.';
            const normalizedAnswer = normalizeAssistantMarkdown(rawAnswer);

            setMessages([
                ...nextMessages,
                {
                    role: 'assistant',
                    content: normalizedAnswer,
                },
            ]);

            clearSelectedImage();
        } catch (err) {
            setError(err.message || 'Failed to talk to AI.');
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        await sendMessage();
    };

    const handleKeyDown = async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            await sendMessage();
        }
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const commaIndex = result.indexOf(',');
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed for /visual.');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            setSelectedImage(file);
            setSelectedImageBase64(base64);
            setSelectedImageMime(file.type || 'image/jpeg');
            setSelectedImagePreview(URL.createObjectURL(file));
            setError('');
        } catch {
            setError('Failed to read image.');
        }
    };

    const clearSelectedImage = () => {
        setSelectedImage(null);
        setSelectedImageBase64('');
        setSelectedImageMime('');
        setSelectedImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    return (
        <Layout>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 24 }}>
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #d4caba',
                        borderRadius: 16,
                        padding: '20px 24px',
                        marginBottom: 16,
                    }}
                >
                    <h1 style={{ color: '#1a1a18' }}>Chat With AI</h1>
                    <p style={{ color: '#7a7268' }}>
                        Ask about company fit, resume alignment, sponsorship constraints, locations,
                        or how to prioritize the career fair.
                    </p>
                </div>

                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        background: '#fff',
                        borderRadius: 16,
                        border: '1px solid #d4caba',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        marginBottom: 20,
                    }}
                >
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={
                                msg.role === 'user'
                                    ? {
                                          background: '#1a1a18',
                                          color: '#f5f0e8',
                                          borderRadius: 14,
                                          padding: '12px 16px',
                                          alignSelf: 'flex-end',
                                      }
                                    : {
                                          background: '#ede8dc',
                                          color: '#1a1a18',
                                          borderRadius: 14,
                                          padding: '12px 16px',
                                          alignSelf: 'flex-start',
                                      }
                            }
                        >
                            <div className="chat-role">{msg.role === 'user' ? 'You' : 'AI'}</div>
                            <div className="chat-content">
                                {msg.role === 'assistant' ? (
                                    <div className="chat-markdown">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {normalizeAssistantMarkdown(msg.content)}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="chat-plain">{msg.content}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div
                            style={{
                                background: '#ede8dc',
                                color: '#1a1a18',
                                borderRadius: 14,
                                padding: '12px 16px',
                                alignSelf: 'flex-start',
                            }}
                        >
                            <div className="chat-role">AI</div>
                            <div className="chat-content">Thinking...</div>
                        </div>
                    )}
                </div>

                {error && (
                    <div
                        style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: 10,
                            padding: '10px 14px',
                            fontSize: 13,
                            marginBottom: 12,
                        }}
                    >
                        {error}
                    </div>
                )}

                {(
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: 12 }}>
                        {[
                            { label: '🎯 Match me with companies', command: '/match' },
                            { label: '🗣️ Generate elevator pitch', command: '/pitch' },
                            { label: '📄 Optimize my resume', command: '/optimize' },
                        ].map(({ label, command }) => (
                            <button
                                key={command}
                                type="button"
                                onClick={() => setInput(command)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: 10,
                                    border: '1px solid #d4caba',
                                    background: '#fff',
                                    color: '#1a1a18',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#fff';
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <form style={{ marginTop: 12 }} onSubmit={handleSubmit}>
                    {selectedImagePreview && (
                        <div style={{ marginBottom: '10px' }}>
                            <img
                                src={selectedImagePreview}
                                alt="Selected upload"
                                style={{
                                    maxWidth: '180px',
                                    maxHeight: '120px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    display: 'block',
                                    marginBottom: '8px',
                                }}
                            />
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                                    {selectedImage?.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={clearSelectedImage}
                                    style={{
                                        width: 'auto',
                                        padding: '6px 12px',
                                        border: '1px solid #d4caba',
                                        background: 'transparent',
                                        color: '#1a1a18',
                                        borderRadius: 10,
                                    }}
                                >
                                    Remove Image
                                </button>
                            </div>
                        </div>
                    )}

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Try /match, /match Google, /visual, /optimize, /pitch, or upload a logo image..."
                        rows={3}
                        style={{
                            border: '1px solid #d4caba',
                            borderRadius: 12,
                            padding: 12,
                            fontSize: 14,
                            fontFamily: 'inherit',
                            fontWeight: 450,
                            outline: 'none',
                            resize: 'vertical',
                            background: '#fff',
                            width: '100%',
                            boxSizing: 'border-box',
                        }}
                    />

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: 'auto',
                                border: '1px solid #d4caba',
                                background: 'transparent',
                                color: '#1a1a18',
                                borderRadius: 10,
                                padding: '10px 20px',
                            }}
                        >
                            Upload Image
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: '#1a1a18',
                                color: '#f5f0e8',
                                borderRadius: 10,
                                padding: '10px 20px',
                                border: 'none',
                                fontWeight: 600,
                            }}
                        >
                            {loading ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>

            </div>
        </Layout>
    );
}

export default ChatWithAI;
