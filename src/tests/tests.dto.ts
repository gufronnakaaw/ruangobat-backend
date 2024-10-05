export type StartTestQuestion = {
  question_id: string;
  text: string;
  url?: string;
  type?: 'text' | 'video' | 'image';
  options: {
    text: string;
    option_id: string;
  }[];
};
