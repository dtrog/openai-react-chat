/// THIS SHOULD BE CONFIGURABLE IN A JSON FILE WHERE THERE BASE_URLS/ENDPOINTS CAN BE CONFIGURED
/// DISABLED, ENABLED, API_KEYS MIGHT BE ADDED. As well as new provides and aimodels as they become availeble or of intereset to the user.
/// BUT AT FIRST LAUNCH OPENAI SHOULD BE USED AS DEFAULT, which can be changed later.
export const GROK_ENDPOINT = 'https://api.x.ai';
export const GEMINI_ENDPOINT  = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1';
export const DEEPSEARCH_ENDPOINT = 'https://api.deepsearch.com/v1';
export const DEEPCHAT_ENDPOINT = 'https://api.deepchat.com';
export const OPENAI_ENDPOINT = 'https://api.openai.com';
export const CHOSEN_ENDPOINT = `${OPENAI_ENDPOINT}`;
export const MODELS_ENDPOINT = `${CHOSEN_ENDPOINT}/v1/models`;
export const TTS_ENDPOINT = `${CHOSEN_ENDPOINT}/v1/audio/speech`;
export const CHAT_COMPLETIONS_ENDPOINT = `${CHOSEN_ENDPOINT}/v1/chat/completions`;
