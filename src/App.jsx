import React, { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import ResultsCard from "./components/ResultsCard";
import axios from "axios";

export default function App(){
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze(formData){
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post("/api/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });
      setResult(res.data);
    } catch (e) {
      console.error(e);
      setResult({ error: e.response?.data || e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900 text-slate-100 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Reco AI — Demo</h1>
          <p className="text-slate-300">QA + Automatisert kalkyle for bygg- og skaderapporter</p>
        </header>
        <UploadPanel onAnalyze={handleAnalyze} loading={loading}/>
        <div className="mt-6">
          <ResultsCard data={result} />
          {result?.mail && <div className="mt-3 text-sm text-slate-300">E-post sendt til: {result.mail.to}</div>}
        </div>
      </div>
    </div>
  );
}
