import { useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Documents() {
  const [file, setFile] = useState('welcome.txt');
  const [content, setContent] = useState('');
  const [convertName, setConvertName] = useState('');
  const [convertOut, setConvertOut] = useState('');
  const [title, setTitle] = useState('');
  const [docBody, setDocBody] = useState('');
  const [notice, setNotice] = useState('');

  async function download(e) {
    e.preventDefault();
    const { data } = await api.get('/api/documents/download', { params: { file } });
    setContent(data.data?.content || 'File not found');
  }

  async function convert(e) {
    e.preventDefault();
    const { data } = await api.post('/api/documents/convert', { filename: convertName });
    setConvertOut(data.data?.output || data.data?.command || 'Done');
  }

  async function uploadDoc(e) {
    e.preventDefault();
    await api.post('/api/documents/upload', {
      title,
      filename: `${title.replace(/\s+/g, '-').toLowerCase() || 'note'}.txt`,
      content: docBody,
    });
    setNotice('Document saved');
    setTitle('');
    setDocBody('');
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold">Files</h1>
      <p className="mt-1 text-sm text-neutral-500">Shared documents and file tools</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form onSubmit={download} className="panel space-y-2 p-4">
          <h2 className="text-sm font-medium text-neutral-500">Open file</h2>
          <input className="input" value={file} onChange={(e) => setFile(e.target.value)} />
          <button type="submit" className="btn">Open</button>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap bg-neutral-50 p-3 text-xs text-neutral-700">{content}</pre>
        </form>

        <div className="space-y-4">
          <form onSubmit={uploadDoc} className="panel space-y-2 p-4">
            <h2 className="text-sm font-medium text-neutral-500">New document</h2>
            <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="input min-h-[80px]" placeholder="Content" value={docBody} onChange={(e) => setDocBody(e.target.value)} />
            <button type="submit" className="btn">Save</button>
            {notice && <p className="text-sm text-neutral-600">{notice}</p>}
          </form>

          <form onSubmit={convert} className="panel space-y-2 p-4">
            <h2 className="text-sm font-medium text-neutral-500">Convert document</h2>
            <input className="input" placeholder="Filename" value={convertName} onChange={(e) => setConvertName(e.target.value)} />
            <button type="submit" className="btn-secondary">Run conversion</button>
            {convertOut && <p className="text-sm text-neutral-600">{convertOut}</p>}
          </form>
        </div>
      </div>
    </Layout>
  );
}
