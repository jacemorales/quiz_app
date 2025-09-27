<template>
  <div class="app">
    <aside class="sidebar">
      <button @click="startNewChat" class="new-chat">+ New Chat</button>
      <ul>
        <li
          v-for="chat in chats"
          :key="chat.id"
          :class="{ active: chat.id === currentChatId }"
          @click="switchChat(chat.id)"
        >
          Chat {{ chat.id }}
        </li>
      </ul>
    </aside>

    <main class="chat-container">
      <div v-for="(msg, i) in currentMessages" :key="i" :class="getBubbleClass(msg.sender)">
        {{ msg.text }}
      </div>

      <textarea
        v-model="input"
        ref="textarea"
        @keydown="handleKey"
        placeholder="Type your message..."
        rows="1"
        style="overflow: hidden"
      />
      <button @click="clearChat" class="clear-btn">Clear Chat</button>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'

let chatIdCounter = 1

const input = ref('')
const textarea = ref(null)
const chats = ref([])
const currentChatId = ref(null)

// Start with one chat
const startNewChat = () => {
  const id = chatIdCounter++
  chats.value.push({ id, messages: [] })
  currentChatId.value = id
}

// Get current messages
const currentMessages = computed(() => {
  return chats.value.find(c => c.id === currentChatId.value)?.messages || []
})

// Add a new message
const addMessage = (text, sender) => {
  const chat = chats.value.find(c => c.id === currentChatId.value)
  if (chat) chat.messages.push({ text, sender })
}

const switchChat = (id) => {
  currentChatId.value = id
}

const clearChat = () => {
  const chat = chats.value.find(c => c.id === currentChatId.value)
  if (chat) chat.messages = []
  saveToStorage()
}

const handleKey = async (e) => {
  autoResize()
  if (e.key === 'Enter') {
    if (e.shiftKey) return
    e.preventDefault()
    const text = input.value.trim()
    if (!text) return
    addMessage(text, 'user_search')
    input.value = ''
    autoResize()
    await sendToAI(text)
    saveToStorage()
  }
}

const sendToAI = async (msg) => {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: msg
          }]
        }]
      })
    })
    
    if (!res.ok) {
      const errorData = await res.json()
      console.error('API Error Response:', errorData)
      throw new Error(`API Error: ${errorData.error?.message || res.statusText}`)
    }

    const data = await res.json()
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      addMessage(data.candidates[0].content.parts[0].text, 'ai_results')
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    console.error('AI API Error:', error)
    addMessage(`Error: ${error.message}`, 'ai_results')
  }
}

const autoResize = () => {
  if (textarea.value) {
    textarea.value.style.height = 'auto'
    textarea.value.style.height = textarea.value.scrollHeight + 'px'
  }
}

// Style binding via function
const getBubbleClass = (sender) => {
  return [
    'bubble',
    sender === 'user_search' ? 'user-bubble' : 'ai-bubble'
  ]
}

// Persistence
onMounted(() => {
  const saved = localStorage.getItem('chatHistory')
  if (saved) {
    const parsed = JSON.parse(saved)
    chats.value = parsed.chats || []
    currentChatId.value = parsed.currentChatId || chats.value[0]?.id
    chatIdCounter = chats.value.length + 1
  } else {
    startNewChat()
  }

  // Check if API key is configured
  if (!import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.VITE_DEEPSEEK_API_KEY === 'your_deepseek_api_key_here') {
    console.error('DeepSeek API key is not configured properly')
    addMessage('Error: DeepSeek API key is not configured. Please check your .env file.', 'ai_results')
  }
})

const saveToStorage = () => {
  localStorage.setItem('chatHistory', JSON.stringify({
    chats: chats.value,
    currentChatId: currentChatId.value
  }))
}

watch(chats, saveToStorage, { deep: true })
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background: #2f2f2f;
  color: white;
  padding: 10px;
}

.sidebar .new-chat {
  margin-bottom: 10px;
  width: 100%;
  padding: 8px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
}

.sidebar li.active,
.sidebar li:hover {
  background: #444;
}

.chat-container {
  flex: 1;
  padding: 20px;
  display: block;
  overflow-y: auto;
}
main > div {margin-bottom: 20px;}
.user-bubble{margin-left: auto;}
textarea {
  width: 100%;
  max-width: 600px;
  padding: 10px;
  border-radius: 10px;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: height 0.1s ease;
}

.clear-btn {
  margin-top: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background-color: #ff5e57;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.bubble {
  padding: 10px 15px;
  border-radius: 20px;
  max-width: 80%;
  white-space: pre-wrap;
  width: fit-content;
}

.user-bubble {
  align-self: flex-end;
  background-color: #d1ecf1;
}

.ai-bubble {
  align-self: flex-start;
  background-color: #f1f1f1;
}
</style>
