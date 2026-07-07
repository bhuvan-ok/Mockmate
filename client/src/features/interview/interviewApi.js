import { axiosInstance } from '../../api/axios.js';

export const listInterviewSets = async () => {
  const { data } = await axiosInstance.get('/interview-sets');
  return data.data;
};

export const startAttempt = async (interviewSetId) => {
  const { data } = await axiosInstance.post('/attempts', { interviewSetId });
  return data.data;
};

export const listMyAttempts = async () => {
  const { data } = await axiosInstance.get('/attempts', { params: { limit: 10 } });
  return data.data;
};

export const getAttemptState = async (attemptId) => {
  const { data } = await axiosInstance.get(`/attempts/${attemptId}`);
  return data.data;
};

export const submitMcqAnswer = async (attemptId, selectedOptionIndex) => {
  const { data } = await axiosInstance.post(`/attempts/${attemptId}/mcq-answer`, {
    selectedOptionIndex,
  });
  return data.data;
};

export const endAttempt = async (attemptId) => {
  const { data } = await axiosInstance.post(`/attempts/${attemptId}/end`);
  return data.data;
};

export const logIntegrityEvent = async (attemptId, type) => {
  const { data } = await axiosInstance.post(`/attempts/${attemptId}/integrity-event`, { type });
  return data.data;
};

export const getAttemptReport = async (attemptId) => {
  const { data } = await axiosInstance.get(`/attempts/${attemptId}/report`);
  return data.data;
};
