const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1';

export const MiniMax = {
  chat: {
    completions: {
      create: async (options: {
        model: string;
        messages: { role: string; content: string }[];
      }) => {
        const response = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MINIMAX_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
          }),
        });
        return response.json();
      },
    },
  },
};
