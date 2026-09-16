// Frontend App for AI Deal Negotiator & Telegram Closer

document.addEventListener('DOMContentLoaded', () => {
  const clientChatBox = document.getElementById('clientChatBox');
  const clientInputForm = document.getElementById('clientInputForm');
  const clientTextInput = document.getElementById('clientTextInput');

  const tgChatBody = document.getElementById('tgChatBody');
  const tgOwnerInput = document.getElementById('tgOwnerInput');
  const btnSendOwnerTg = document.getElementById('btnSendOwnerTg');

  const btnResetDemo = document.getElementById('btnResetDemo');
  const dealsTableBody = document.getElementById('dealsTableBody');
  const dealsCount = document.getElementById('dealsCount');

  let activeProposalId = null;

  // 1. Initialize Server-Sent Events (SSE)
  const eventSource = new EventSource('/api/stream');

  eventSource.addEventListener('chat_message', (e) => {
    const data = JSON.parse(e.data);
    addClientBubble(data.sender, data.text);
    if (data.invoiceUrl) {
      loadDeals();
    }
  });

  eventSource.addEventListener('telegram_message', (e) => {
    const data = JSON.parse(e.data);
    renderTelegramMessage(data);
  });

  eventSource.addEventListener('session_reset', () => {
    clientChatBox.innerHTML = '';
    tgChatBody.innerHTML = `
      <div class="tg-bubble bot-intro">
        <p>👋 <strong>সালাম বস!</strong> আমি আপনার সার্বক্ষণিক এআই সেলস বট।</p>
        <p>যেকোনো ক্লায়েন্ট মেসেজ দিলে আমি ডিল হ্যান্ডেল করব। বাজেট বা জরুরি সিদ্ধান্ত নেওয়ার সময় সরাসরি এখানে আপনাকে নোটিফাই করব।</p>
        <span class="tg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
    loadInitialGreeting();
  });

  // 2. Client Chat Bubble Handler
  function addClientBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    
    // Format bold/newlines nicely
    let formatted = escapeHtml(text).replace(/\n/g, '<br>');
    bubble.innerHTML = `${formatted}<span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
    
    clientChatBox.appendChild(bubble);
    clientChatBox.scrollTop = clientChatBox.scrollHeight;
  }

  // 3. Telegram Smartphone Message Renderer
  function renderTelegramMessage(tgData) {
    const time = tgData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bubble = document.createElement('div');

    if (tgData.type === 'approval_request') {
      activeProposalId = tgData.proposal.proposalId;
      bubble.className = 'tg-bubble alert-bubble';

      const boldText = escapeHtml(tgData.text)
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      let buttonsHtml = '';
      if (tgData.buttons && tgData.buttons.length > 0) {
        buttonsHtml = `
          <div class="tg-inline-keyboard">
            <div class="tg-row">
              <button class="tg-btn btn-accept" onclick="respondOwner('${tgData.proposal.proposalId}', 'accept')">
                ✅ ৳${tgData.proposal.clientOffer.toLocaleString()} এপ্রুভ করো
              </button>
              <button class="tg-btn" onclick="respondOwner('${tgData.proposal.proposalId}', 'counter', ${tgData.proposal.suggestedCounter})">
                💬 পাল্টা অফার: ৳${tgData.proposal.suggestedCounter.toLocaleString()}
              </button>
            </div>
            <div class="tg-row">
              <button class="tg-btn btn-reject" onclick="respondOwner('${tgData.proposal.proposalId}', 'reject')">
                ❌ ডিল রিজেক্ট করো
              </button>
            </div>
          </div>
        `;
      }

      bubble.innerHTML = `${boldText}${buttonsHtml}<span class="tg-time">${time}</span>`;
    } else if (tgData.type === 'deal_closed') {
      bubble.className = 'tg-bubble deal-closed-bubble';
      const boldText = escapeHtml(tgData.text)
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      bubble.innerHTML = `${boldText}<span class="tg-time">${time}</span>`;
      loadDeals();
    } else {
      bubble.className = 'tg-bubble';
      bubble.innerHTML = `${escapeHtml(tgData.text)}<span class="tg-time">${time}</span>`;
    }

    tgChatBody.appendChild(bubble);
    tgChatBody.scrollTop = tgChatBody.scrollHeight;
  }

  // 4. Owner Action via Telegram Buttons
  window.respondOwner = async (proposalId, action, counterPrice = null) => {
    // Add owner visual confirmation bubble inside Telegram phone
    const ackBubble = document.createElement('div');
    ackBubble.className = 'tg-bubble';
    ackBubble.style.alignSelf = 'flex-end';
    ackBubble.style.background = '#e1ffc7';

    let actionText = '';
    if (action === 'accept') actionText = '✅ ক্লায়েন্টের অফার অনুমোদন করলাম। ডিল কনফার্ম করো!';
    if (action === 'counter') actionText = `💬 পাল্টা অফার ৳${counterPrice.toLocaleString()} টাকা বলো।`;
    if (action === 'reject') actionText = '❌ এই বাজেট সম্ভব না, রিজেক্ট করো।';

    ackBubble.innerHTML = `<strong>${actionText}</strong><span class="tg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
    tgChatBody.appendChild(ackBubble);
    tgChatBody.scrollTop = tgChatBody.scrollHeight;

    // Send to backend
    await fetch('/api/telegram/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, action, counterPrice })
    });
  };

  // 5. Owner Custom Text Input via Telegram phone
  btnSendOwnerTg.addEventListener('click', async () => {
    const text = tgOwnerInput.value.trim();
    if (!text) return;

    const ackBubble = document.createElement('div');
    ackBubble.className = 'tg-bubble';
    ackBubble.style.alignSelf = 'flex-end';
    ackBubble.style.background = '#e1ffc7';
    ackBubble.innerHTML = `<strong>${escapeHtml(text)}</strong><span class="tg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
    tgChatBody.appendChild(ackBubble);
    tgChatBody.scrollTop = tgChatBody.scrollHeight;

    tgOwnerInput.value = '';

    await fetch('/api/telegram/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId: activeProposalId, action: 'custom', customText: text })
    });
  });

  tgOwnerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnSendOwnerTg.click();
  });

  // 6. Client Input Handler
  clientInputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = clientTextInput.value.trim();
    if (!text) return;

    clientTextInput.value = '';
    await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'default_client', text })
    });
  });

  // 7. Quick 1-Click Prompt Chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      clientTextInput.value = chip.getAttribute('data-text');
      clientInputForm.dispatchEvent(new Event('submit'));
    });
  });

  // 8. Reset Demo
  btnResetDemo.addEventListener('click', async () => {
    await fetch('/api/chat/reset', { method: 'POST' });
  });

  // 9. Load Closed Deals
  async function loadDeals() {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      dealsCount.textContent = `${data.totalOrders} টি ডিল সম্পন্ন`;

      if (data.orders.length === 0) {
        dealsTableBody.innerHTML = `<tr><td colspan="7" class="empty-msg">এখনো কোনো ডিল ফাইনাল হয়নি। উপরের চ্যাটে ডিল শুরু করুন!</td></tr>`;
        return;
      }

      dealsTableBody.innerHTML = data.orders.map(order => `
        <tr>
          <td><strong>#${order.orderId}</strong></td>
          <td>${escapeHtml(order.customer.name)}</td>
          <td>${escapeHtml(order.customer.phone)}</td>
          <td>${escapeHtml(order.items[0]?.name || 'Custom Package')}</td>
          <td><strong style="color: #34d399">৳ ${order.pricing.grandTotal.toLocaleString()}</strong></td>
          <td><span class="status-badge-green">ডিল ফাইনাল</span></td>
          <td>
            <a href="${order.invoiceUrl}" target="_blank" class="btn-memo">
              📄 মেমো PDF
            </a>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  function loadInitialGreeting() {
    addClientBubble('bot', 'সালাম! আমি এআই বিজনেস অ্যাসিস্ট্যান্ট। 🌸\nআপনি কি কোনো কাস্টম সফটওয়্যার, ওয়েবসাইট বা ই-কমার্স সার্ভিসের খোঁজ করছেন? আপনার কাজের বিবরণ বা বাজেট শেয়ার করলে আমি আপনাকে সাহায্য করতে পারি।');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Boot up
  loadInitialGreeting();
  loadDeals();
});
