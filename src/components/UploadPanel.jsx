import React, {useCallback, useState} from "react";
import { useDropzone } from "react-dropzone";

export default function UploadPanel({onAnalyze, loading}){
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [email, setEmail] = useState(""); 
  const [sendEmail, setSendEmail] = useState(true);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const fd = new FormData();
    fd.append("file", acceptedFiles[0]);
    fd.append("inputType", "file");
    fd.append("sendEmail", sendEmail ? "1" : "0");
    if(email) fd.append("email", email);
    onAnalyze(fd);
  }, [onAnalyze, sendEmail, email]);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, maxFiles:1});

  function submitText(e){
    e.preventDefault();
    const fd = new FormData();
    fd.append("text", text);
    fd.append("inputType", "text");
    fd.append("sendEmail", sendEmail ? "1" : "0");
    if(email) fd.append("email", email);
    onAnalyze(fd);
  }

  function submitUrl(e){
    e.preventDefault();
    const fd = new FormData();
    fd.append("url", url);
    fd.append("inputType", "url");
    fd.append("sendEmail", sendEmail ? "1" : "0");
    if(email) fd.append("email", email);
    onAnalyze(fd);
  }

  return (
    <div className="bg-slate-800 p-6 rounded">
      <div {...getRootProps()} className="border-2 border-dashed border-slate-600 p-6 text-center rounded cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? <p>Slipp filen her ...</p> : <p>Drag & drop PDF / bilde hit, eller klikk for å velge</p>}
      </div>

      <form onSubmit={submitText} className="mt-4">
        <label className="block mb-1">Lim inn rapporttekst</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} className="w-full bg-slate-700 p-3 rounded h-28"></textarea>
        <button className="mt-2 px-4 py-2 bg-emerald-500 text-black rounded" disabled={loading}>{loading ? "Analysere..." : "Analyser tekst"}</button>
      </form>

      <form onSubmit={submitUrl} className="mt-4">
        <label className="block mb-1">Eller lim inn URL</label>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-700 p-2 rounded"/>
        <button className="mt-2 px-4 py-2 bg-emerald-500 text-black rounded" disabled={loading}>{loading ? "Analysere..." : "Analyser URL"}</button>
      </form>

      <div className="mt-4 flex gap-3 items-center">
        <input placeholder="Motta resultater (e-post)" value={email} onChange={e=>setEmail(e.target.value)} className="bg-slate-700 p-2 rounded w-full"/>
        <label className="flex items-center gap-2 text-slate-300">
          <input type="checkbox" checked={sendEmail} onChange={e=>setSendEmail(e.target.checked)} />
          Send resultater på e-post
        </label>
      </div>
    </div>
  );
}
