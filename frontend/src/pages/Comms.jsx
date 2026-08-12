import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Comms() {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const { data } = await api.get('/api/comms/messages');
    setMessages(data.data.messages);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Messages</h1>
      <p className="mt-1 text-sm text-neutral-500">Inbox and company announcements</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form
          className="panel space-y-2 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await api.post('/api/comms/messages', { subject, body, toUser: 1 });
            setBody('');
            setSubject('');
            setNotice('Message sent');
            load();
          }}
        >
          <h2 className="text-sm font-medium text-neutral-500">Compose</h2>
          <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <textarea className="input min-h-[120px]" placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} required />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn">Send</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                await api.post('/api/comms/announcements', {
                  subject: subject || 'Announcement',
                  body: body || 'Company update',
                });
                setNotice('Announcement posted');
                load();
              }}
            >
              Post announcement
            </button>
          </div>
          {notice && <p className="text-sm text-neutral-600">{notice}</p>}
        </form>

        <div className="panel max-h-[28rem] overflow-auto p-4">
          <h2 className="text-sm font-medium text-neutral-500">Inbox</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {messages.map((m) => (
              <li key={m.id} className="border-b border-neutral-100 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="font-medium">{m.subject}</strong>
                  {!!m.is_announcement && <span className="text-xs text-neutral-400">Announcement</span>}
                </div>
                <div className="mt-1 text-neutral-600" dangerouslySetInnerHTML={{ __html: m.body }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
