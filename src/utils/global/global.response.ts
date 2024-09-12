export type SuccessResponse = {
  success: boolean;
  status_code: number;
  message?: string;
  data?: unknown;
};

export type ErrorResponse = {
  success: boolean;
  status_code: number;
  error: {
    name: string;
    message: string;
    errors?: unknown;
  };
};

export type GlobalResponse<T> = {
  success: boolean;
  status_code: number;
  data: T;
};
