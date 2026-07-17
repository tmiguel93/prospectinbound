import { useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type Stage = { id: string; name: string };
type Product = { id: string; name: string; pipeline: { id: string; stages: Stage[] } | null };
type Field =
  | 'ignore'
  | 'establishmentName'
  | 'contactName'
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'city'
  | 'state'
  | 'source'
  | 'priority';
type ParsedCsv = { headers: string[]; rows: string[][] };

const fields: Array<{ value: Field; label: string }> = [
  { value: 'ignore', label: 'Ignorar coluna' },
  { value: 'establishmentName', label: 'Estabelecimento' },
  { value: 'contactName', label: 'Responsável' },
  { value: 'phone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'city', label: 'Cidade' },
  { value: 'state', label: 'UF' },
  { value: 'source', label: 'Origem' },
  { value: 'priority', label: 'Prioridade' }
];

function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === ';')) {
      row.push(field.trim());
      field = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      field = '';
      row = [];
    } else field += character;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return { headers: [], rows: [] };
  return { headers: rows[0].map((header) => header.replace(/^\uFEFF/, '')), rows: rows.slice(1) };
}

function inferField(header: string): Field {
  const normalized = header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/(estabelecimento|empresa|razao|nome fantasia)/.test(normalized)) return 'establishmentName';
  if (/(responsavel|contato)/.test(normalized)) return 'contactName';
  if (/whats/.test(normalized)) return 'whatsapp';
  if (/(telefone|celular|fone)/.test(normalized)) return 'phone';
  if (/mail/.test(normalized)) return 'email';
  if (/cidade/.test(normalized)) return 'city';
  if (/^(uf|estado)$/.test(normalized)) return 'state';
  if (/origem/.test(normalized)) return 'source';
  if (/prioridade/.test(normalized)) return 'priority';
  return 'ignore';
}

export function ImportLeadsModal({
  products,
  onClose,
  onImported
}: {
  products: Product[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [parsed, setParsed] = useState<ParsedCsv>({ headers: [], rows: [] });
  const [mapping, setMapping] = useState<Field[]>([]);
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [stageId, setStageId] = useState('');
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const product = products.find((item) => item.id === productId);
  const stages = product?.pipeline?.stages ?? [];
  const mappedRows = useMemo(
    () =>
      parsed.rows.map((row) =>
        Object.fromEntries(
          row.map((value, index) => [mapping[index], value]).filter(([key]) => key !== 'ignore')
        )
      ),
    [mapping, parsed.rows]
  );

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Selecione um arquivo CSV.');
      return;
    }
    const content = parseCsv(await file.text());
    setParsed(content);
    setMapping(content.headers.map(inferField));
    setReport([]);
    setError(content.headers.length ? '' : 'O arquivo não possui cabeçalho e linhas utilizáveis.');
  };
  const submit = async () => {
    if (!product?.pipeline || !stageId) {
      setError('Selecione produto e etapa de destino.');
      return;
    }
    if (!mapping.includes('establishmentName')) {
      setError('Mapeie uma coluna para Estabelecimento.');
      return;
    }
    const incomplete = mappedRows
      .map((row, index) =>
        !String(row.establishmentName ?? '').trim()
          ? `Linha ${index + 2}: estabelecimento obrigatório.`
          : ''
      )
      .filter(Boolean);
    if (incomplete.length) {
      setReport(incomplete);
      setError('Corrija as linhas sinalizadas antes de importar.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setReport([]);
      const result = await apiRequest<{ count: number }>('/api/imports/leads', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          pipelineId: product.pipeline.id,
          stageId,
          allowDuplicates,
          rows: mappedRows
        })
      });
      setReport([`${result.count} lead(s) importado(s) com sucesso.`]);
      onImported();
    } catch (cause) {
      const importError = cause as Error & { errors?: Array<{ row: number; message: string }> };
      const message =
        importError instanceof Error ? importError.message : 'Não foi possível importar o arquivo.';
      setError(message);
      setReport(importError.errors?.map((item) => `Linha ${item.row}: ${item.message}`) ?? []);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <section className="modal-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Importar leads por CSV</h2>
            <p className="mt-1 text-sm text-slate-500">
              Até 1.000 linhas por arquivo. A importação é interrompida se houver duplicidades.
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <label className="label mt-5">
          Arquivo CSV
          <input
            className="field"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void chooseFile(event.target.files?.[0])}
          />
        </label>
        {parsed.headers.length > 0 && (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="label">
                Produto
                <select
                  className="field"
                  value={productId}
                  onChange={(event) => {
                    setProductId(event.target.value);
                    setStageId('');
                  }}
                >
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                Etapa de destino
                <select
                  className="field"
                  value={stageId}
                  onChange={(event) => setStageId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                checked={allowDuplicates}
                type="checkbox"
                onChange={(event) => setAllowDuplicates(event.target.checked)}
              />{' '}
              Permitir leads com mesmo e-mail, telefone ou WhatsApp
            </label>
            <h3 className="mt-6 font-semibold">Mapeamento das colunas</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {parsed.headers.map((header, index) => (
                <label className="label" key={`${header}-${index}`}>
                  {header}
                  <select
                    className="field"
                    value={mapping[index]}
                    onChange={(event) =>
                      setMapping((current) =>
                        current.map((field, fieldIndex) =>
                          fieldIndex === index ? (event.target.value as Field) : field
                        )
                      )
                    }
                  >
                    {fields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <h3 className="mt-6 font-semibold">Prévia ({parsed.rows.length} linhas)</h3>
            <div className="mt-3 max-h-44 overflow-auto rounded-lg border">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr>
                    {parsed.headers.map((header, index) => (
                      <th className="bg-slate-50 px-3 py-2" key={`${header}-${index}`}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, index) => (
                    <tr className="border-t" key={index}>
                      {parsed.headers.map((_, cellIndex) => (
                        <td className="px-3 py-2" key={cellIndex}>
                          {row[cellIndex]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                className="primary-button"
                disabled={loading}
                onClick={() => void submit()}
                type="button"
              >
                {loading ? 'Importando...' : 'Importar leads'}
              </button>
            </div>
          </>
        )}
        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {report.length > 0 && (
          <ul className="mt-4 list-disc rounded-lg bg-cyan-50 p-4 pl-8 text-sm text-cyan-900">
            {report.slice(0, 20).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
