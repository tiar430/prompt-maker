import { z } from 'zod';
import { templateService } from '../services/templateService.js';
import { indexingService } from '../services/indexingService.js';

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
  prompt: z.string().min(1),
  isPublic: z.boolean().optional().default(false),
});

const rateSchema = z.object({
  templateId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});

export const listTemplates = async (req, res) => {
  try {
    const { category, q } = req.query;
    const items = await templateService.list({ category, q });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to list templates' });
  }
};

export const upsertTemplate = async (req, res) => {
  try {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const item = await templateService.upsert(parsed.data);

    // auto-index embedding (best-effort)
    await indexingService.indexText({
      sourceType: 'template',
      sourceId: item.id,
      text: `${item.name}\n${item.category}\n${(item.tags || []).join(', ')}\n\n${item.prompt}`,
    }).catch(() => {});

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error upserting template:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to save template' });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await templateService.remove(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete template' });
  }
};

export const rateTemplate = async (req, res) => {
  try {
    const parsed = rateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const item = await templateService.rate(parsed.data);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error rating template:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to rate template' });
  }
};
