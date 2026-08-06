const express = require('express');
const { body, param } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { generateId, now, parseJson, serializeJson, toBoolean } = require('../utils/helpers');

const router = express.Router();

function getCategoryById(categoryId) {
  const db = getDb();
  const category = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(categoryId);
  if (!category) {
    return null;
  }

  const questions = db
    .prepare('SELECT * FROM category_questions WHERE category_id = ? ORDER BY sort_order, question_text')
    .all(categoryId)
    .map((question) => ({
      ...question,
      options: parseJson(question.options, []),
      is_required: toBoolean(question.is_required)
    }));

  return {
    ...category,
    is_active: toBoolean(category.is_active),
    questions
  };
}

function replaceCategoryQuestions(categoryId, questions = []) {
  const db = getDb();
  db.prepare('DELETE FROM category_questions WHERE category_id = ?').run(categoryId);
  const insertQuestion = db.prepare(
    `
      INSERT INTO category_questions (id, category_id, question_text, question_type, options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  );

  questions.forEach((question, index) => {
    insertQuestion.run(
      generateId(),
      categoryId,
      question.question_text,
      question.question_type,
      serializeJson(question.options || []),
      question.is_required ? 1 : 0,
      question.sort_order ?? index + 1
    );
  });
}

router.get('/', (_req, res) => {
  const db = getDb();
  const categories = db
    .prepare(
      `
        SELECT sc.*, COUNT(cq.id) AS question_count
        FROM service_categories sc
        LEFT JOIN category_questions cq ON cq.category_id = sc.id
        WHERE sc.is_active = 1
        GROUP BY sc.id
        ORDER BY sc.sort_order, sc.name
      `
    )
    .all()
    .map((category) => ({ ...category, is_active: toBoolean(category.is_active) }));

  return res.json({ categories });
});

router.get(
  '/:id',
  validate([param('id').notEmpty().withMessage('Category id is required.')]),
  (req, res) => {
    const category = getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    return res.json({ category });
  }
);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate([
    body('name').trim().notEmpty().withMessage('Category name is required.'),
    body('slug').trim().notEmpty().withMessage('Slug is required.'),
    body('description').optional().trim(),
    body('icon').optional().trim(),
    body('parent_id').optional({ nullable: true }).trim(),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order must be a non-negative integer.'),
    body('questions').optional().isArray().withMessage('questions must be an array.')
  ]),
  (req, res) => {
    const db = getDb();
    const categoryId = generateId();
    const timestamp = now();

    try {
      db.transaction(() => {
        db.prepare(
          `
            INSERT INTO service_categories (id, name, slug, description, icon, is_active, parent_id, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          categoryId,
          req.body.name,
          req.body.slug,
          req.body.description || null,
          req.body.icon || null,
          req.body.is_active === false ? 0 : 1,
          req.body.parent_id || null,
          req.body.sort_order ?? 0,
          timestamp
        );

        if (Array.isArray(req.body.questions)) {
          replaceCategoryQuestions(categoryId, req.body.questions);
        }
      })();
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        return res.status(409).json({ message: 'Category slug must be unique.' });
      }
      throw error;
    }

    return res.status(201).json({ category: getCategoryById(categoryId) });
  }
);

router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate([
    param('id').notEmpty().withMessage('Category id is required.'),
    body('name').optional().trim().notEmpty().withMessage('name cannot be empty.'),
    body('slug').optional().trim().notEmpty().withMessage('slug cannot be empty.'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order must be a non-negative integer.'),
    body('questions').optional().isArray().withMessage('questions must be an array.')
  ]),
  (req, res) => {
    const db = getDb();
    const current = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(req.params.id);
    if (!current) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    try {
      db.transaction(() => {
        db.prepare(
          `
            UPDATE service_categories
            SET name = ?, slug = ?, description = ?, icon = ?, is_active = ?, parent_id = ?, sort_order = ?
            WHERE id = ?
          `
        ).run(
          req.body.name || current.name,
          req.body.slug || current.slug,
          req.body.description !== undefined ? req.body.description : current.description,
          req.body.icon !== undefined ? req.body.icon : current.icon,
          req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : current.is_active,
          req.body.parent_id !== undefined ? req.body.parent_id : current.parent_id,
          req.body.sort_order ?? current.sort_order,
          req.params.id
        );

        if (Array.isArray(req.body.questions)) {
          replaceCategoryQuestions(req.params.id, req.body.questions);
        }
      })();
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        return res.status(409).json({ message: 'Category slug must be unique.' });
      }
      throw error;
    }

    return res.json({ category: getCategoryById(req.params.id) });
  }
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate([param('id').notEmpty().withMessage('Category id is required.')]),
  (req, res) => {
    const db = getDb();
    const result = db.prepare('UPDATE service_categories SET is_active = 0 WHERE id = ?').run(req.params.id);
    if (!result.changes) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    return res.status(204).send();
  }
);

module.exports = router;
