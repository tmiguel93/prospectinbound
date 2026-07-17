import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { apiRequest } from '../../lib/api.js';

type Pipeline = { id: string; name: string };
type Partner = { id: string; name: string };
type FormValues = {
  partnerId: string;
  partnerName: string;
  productName: string;
  segment: string;
  description: string;
  demoUrl: string;
  signupUrl: string;
  plans: Array<{
    name: string;
    price: string;
    period: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'ONE_TIME';
  }>;
  fixedCommission: string;
  recurringCommission: string;
  unlimited: boolean;
  maxMonths: string;
  safetyDays: string;
  questions: string;
  pipelineId: string;
  pipelineName: string;
  stages: Array<{ name: string }>;
};
const stepNames = [
  'Parceiro',
  'Produto',
  'Planos',
  'Comissão',
  'Qualificação',
  'Pipeline',
  'Revisão'
];
const defaultStages = [
  'Novo lead',
  'Em contato',
  'Qualificado',
  'Demonstração/Reunião',
  'Fechamento'
].map((name) => ({ name }));

export function ProductWizard({
  partners,
  pipelines,
  onClose,
  onCreated
}: {
  partners: Partner[];
  pipelines: Pipeline[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const { register, handleSubmit, control, watch, formState } = useForm<FormValues>({
    defaultValues: {
      partnerId: '',
      partnerName: '',
      productName: '',
      segment: '',
      description: '',
      demoUrl: '',
      signupUrl: '',
      plans: [{ name: 'Plano Profissional', price: '129,90', period: 'MONTHLY' }],
      fixedCommission: '30,00',
      recurringCommission: '10',
      unlimited: true,
      maxMonths: '',
      safetyDays: '0',
      questions: '',
      pipelineId: '',
      pipelineName: '',
      stages: defaultStages
    }
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'plans' });
  const values = watch();
  const submit = async (data: FormValues) => {
    setError(undefined);
    const cents = (value: string) =>
      Math.round(Number(value.replace('.', '').replace(',', '.')) * 100);
    const useExistingPartner = Boolean(data.partnerId);
    const useExistingPipeline = Boolean(data.pipelineId);
    if (
      (!useExistingPartner && !data.partnerName.trim()) ||
      (!useExistingPipeline && !data.pipelineName.trim())
    ) {
      setError('Informe o parceiro e o pipeline, novos ou existentes.');
      return;
    }
    try {
      await apiRequest('/api/catalog/wizard', {
        method: 'POST',
        body: JSON.stringify({
          partnerId: data.partnerId || undefined,
          partnerName: data.partnerName || undefined,
          product: {
            name: data.productName,
            segment: data.segment,
            description: data.description || undefined,
            demoUrl: data.demoUrl,
            signupUrl: data.signupUrl,
            active: true
          },
          plans: data.plans.map((plan) => ({
            name: plan.name,
            priceCents: cents(plan.price),
            period: plan.period,
            active: true
          })),
          commission: {
            fixedActivationCents: cents(data.fixedCommission),
            recurringPercentageBps: Math.round(Number(data.recurringCommission) * 100),
            maxMonths: data.unlimited ? null : Number(data.maxMonths),
            unlimitedRecurrence: data.unlimited,
            includeFirstPayment: true,
            safetyDays: Number(data.safetyDays),
            refundPolicy: ''
          },
          pipelineId: data.pipelineId || undefined,
          pipeline: data.pipelineId
            ? undefined
            : {
                name: data.pipelineName,
                stages: data.stages
                  .filter((stage) => stage.name.trim())
                  .map((stage, index, all) => ({
                    name: stage.name,
                    color: index === all.length - 1 ? '#16a34a' : '#0891b2',
                    isInitial: index === 0,
                    isFinal: index === all.length - 1
                  }))
              },
          questions: data.questions
            .split('\n')
            .map((label) => label.trim())
            .filter(Boolean)
            .map((label) => ({ label, inputType: 'TEXT' }))
        })
      });
      onCreated();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Não foi possível criar o produto.'
      );
    }
  };
  const content = [
    <div className="wizard-grid" key="partner">
      <label className="label">
        Parceiro existente
        <select className="field" {...register('partnerId')}>
          <option value="">Criar novo parceiro</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Nome do novo parceiro
        <input
          className="field"
          disabled={Boolean(values.partnerId)}
          {...register('partnerName')}
        />
      </label>
    </div>,
    <div className="wizard-grid" key="product">
      <label className="label">
        Nome do produto
        <input className="field" {...register('productName')} />
      </label>
      <label className="label">
        Segmento
        <input className="field" {...register('segment')} />
      </label>
      <label className="label md:col-span-2">
        Descrição
        <textarea className="field" rows={3} {...register('description')} />
      </label>
      <label className="label">
        Link de demonstração
        <input className="field" {...register('demoUrl')} />
      </label>
      <label className="label">
        Link de cadastro
        <input className="field" {...register('signupUrl')} />
      </label>
    </div>,
    <div key="plans" className="space-y-3">
      {fields.map((field, index) => (
        <div className="wizard-grid rounded-lg border border-slate-200 p-3" key={field.id}>
          <label className="label">
            Nome
            <input className="field" {...register(`plans.${index}.name`)} />
          </label>
          <label className="label">
            Preço (R$)
            <input className="field" {...register(`plans.${index}.price`)} />
          </label>
          <label className="label">
            Periodicidade
            <select className="field" {...register(`plans.${index}.period`)}>
              <option value="MONTHLY">Mensal</option>
              <option value="QUARTERLY">Trimestral</option>
              <option value="SEMIANNUAL">Semestral</option>
              <option value="ANNUAL">Anual</option>
              <option value="ONE_TIME">Pagamento único</option>
            </select>
          </label>
          {fields.length > 1 && (
            <button
              className="secondary-button self-end"
              onClick={() => remove(index)}
              type="button"
            >
              Remover
            </button>
          )}
        </div>
      ))}
      <button
        className="secondary-button"
        onClick={() => append({ name: '', price: '', period: 'MONTHLY' })}
        type="button"
      >
        Adicionar plano
      </button>
    </div>,
    <div className="wizard-grid" key="commission">
      <label className="label">
        Comissão fixa (R$)
        <input className="field" {...register('fixedCommission')} />
      </label>
      <label className="label">
        Comissão recorrente (%)
        <input className="field" {...register('recurringCommission')} />
      </label>
      <label className="label">
        Prazo de segurança (dias)
        <input className="field" type="number" {...register('safetyDays')} />
      </label>
      <label className="label flex items-center gap-2 pt-6">
        <input type="checkbox" {...register('unlimited')} />
        Recorrência sem prazo
      </label>
      {!values.unlimited && (
        <label className="label">
          Máximo de meses
          <input className="field" type="number" {...register('maxMonths')} />
        </label>
      )}
    </div>,
    <label className="label" key="questions">
      Perguntas de qualificação (uma por linha)
      <textarea
        className="field"
        rows={7}
        placeholder="Quantas pessoas trabalham no estabelecimento?"
        {...register('questions')}
      />
      <span className="mt-2 block text-xs font-normal text-slate-500">
        As regras detalhadas de respostas e score serão habilitadas no próximo módulo de
        qualificação.
      </span>
    </label>,
    <div className="space-y-4" key="pipeline">
      <div className="wizard-grid">
        <label className="label">
          Pipeline existente
          <select className="field" {...register('pipelineId')}>
            <option value="">Criar novo pipeline</option>
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Nome do novo pipeline
          <input
            className="field"
            disabled={Boolean(values.pipelineId)}
            {...register('pipelineName')}
          />
        </label>
      </div>
      {!values.pipelineId && (
        <div className="wizard-grid">
          {values.stages.map((_stage, index) => (
            <label className="label" key={index}>
              Etapa {index + 1}
              <input className="field" {...register(`stages.${index}.name`)} />
            </label>
          ))}
        </div>
      )}
    </div>,
    <div key="review" className="space-y-3 text-sm">
      <p>
        <strong>Parceiro:</strong> {values.partnerId ? 'Parceiro existente' : values.partnerName}
      </p>
      <p>
        <strong>Produto:</strong> {values.productName || 'Não informado'} ·{' '}
        {values.segment || 'Sem segmento'}
      </p>
      <p>
        <strong>Planos:</strong> {values.plans.length}
      </p>
      <p>
        <strong>Pipeline:</strong> {values.pipelineId ? 'Pipeline existente' : values.pipelineName}
      </p>
      <p>
        <strong>Perguntas:</strong> {values.questions.split('\n').filter(Boolean).length}
      </p>
    </div>
  ][step];
  return (
    <div className="modal-backdrop">
      <section className="modal-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cyan-700">Novo produto</p>
            <h2 className="text-xl font-bold">Assistente de configuração</h2>
          </div>
          <button
            className="rounded-lg p-2 hover:bg-slate-100"
            onClick={onClose}
            type="button"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 flex gap-1 overflow-x-auto">
          {stepNames.map((name, index) => (
            <span
              className={`wizard-step ${index === step ? 'wizard-step-active' : ''}`}
              key={name}
            >
              {index + 1}. {name}
            </span>
          ))}
        </div>
        <form className="mt-6" onSubmit={handleSubmit(submit)}>
          <div className="min-h-52">{content}</div>
          {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <div className="mt-8 flex justify-between gap-3">
            <button
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
              type="button"
            >
              <ChevronLeft size={16} />
              Voltar
            </button>
            {step < stepNames.length - 1 ? (
              <button className="primary-button" onClick={() => setStep(step + 1)} type="button">
                Avançar
                <ChevronRight size={16} />
              </button>
            ) : (
              <button className="primary-button" disabled={formState.isSubmitting} type="submit">
                {formState.isSubmitting ? 'Criando...' : 'Criar produto'}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
