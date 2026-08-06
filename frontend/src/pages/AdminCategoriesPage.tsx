import { FormEvent, useState } from 'react';
import { adminApi } from '../api/admin';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';
import { CategoryQuestion, ServiceCategory } from '../types';

const blankCategory: Partial<ServiceCategory> = {
  name: '',
  slug: '',
  description: '',
  icon: 'briefcase',
  basePrice: 0,
  questions: [],
};

const createQuestion = (): CategoryQuestion => ({
  id: window.crypto?.randomUUID?.() ?? `${Date.now()}`,
  label: '',
  type: 'text',
  required: false,
  options: [],
});

const AdminCategoriesPage = () => {
  const { data: categories, loading, error, reload } = useAsyncData(() => adminApi.getCategories(), []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<ServiceCategory>>(blankCategory);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openEditor = (category?: ServiceCategory) => {
    setEditingId(category?.id || null);
    setDraft(category ? { ...category } : blankCategory);
    setOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingId) {
      await adminApi.updateCategory(editingId, draft);
    } else {
      await adminApi.createCategory(draft);
    }
    setOpen(false);
    setDraft(blankCategory);
    await reload();
  };

  if (loading) return <LoadingSpinner label="Loading categories…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="row-between wrap">
        <div>
          <h2>Service categories</h2>
          <p className="muted-text">Manage the catalog and booking questions shown to customers.</p>
        </div>
        <button className="button primary" type="button" onClick={() => openEditor()}>
          Add category
        </button>
      </section>
      {error ? <div className="banner error">{error}</div> : null}
      <div className="stack-md">
        {(categories || []).map((category) => (
          <section key={category.id} className="card stack-sm">
            <div className="row-between wrap">
              <div>
                <h3>{category.name}</h3>
                <p className="muted-text">{category.description}</p>
              </div>
              <div className="row gap-sm wrap">
                <button className="button secondary" type="button" onClick={() => openEditor(category)}>Edit</button>
                <button className="button ghost" type="button" onClick={async () => { await adminApi.deleteCategory(category.id); await reload(); }}>Delete</button>
              </div>
            </div>
            <div className="chip-row">
              {category.questions.map((question) => <span key={question.id} className="chip">{question.label}</span>)}
            </div>
          </section>
        ))}
      </div>

      <Modal title={editingId ? 'Edit category' : 'Add category'} open={open} onClose={() => setOpen(false)}>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field"><span>Name</span><input value={draft.name || ''} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label className="field"><span>Slug</span><input value={draft.slug || ''} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} required /></label>
          <label className="field"><span>Description</span><textarea value={draft.description || ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="form-grid two-cols">
            <label className="field"><span>Icon</span><input value={draft.icon || ''} onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))} /></label>
            <label className="field"><span>Base price</span><input type="number" value={draft.basePrice || 0} onChange={(event) => setDraft((current) => ({ ...current, basePrice: Number(event.target.value) }))} /></label>
          </div>
          <div className="stack-sm">
            <div className="row-between wrap">
              <h4>Questions</h4>
              <button className="button ghost" type="button" onClick={() => setDraft((current) => ({ ...current, questions: [...(current.questions || []), createQuestion()] }))}>
                Add question
              </button>
            </div>
            {(draft.questions || []).map((question, index) => (
              <div key={question.id} className="card nested-card stack-sm">
                <label className="field"><span>Question label</span><input value={question.label} onChange={(event) => setDraft((current) => ({
                  ...current,
                  questions: (current.questions || []).map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item),
                }))} /></label>
                <div className="form-grid two-cols">
                  <label className="field"><span>Type</span><select value={question.type} onChange={(event) => setDraft((current) => ({
                    ...current,
                    questions: (current.questions || []).map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as CategoryQuestion['type'] } : item),
                  }))}><option value="text">Text</option><option value="textarea">Textarea</option><option value="select">Select</option><option value="number">Number</option><option value="boolean">Boolean</option></select></label>
                  <label className="checkbox-row align-end"><input type="checkbox" checked={Boolean(question.required)} onChange={(event) => setDraft((current) => ({
                    ...current,
                    questions: (current.questions || []).map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item),
                  }))} /><span>Required</span></label>
                </div>
                <label className="field"><span>Options (comma-separated)</span><input value={question.options?.join(', ') || ''} onChange={(event) => setDraft((current) => ({
                  ...current,
                  questions: (current.questions || []).map((item, itemIndex) => itemIndex === index ? { ...item, options: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) } : item),
                }))} /></label>
              </div>
            ))}
          </div>
          <button className="button primary" type="submit">Save category</button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCategoriesPage;
