// controllers/categoryController.js
const supabase = require('../config/db');
const slugify  = require('slugify');

exports.getCategories = async (_req, res, next) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ categories });
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, image_url } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const { data, error } = await supabase
      .from('categories')
      .insert({ name, slug, description, image_url })
      .select('id, slug')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, image_url } = req.body;
    const updates = {};

    if (name        !== undefined) { updates.name = name; updates.slug = slugify(name, { lower: true, strict: true }); }
    if (description !== undefined) updates.description = description;
    if (image_url   !== undefined) updates.image_url   = image_url;

    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Category updated' });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
};