export const PROVIDER_DOMAINS = {
  'openai':     'openai.com',
  'anthropic':  'anthropic.com',
  'google':     'gemini.google.com',
  'x-ai':       'x.ai',
  'z-ai':       'zhipuai.cn',
  'moonshotai': 'moonshot.cn',
  'minimax':    'minimaxi.com',
  'deepseek':   'deepseek.com',
  'qwen':       'qwen.ai',
}

export function logoUrl(model) {
  const provider = model.split('/')[0]
  const domain = PROVIDER_DOMAINS[provider]
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null
}

export function formatModel(model) {
  return model.replace(/-(\d{8}|\d{4}-\d{2}-\d{2})$/, '')
}
