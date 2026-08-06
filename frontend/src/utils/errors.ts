import axios from 'axios';

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.response?.statusText ??
      error.message;

    return message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
