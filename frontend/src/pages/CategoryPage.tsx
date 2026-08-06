import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceDisplay from '../components/PriceDisplay';
import { useAsyncData } from '../hooks/useAsyncData';
import { CategoryQuestion } from '../types';

const renderQuestionInput = (
  question: CategoryQuestion,
  value: unknown,
  onChange: (nextValue: unknown) => void,
) => {
  switch (question.type) {
    case 'textarea':
      return <textarea value={(value as string) || ''} onChange={(event) => onChange(event.target.value)} />;
    case 'number':
      return <input type="number" value={(value as string) || ''} onChange={(event) => onChange(Number(event.target.value))} />;
    case 'boolean':
      return <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />;
    case 'select':
      return (
        <select value={(value as string) || ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select one</option>
          {(question.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case 'multiselect':
      return (
        <select
          multiple
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value))}
        >
          {(question.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case 'date':
      return <input type="date" value={(value as string) || ''} onChange={(event) => onChange(event.target.value)} />;
    default:
      return <input value={(value as string) || ''} onChange={(event) => onChange(event.target.value)} />;
  }
};

const CategoryPage = () => {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { data: category, loading, error } = useAsyncData(() => categoriesApi.get(id), [id]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [urgency, setUrgency] = useState<'standard' | 'priority' | 'emergency'>('standard');
  const [notes, setNotes] = useState('');

  const estimate = useMemo(() => {
    if (!category) return 0;
    const multiplier = urgency === 'emergency' ? 1.5 : urgency === 'priority' ? 1.2 : 1;
    return Math.round(category.basePrice * multiplier);
  }, [category, urgency]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!category) return;
    navigate('/customer/book', {
      state: {
        category,
        answers,
        urgency,
        notes,
      },
    });
  };

  if (loading) return <LoadingSpinner label="Loading category…" />;
  if (!category || error) return <div className="page"><div className="banner error">{error || 'Category not found.'}</div></div>;

  return (
    <div className="page stack-lg fade-in">
      <section className="card stack-sm">
        <p className="eyebrow">{category.slug}</p>
        <h2>{category.name}</h2>
        <p className="muted-text">{category.description}</p>
        <PriceDisplay amount={estimate} prefix="Estimated starting price" />
      </section>

      <form className="card form-stack" onSubmit={handleSubmit}>
        <h3>Tell us more</h3>
        {(category.questions || []).map((question) => (
          <label className="field" key={question.id}>
            <span>{question.label}</span>
            {renderQuestionInput(question, answers[question.id], (nextValue) =>
              setAnswers((current) => ({ ...current, [question.id]: nextValue })),
            )}
          </label>
        ))}
        <label className="field">
          <span>Urgency</span>
          <select value={urgency} onChange={(event) => setUrgency(event.target.value as 'standard' | 'priority' | 'emergency')}>
            <option value="standard">Standard (today or later)</option>
            <option value="priority">Priority (within a few hours)</option>
            <option value="emergency">Emergency (ASAP)</option>
          </select>
        </label>
        <label className="field">
          <span>Extra notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything the provider should know?" />
        </label>
        <button className="button primary" type="submit">Continue to location</button>
      </form>
    </div>
  );
};

export default CategoryPage;
