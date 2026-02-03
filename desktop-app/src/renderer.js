const { ipcRenderer } = require('electron');

const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

let conversationHistory = [];

// Send message on button click
sendButton.addEventListener('click', () => sendMessage());

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendSuggestion(text) {
    messageInput.value = text;
    sendMessage();
}

async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;

    // Clear input
    messageInput.value = '';

    // Remove welcome message if it exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    // Add user message to UI
    addMessage(message, 'user');

    // Add conversation to history
    conversationHistory.push({ role: 'user', content: message });

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        // Send to backend (this will be connected to DRIFT RAG)
        const response = await processMessage(message);

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Add assistant response
        addMessage(response.content, 'assistant');
        conversationHistory.push({ role: 'assistant', content: response.content });

    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('Sorry, something went wrong. Please try again.', 'assistant');
        console.error('Error:', error);
    }
}

function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTypingIndicator() {
    const typingId = 'typing-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = typingId;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = 'Thinking...';

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return typingId;
}

function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId);
    if (typingDiv) {
        typingDiv.remove();
    }
}

async function processMessage(message) {
    // This is where DRIFT RAG will be integrated
    // For now, we'll simulate intelligent responses

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('create') && lowerMessage.includes('knowledge')) {
        return {
            role: 'assistant',
            content: `Great! I'll help you create a knowledge base. 

To create a knowledge base with DRIFT RAG:

1. I can process documents (PDF, DOCX, TXT)
2. Extract knowledge automatically
3. Build connections between concepts
4. Enable intelligent querying

Would you like to:
• Upload documents to process
• Create knowledge manually
• Import from existing sources

Just tell me what you'd like to do!`
        };
    }

    if (lowerMessage.includes('how') && (lowerMessage.includes('use') || lowerMessage.includes('work'))) {
        return {
            role: 'assistant',
            content: `DRIFT RAG (Dynamic Reasoning and Inference with Flexible Traversal) is your intelligent knowledge system!

Here's what I can do:

🔍 **Smart Search**: Find information using multi-hop reasoning
🧠 **Knowledge Graphs**: Connect related concepts automatically  
💡 **Inference**: Fill knowledge gaps with AI reasoning
📚 **Document Processing**: Extract knowledge from files
⚡ **Natural Language**: Just chat with me naturally!

Try asking me to:
• "Create a knowledge base about machine learning"
• "Process this document: [file path]"
• "What's the connection between X and Y?"
• "Configure my settings"

What would you like to do first?`
        };
    }

    if (lowerMessage.includes('example')) {
        return {
            role: 'assistant',
            content: `Here's a quick example of DRIFT RAG in action:

**Example: Learning Path Discovery**

You: "What do I need to learn before deep learning?"

DRIFT RAG will:
1. Find entry points (deep learning concept)
2. Traverse prerequisites backward
3. Infer missing connections
4. Rank learning paths
5. Return: "Python → Math → Machine Learning → Neural Networks → Deep Learning"

**Try it yourself!** Tell me:
• What topics interest you
• What you want to learn
• Any documents to process

I'll build an intelligent knowledge graph for you!`
        };
    }

    if (lowerMessage.includes('configure') || lowerMessage.includes('settings')) {
        return {
            role: 'assistant',
            content: `Let's configure your DRIFT RAG system! 🔧

I can help you set up:

⚙️ **Performance**:
   • Quick Mode (fast, simple queries)
   • Balanced Mode (recommended)
   • Deep Mode (comprehensive research)

🎯 **Behavior**:
   • Entry points: How many starting nodes (1-10)
   • Depth: How deep to explore (1-5)
   • Direction: forward/backward/bidirectional

📊 **Features**:
   • Enable/disable AI inference
   • Set confidence thresholds
   • Choose inference strategies

Just tell me what you'd like to configure, or say "use recommended settings" and I'll optimize everything for you!`
        };
    }

    // Default intelligent response
    return {
        role: 'assistant',
        content: `I understand you said: "${message}"

I'm your DRIFT RAG assistant! I can help you:

• 📚 Build knowledge bases from documents
• 🔍 Answer complex questions with multi-hop reasoning
• 🧠 Find connections between concepts
• ⚙️ Configure system settings
• 💡 Learn how to use advanced features

What would you like to explore? Just describe it in your own words!`
    };
}

// Focus input on load
window.addEventListener('load', () => {
    messageInput.focus();
});
