import { useState } from 'react';

type Msg = { id: number; role: 'user' | 'bot'; text: string };

export function ChatMobile() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, role: 'bot', text: '현재 개발 중입니다! 출시를 기다려주세요.' },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    const next: Msg = { id: Date.now(), role: 'user', text: input.trim() };
    setMessages((m) => [...m, next, { id: Date.now() + 1, role: 'bot', text: '데모 응답: 곧 연결됩니다.' }]);
    setInput('');
  };

  return (
    <div className="mx-auto w-full max-w-mobile h-[calc(100vh-56px)] flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.role==='user' ? 'bg-accent text-white rounded-br-sm' : 'bg-neutral-100 text-fg rounded-bl-sm border border-border'}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-border bg-white px-3 py-2 flex gap-2">
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="메시지를 입력하세요" className="flex-1 border border-border rounded-lg px-3 py-2 outline-none" />
        <button onClick={send} className="px-4 py-2 rounded-lg bg-accent text-white">전송</button>
      </div>
    </div>
  );
}

export default ChatMobile;


