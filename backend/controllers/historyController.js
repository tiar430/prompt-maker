import { z } from 'zod';
import { historyService } from '../services/historyService.js';
import { indexingService } from '../services/indexingService.js';

export const listHistory = async (req, res) => {
  try {
    const { provider, q, dateFrom, dateTo, limit } = req.query;
    const items = await historyService.list({
      provider,
      q,
      dateFrom,
      dateTo,
      limit: limit ? Number(limit) : 200,
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing history:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to list history' });
  }
};

const addSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  userInput: z.string().min(1),
  generatedPrompt: z.string().min(1),
  generationMs: z.number().int().nonnegative().nullable().optional(),
  success: z.boolean().optional().default(true),
});

export const addHistory = async (req, res) => {
  try {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const item = await historyService.add(parsed.data);

    // auto-index embedding (best-effort)
    await indexingService.indexText({
      sourceType: 'history',
      sourceId: item.id,
      text: `${item.provider} ${item.model}\n\nUser input:\n${item.userInput}\n\nGenerated prompt:\n${item.generatedPrompt}`,
    }).catch(() => {});

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error adding history:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add history' });
  }
};

export const deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    await historyService.remove(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting history:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete history' });
  }
};

export const clearHistory = async (req, res) => {
  try {
    await historyService.clear();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to clear history' });
  }
};
