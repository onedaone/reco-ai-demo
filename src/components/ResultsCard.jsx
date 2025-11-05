import React, {useState} from "react";

function computeTotal(items){
  let total = 0;
  items.forEach(it => {
    const q = Number(it.qty || 0);
    const p = Number(it.unit_price || it.suggested_unit_price || 0);
    it.subtotal = Math.round(q * p);
    total += it.subtotal;
  });
  return total;
}

export default function ResultsCard({data}){
  const [items, setItems] = useState(data?.items || []);
  const [edited, setEdited] = useState(false);

  React.useEffect(()=>{ setItems(data?.items || []); setEdited(false); }, [data]);

  if(!data) return <div className="text-slate-400 p-4">Ingen resultater ennå.</div>;
  if(data.error) return <div className="p-4 bg-red-700 rounded">{JSON.stringify(data.error)}</div>;

  const total = computeTotal(items);

  function updateItem(idx, key, val){
    const cp = items.map((it,i)=> i===idx ? {...it, [key]: val} : it);
    setItems(cp);
    setEdited(true);
  }

  return (
    <div className="bg-slate-800 p-6 rounded">
      <h2 className="text-xl font-semibold mb-3">AI-analyse</h2>
      <div className="mb-4">
        <h3 className="font-medium">Oppsummering</h3>
        <p className="text-slate-300">{data.summary || data.raw}</p>
      </div>

      <div className="mb-4">
        <h3 className="font-medium">Mangler</h3>
        <ul className="list-disc list-inside text-slate-300">{(data.missing_info||[]).map((m,i)=><li key={i}>{m}</li>)}</ul>
      </div>

      <div className="mb-4">
        <h3 className="font-medium">Forslag til forbedringer</h3>
        <div className="text-slate-300">{data.improvements}</div>
      </div>

      <div className="mb-4">
        <h3 className="font-medium">Kalkyle</h3>
        <table className="w-full text-left">
          <thead><tr className="text-slate-300"><th>Beskrivelse</th><th>Qty</th><th>Unit</th><th>Pris (NOK)</th><th>Subtotal</th></tr></thead>
          <tbody>
            {items.map((it, idx)=>(
              <tr key={idx} className="border-t border-slate-700">
                <td className="py-2">{it.desc}</td>
                <td><input value={it.qty} onChange={e=>updateItem(idx,'qty',e.target.value)} className="w-20 bg-slate-700 p-1 rounded"/></td>
                <td>{it.unit||''}</td>
                <td><input value={it.unit_price ?? it.suggested_unit_price} onChange={e=>updateItem(idx,'unit_price',e.target.value)} className="w-28 bg-slate-700 p-1 rounded"/></td>
                <td>{it.subtotal ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3">
          <strong>Total: NOK {total}</strong>
          <button onClick={() => { setItems(items.map(it => ({ ...it, subtotal: (Number(it.qty || 0) * Number((it.unit_price ?? it.suggested_unit_price) || 0)) })) ); setEdited(false); }} className="ml-3 px-3 py-1 bg-slate-700 rounded">Recompute</button>
        </div>
      </div>
    </div>
  );
}

