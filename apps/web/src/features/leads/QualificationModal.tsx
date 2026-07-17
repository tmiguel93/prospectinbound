import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type Data = {
  score: number;
  questions: Array<{ id: string; label: string }>;
  responses: Array<{ questionId: string; answerJson: string; points: number }>;
};
export function QualificationModal({
  leadId,
  onClose,
  onSaved
}: {
  leadId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    apiRequest<Data>(`/api/qualifications/${leadId}`)
      .then(setData)
      .catch(() => setError('Não foi possível carregar a qualificação.'));
  }, [leadId]);
  const save = async (questionId: string, answer: string, points: number) => {
    try {
      await apiRequest(`/api/qualifications/${leadId}/responses`, {
        method: 'PUT',
        body: JSON.stringify({ questionId, answer, points })
      });
      const next = await apiRequest<Data>(`/api/qualifications/${leadId}`);
      setData(next);
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar.');
    }
  };
  return (
    <div className="modal-backdrop">
      <section className="modal-panel">
        <div className="flex justify-between">
          <div>
            <p className="eyebrow text-cyan-700">Qualificação</p>
            <h2 className="text-xl font-bold">Score: {data?.score ?? 0}</h2>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Fechar
          </button>
        </div>
        {error && <p className="mt-4 text-rose-700">{error}</p>}
        {!data && !error && <p className="mt-6 text-slate-500">Carregando perguntas...</p>}
        <div className="mt-6 space-y-4">
          {data?.questions.map((question) => {
            const response = data.responses.find((item) => item.questionId === question.id);
            return (
              <Question
                key={question.id}
                question={question}
                answer={response ? JSON.parse(response.answerJson) : ''}
                points={response?.points ?? 0}
                onSave={save}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
function Question({
  question,
  answer,
  points,
  onSave
}: {
  question: { id: string; label: string };
  answer: string;
  points: number;
  onSave: (id: string, answer: string, points: number) => void;
}) {
  const [value, setValue] = useState(answer);
  const [score, setScore] = useState(String(points));
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <p className="font-medium">{question.label}</p>
      <textarea
        className="field"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={2}
      />
      <div className="mt-3 flex gap-2">
        <input
          className="field w-28"
          type="number"
          value={score}
          onChange={(event) => setScore(event.target.value)}
        />
        <button
          className="primary-button"
          onClick={() => onSave(question.id, value, Number(score))}
          type="button"
        >
          Salvar
        </button>
      </div>
    </article>
  );
}
